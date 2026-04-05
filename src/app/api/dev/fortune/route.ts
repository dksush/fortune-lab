// 개발 환경 전용 — 프로덕션에서 자동 비활성화
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateFortune } from '@/lib/fortune'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { inputName, hanjaIds = [], readingRaw = '', extraHanja = [], allSelectedHanja = [], birthDate = '', gender = 'male' } = await req.json()

  if (!inputName?.trim()) {
    return NextResponse.json({ error: 'inputName required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 같은 이름으로 완료된 dev 레코드가 있으면 재사용
  const { data: existing } = await supabase
    .from('fortunes')
    .select('id')
    .eq('input_name', inputName)
    .eq('payment_key', 'dev_bypass')
    .eq('status', 'completed')
    .order('paid_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    return NextResponse.json({ uuid: existing.id, reused: true })
  }

  const { data: fortune, error } = await supabase
    .from('fortunes')
    .insert({
      input_name: inputName,
      hanja_ids: hanjaIds,
      reading_raw: readingRaw || inputName,
      extra_hanja: allSelectedHanja,
      birth_date: birthDate,
      gender,
      status: 'pending',
      payment_key: 'dev_bypass',
      order_id: `dev_${Date.now()}`,
      paid_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !fortune) {
    return NextResponse.json({ error: error?.message ?? '저장 실패' }, { status: 500 })
  }

  try {
    const result = await generateFortune({ inputName, hanjaIds, readingRaw, supabase, extraHanja, birthDate, gender })
    await supabase.from('fortunes').update({ result, status: 'completed' }).eq('id', fortune.id)
    return NextResponse.json({ uuid: fortune.id })
  } catch (e: any) {
    console.error('[dev/fortune] generateFortune error:', e)
    await supabase.from('fortunes').update({ status: 'failed' }).eq('id', fortune.id)
    return NextResponse.json({ error: e.message, uuid: fortune.id }, { status: 500 })
  }
}
