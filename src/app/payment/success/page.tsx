'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'confirming' | 'failed'>('confirming')
  const [uuid, setUuid] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const paymentKey = params.get('paymentKey')
    const orderId = params.get('orderId')
    const amount = params.get('amount')
    const inputName = params.get('inputName')
    const hanjaIds = params.get('hanjaIds')?.split(',').filter(Boolean) ?? []
    const birthDate = params.get('birthDate') ?? ''

    if (!paymentKey || !orderId || !amount) return

    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentKey, orderId,
        amount: Number(amount),
        inputName: inputName ?? '',
        hanjaIds,
        readingRaw: inputName ?? '',
        birthDate,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.uuid && data.status !== 'failed') {
          router.replace(`/result/${data.uuid}`)
        } else if (data.uuid) {
          setUuid(data.uuid)
          setStatus('failed')
        }
      })
      .catch(() => setStatus('failed'))
  }, [params, router])

  const handleRetry = async () => {
    if (!uuid) return
    setRetrying(true)
    try {
      const res = await fetch('/api/fortune/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid }),
      })
      const data = await res.json()
      if (data.uuid) router.replace(`/result/${data.uuid}`)
      else alert(data.error ?? '다시 시도해주세요.')
    } finally {
      setRetrying(false)
    }
  }

  if (status === 'confirming') {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl animate-pulse">✦</div>
        <p className="text-purple-300">결제를 확인하고 풀이를 생성하는 중입니다...</p>
      </div>
    )
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-4xl">⚠️</div>
      <p className="text-white font-semibold">풀이 생성 중 오류가 발생했습니다</p>
      <p className="text-purple-400 text-sm">결제는 완료되었습니다. 아래 버튼으로 다시 시도해주세요.</p>
      <button
        onClick={handleRetry}
        disabled={retrying}
        data-testid="retry-button"
        className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-purple-950 font-bold rounded-2xl transition-colors disabled:opacity-50"
      >
        {retrying ? '생성 중...' : '다시 시도'}
      </button>
      <p className="text-purple-500 text-xs">
        3회 이상 실패 시 고객센터로 문의해주세요
      </p>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="text-center text-purple-300">로딩 중...</div>}>
          <SuccessContent />
        </Suspense>
      </div>
    </main>
  )
}
