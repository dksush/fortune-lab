import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { createServiceClient } from '@/lib/supabase/server'
import { generateFortune } from '@/lib/fortune'

const AMOUNT = 990

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { paymentId, inputName, hanjaIds, readingRaw, extraHanja = [], allSelectedHanja = [], birthDate = '', gender = 'male' } = body

  const supabase = createServiceClient()

  // 중복 확인 (중복 과금 방지)
  const { data: existing } = await supabase
    .from('fortunes')
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

  // 결제 상태 및 금액 검증
  if (payment.status !== 'PAID') {
    return NextResponse.json({ error: '결제가 완료되지 않았습니다' }, { status: 400 })
  }
  if (payment.amount?.total !== AMOUNT) {
    return NextResponse.json({ error: '결제 금액이 올바르지 않습니다' }, { status: 400 })
  }

  // fortune 레코드 생성 (pending)
  const { data: fortune, error: insertError } = await supabase
    .from('fortunes')
    .insert({
      input_name: inputName,
      hanja_ids: hanjaIds ?? [],
      reading_raw: readingRaw ?? '',
      extra_hanja: allSelectedHanja,
      birth_date: birthDate,
      gender,
      status: 'pending',
      payment_key: paymentId,
      order_id: paymentId,
      paid_at: new Date().toISOString(),
      short_id: nanoid(8),
    })
    .select('id, short_id')
    .single()

  if (insertError || !fortune) {
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }

  // Claude API로 풀이 생성
  try {
    const result = await generateFortune({ inputName, hanjaIds, readingRaw, supabase, extraHanja, birthDate, gender })
    await supabase
      .from('fortunes')
      .update({ result, status: 'completed' })
      .eq('id', fortune.id)

    return NextResponse.json({ uuid: fortune.short_id ?? fortune.id })
  } catch {
    await supabase
      .from('fortunes')
      .update({ status: 'failed' })
      .eq('id', fortune.id)

    return NextResponse.json({ uuid: fortune.short_id ?? fortune.id, status: 'failed' }, { status: 200 })
  }
}
