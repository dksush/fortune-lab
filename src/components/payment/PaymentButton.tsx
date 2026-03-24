'use client'

import { useState } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'
import { v4 as uuidv4 } from 'uuid'
import { Hanja } from '@/types'

interface Props {
  inputName: string
  selectedHanja: (Hanja | null)[]
}

export function PaymentButton({ inputName, selectedHanja }: Props) {
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
        successUrl: `${window.location.origin}/payment/success?inputName=${encodeURIComponent(inputName)}&hanjaIds=${selectedHanja.filter(Boolean).map(h => h!.id).join(',')}`,
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
      className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-purple-950 font-bold text-lg rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
    >
      {loading ? '결제창 열기...' : '990원으로 풀이 받기'}
    </button>
  )
}
