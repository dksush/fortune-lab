'use client'

import { useState } from 'react'
import * as PortOne from '@portone/browser-sdk/v2'
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
      const paymentId = `fortune_${uuidv4()}`
      const redirectUrl = [
        `${window.location.origin}/payment/success`,
        `?paymentId=${encodeURIComponent(paymentId)}`,
        `&inputName=${encodeURIComponent(inputName)}`,
        `&hanjaIds=${selectedHanja.filter(Boolean).map(h => h!.id).join(',')}`,
        `&birthDate=${encodeURIComponent(birthDate)}`,
      ].join('')

      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: `${inputName} 이름 풀이`,
        totalAmount: 990,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        redirectUrl,
      } as any)

      // 리다이렉트 없이 응답이 바로 오는 경우 (팝업 방식)
      if (response?.code) {
        if (response.code !== 'FAILURE_TYPE_PG') {
          alert('결제 중 오류가 발생했습니다. 다시 시도해주세요.')
        }
      }
    } catch (err: any) {
      console.error('[PortOne] error:', err)
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
