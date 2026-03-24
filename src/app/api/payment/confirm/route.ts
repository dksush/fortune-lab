import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateFortune } from '@/lib/fortune'

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm'
const AMOUNT = 990

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { paymentKey, orderId, amount, inputName, hanjaIds, readingRaw } = body

  if (amount !== AMOUNT) {
    return NextResponse.json({ error: '결제 금액이 올바르지 않습니다' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 중복 확인 (AC-07 중복 과금 방지)
  const { data: existing } = await supabase
    .from('fortunes')
    .select('id, status')
    .eq('order_id', orderId)
    .single()

  if (existing) {
    if (existing.status === 'completed') {
      return NextResponse.json({ uuid: existing.id }, { status: 200 })
    }
    if (existing.status === 'pending' || existing.status === 'failed') {
      return NextResponse.json({ uuid: existing.id, status: existing.status }, { status: 200 })
    }
  }

  // 토스페이먼츠 서버 검증
  const secretKey = process.env.TOSS_SECRET_KEY!
  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`

  const tossRes = await fetch(TOSS_CONFIRM_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      'Idempotency-Key': orderId,
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  if (!tossRes.ok) {
    const err = await tossRes.json()
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  // fortune 레코드 생성 (pending)
  const { data: fortune, error: insertError } = await supabase
    .from('fortunes')
    .insert({
      input_name: inputName,
      hanja_ids: hanjaIds ?? [],
      reading_raw: readingRaw ?? '',
      status: 'pending',
      payment_key: paymentKey,
      order_id: orderId,
      paid_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !fortune) {
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }

  // Claude API로 풀이 생성
  try {
    const result = await generateFortune({ inputName, hanjaIds, readingRaw, supabase })
    await supabase
      .from('fortunes')
      .update({ result, status: 'completed' })
      .eq('id', fortune.id)

    return NextResponse.json({ uuid: fortune.id })
  } catch {
    await supabase
      .from('fortunes')
      .update({ status: 'failed' })
      .eq('id', fortune.id)

    return NextResponse.json({ uuid: fortune.id, status: 'failed' }, { status: 200 })
  }
}
