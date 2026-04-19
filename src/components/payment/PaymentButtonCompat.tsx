'use client'

import { useState } from 'react'
import * as PortOne from '@portone/browser-sdk/v2'
import { v4 as uuidv4 } from 'uuid'

interface CompatHanja {
  pos: number
  character: string
  reading: string
  meaning: string
}

interface Props {
  myName: string
  myBirth: string
  myGender: string
  myHanja: CompatHanja[]
  partnerName: string
  partnerBirth: string
  partnerGender: string
  partnerHanja: CompatHanja[]
  relationType: string
}

export function PaymentButtonCompat({
  myName, myBirth, myGender, myHanja,
  partnerName, partnerBirth, partnerGender, partnerHanja,
  relationType,
}: Props) {
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    if (!myName.trim() || !partnerName.trim()) return
    setLoading(true)

    try {
      const paymentId = `compat_${uuidv4()}`
      const myHanjaEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(myHanja))))
      const partnerHanjaEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(partnerHanja))))

      const redirectUrl = [
        `${window.location.origin}/compat/payment/success`,
        `?paymentId=${encodeURIComponent(paymentId)}`,
        `&myName=${encodeURIComponent(myName)}`,
        `&myBirth=${encodeURIComponent(myBirth)}`,
        `&myGender=${encodeURIComponent(myGender)}`,
        `&myHanja=${encodeURIComponent(myHanjaEncoded)}`,
        `&partnerName=${encodeURIComponent(partnerName)}`,
        `&partnerBirth=${encodeURIComponent(partnerBirth)}`,
        `&partnerGender=${encodeURIComponent(partnerGender)}`,
        `&partnerHanja=${encodeURIComponent(partnerHanjaEncoded)}`,
        `&relationType=${encodeURIComponent(relationType)}`,
      ].join('')

      const response = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: `${myName} ♥ ${partnerName} 궁합 풀이`,
        totalAmount: 1490,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        redirectUrl,
      } as any)

      if (response?.code) {
        if (response.code !== 'FAILURE_TYPE_PG') {
          console.error('[PortOne] compat error:', response)
          alert(`결제 오류: ${response.message ?? response.code}`)
        }
      }
    } catch (err: any) {
      console.error('[PortOne] compat error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading || !myName.trim() || !partnerName.trim()}
      className="w-full py-5 rounded-full text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      style={{
        background: 'linear-gradient(to right, #D95D39, #F28C6A)',
        boxShadow: '0 12px 40px rgba(217,93,57,0.45)',
      }}
    >
      {loading
        ? '결제창 열기…'
        : `✦ ${myName} ♥ ${partnerName} 궁합 풀이 · 1,490원 ✦`}
    </button>
  )
}
