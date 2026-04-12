import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateFortune } from '@/lib/fortune'

export async function POST(req: NextRequest) {
  const { uuid } = await req.json()

  const supabase = createServiceClient()
  const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)
  const { data: fortune } = await (isUuidFormat
    ? supabase.from('fortunes').select('*').eq('id', uuid).single()
    : supabase.from('fortunes').select('*').eq('short_id', uuid).single())

  if (!fortune) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (fortune.status === 'completed') return NextResponse.json({ uuid: fortune.short_id ?? fortune.id })
  if (fortune.retry_count >= 3) {
    return NextResponse.json({ error: '최대 재시도 횟수를 초과했습니다. 고객센터에 문의해주세요.' }, { status: 400 })
  }

  await supabase.from('fortunes').update({ retry_count: fortune.retry_count + 1 }).eq('id', fortune.id)

  try {
    const result = await generateFortune({
      inputName: fortune.input_name,
      hanjaIds: fortune.hanja_ids,
      readingRaw: fortune.reading_raw,
      supabase,
    })
    await supabase.from('fortunes').update({ result, status: 'completed' }).eq('id', fortune.id)
    return NextResponse.json({ uuid: fortune.short_id ?? fortune.id })
  } catch {
    await supabase.from('fortunes').update({ status: 'failed' }).eq('id', fortune.id)
    return NextResponse.json({ status: 'failed' }, { status: 500 })
  }
}
