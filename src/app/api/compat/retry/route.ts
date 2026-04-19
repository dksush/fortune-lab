import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateCompatFortune } from '@/lib/compat-fortune'

export async function POST(req: NextRequest) {
  const { uuid } = await req.json()

  const supabase = createServiceClient()
  const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)
  const { data: record } = await (isUuidFormat
    ? supabase.from('compat_fortunes').select('*').eq('id', uuid).single()
    : supabase.from('compat_fortunes').select('*').eq('short_id', uuid).single())

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (record.status === 'completed') return NextResponse.json({ uuid: record.short_id ?? record.id })

  try {
    const result = await generateCompatFortune({
      myName: record.my_name,
      myHanja: record.my_hanja ?? [],
      myBirth: record.my_birth ?? '',
      myGender: record.my_gender ?? 'male',
      partnerName: record.partner_name,
      partnerHanja: record.partner_hanja ?? [],
      partnerBirth: record.partner_birth ?? '',
      partnerGender: record.partner_gender ?? 'female',
      relationType: record.relation_type ?? 'lover',
    })

    await supabase
      .from('compat_fortunes')
      .update({ result, status: 'completed' })
      .eq('id', record.id)

    return NextResponse.json({ uuid: record.short_id ?? record.id })
  } catch {
    await supabase
      .from('compat_fortunes')
      .update({ status: 'failed' })
      .eq('id', record.id)

    return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  }
}
