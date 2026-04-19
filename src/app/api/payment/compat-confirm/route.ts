import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { createServiceClient } from '@/lib/supabase/server'
import { generateCompatFortune } from '@/lib/compat-fortune'

const AMOUNT = 1490

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    paymentId,
    myName, myBirth, myGender, myHanja = [],
    partnerName, partnerBirth, partnerGender, partnerHanja = [],
    relationType = 'lover',
  } = body

  const supabase = createServiceClient()

  // 중복 확인 (중복 과금 방지)
  const { data: existing } = await supabase
    .from('compat_fortunes')
    .select('id, short_id, status')
    .eq('order_id', paymentId)
    .single()

  if (existing) {
    if (existing.status === 'completed') {
      return NextResponse.json({ uuid: existing.short_id ?? existing.id }, { status: 200 })
    }
    if (existing.status === 'pending' || existing.status === 'failed') {
      return NextResponse.json({ uuid: existing.short_id ?? existing.id, status: existing.status }, { status: 200 })
    }
  }

  // 포트원 서버 검증
  const portoneRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` },
  })

  if (!portoneRes.ok) {
    const err = await portoneRes.json()
    return NextResponse.json({ error: err.message ?? '결제 검증 실패' }, { status: 400 })
  }

  const payment = await portoneRes.json()

  if (payment.status !== 'PAID') {
    return NextResponse.json({ error: '결제가 완료되지 않았습니다' }, { status: 400 })
  }
  if (payment.amount?.total !== AMOUNT) {
    return NextResponse.json({ error: '결제 금액이 올바르지 않습니다' }, { status: 400 })
  }

  // compat_fortunes 레코드 생성 (pending)
  const { data: record, error: insertError } = await supabase
    .from('compat_fortunes')
    .insert({
      my_name: myName,
      my_hanja: myHanja,
      my_birth: myBirth,
      my_gender: myGender,
      partner_name: partnerName,
      partner_hanja: partnerHanja,
      partner_birth: partnerBirth,
      partner_gender: partnerGender,
      relation_type: relationType,
      status: 'pending',
      payment_key: paymentId,
      order_id: paymentId,
      paid_at: new Date().toISOString(),
      short_id: nanoid(8),
    })
    .select('id, short_id')
    .single()

  if (insertError || !record) {
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }

  // Claude API로 궁합 풀이 생성
  try {
    const result = await generateCompatFortune({
      myName,
      myHanja,
      myBirth,
      myGender,
      partnerName,
      partnerHanja,
      partnerBirth,
      partnerGender,
      relationType,
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

    return NextResponse.json({ uuid: record.short_id ?? record.id, status: 'failed' }, { status: 200 })
  }
}
