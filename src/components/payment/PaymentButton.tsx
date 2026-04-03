'use client'

import { useState } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { v4 as uuidv4 } from 'uuid'
import { Hanja } from '@/types'

interface Props {
  inputName: string
  selectedHanja: (Hanja | null)[]
  birthDate?: string
}

export function PaymentButton({ inputName, selectedHanja, birthDate = '' }: Props) {
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    if (!inputName.trim()) return
    setLoading(true)

    try {
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
      const orderId = `fortune_${uuidv4()}`
      const payment = toss.payment({ customerKey: 'ANONYMOUS' })

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: 990 },
        orderId,
        orderName: `${inputName} 이름 풀이`,
        successUrl: `${window.location.origin}/payment/success?inputName=${encodeURIComponent(inputName)}&hanjaIds=${selectedHanja.filter(Boolean).map(h => h!.id).join(',')}&birthDate=${encodeURIComponent(birthDate)}`,
        failUrl: `${window.location.origin}/payment/fail`,
        card: { useEscrow: false },
      })
    } catch (err: any) {
      if (err.code !== 'USER_CANCEL') {
        alert('결제 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading || !inputName.trim()}
      className="w-full py-4 bg-[#3D2B1F] hover:bg-[#2C1A0E] text-[#FAF5EA] font-bold text-lg rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed tracking-wide"
    >
      {loading ? '결제창 열기…' : '✦ 운세 보기 · 990원 ✦'}
    </button>
  )
}
