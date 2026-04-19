'use client'

import { useState } from 'react'
import * as PortOne from '@portone/browser-sdk/v2'
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
      const paymentId = `fortune_${uuidv4()}`
      const extraEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(extraHanja))))
      const redirectUrl = [
        `${window.location.origin}/payment/success`,
        `?paymentId=${encodeURIComponent(paymentId)}`,
        `&inputName=${encodeURIComponent(inputName)}`,
        `&hanjaIds=${hanjaIds.join(',')}`,
        `&birthDate=${encodeURIComponent(birthDate)}`,
        `&extra=${encodeURIComponent(extraEncoded)}`,
        `&gender=${encodeURIComponent(gender)}`,
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
          console.error('[PortOne] error:', response)
          alert(`결제 오류: ${response.message ?? response.code}`)
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
      className="w-full py-5 rounded-full text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      style={{
        background: 'linear-gradient(to right, #D95D39, #F28C6A)',
        boxShadow: '0 12px 40px rgba(217,93,57,0.45)',
      }}
    >
      {loading ? '결제창 열기…' : `✦ ${inputName}님의 전체 운세 확인하기 ✦`}
    </button>
  )
}
