'use client'

import { useState } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { v4 as uuidv4 } from 'uuid'

interface ExtraHanja {
  character: string
  reading: string
  meaning: string
}

interface Props {
  inputName: string
  hanjaIds: string[]
  extraHanja: ExtraHanja[]
  birthDate?: string
  gender?: string
}

export function PaymentButtonPreview({ inputName, hanjaIds, extraHanja, birthDate = '', gender = 'male' }: Props) {
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    if (!inputName.trim()) return
    setLoading(true)

    try {
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
      const orderId = `fortune_${uuidv4()}`
      const payment = toss.payment({ customerKey: 'ANONYMOUS' })

      const extraEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(extraHanja))))
      const successUrl = [
        `${window.location.origin}/payment/success`,
        `?inputName=${encodeURIComponent(inputName)}`,
        `&hanjaIds=${hanjaIds.join(',')}`,
        `&birthDate=${encodeURIComponent(birthDate)}`,
        `&extra=${encodeURIComponent(extraEncoded)}`,
        `&gender=${encodeURIComponent(gender)}`,
      ].join('')

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: 990 },
        orderId,
        orderName: `${inputName} 이름 풀이`,
        successUrl,
        failUrl: `${window.location.origin}/payment/fail`,
        card: { useEscrow: false },
      })
    } catch (err: any) {
      if (err.code !== 'USER_CANCEL') {
        console.error('[Toss] error:', err)
        alert(`결제 오류: ${err.message ?? err.code ?? JSON.stringify(err)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading || !inputName.trim()}
      className="w-full py-5 rounded-full text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      style={{
        background: 'linear-gradient(to right, #D95D39, #F28C6A)',
        boxShadow: '0 12px 40px rgba(217,93,57,0.45)',
      }}
    >
      {loading ? '결제창 열기…' : '✦ 전체 해석 열람하기 · 990원 ✦'}
    </button>
  )
}
