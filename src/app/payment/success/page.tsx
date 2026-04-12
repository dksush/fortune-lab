'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const LOADING_STEPS = [
  '결제를 확인하고 있습니다',
  '이름의 한자 기운을 풀이하고 있습니다',
  '사주와 오행의 흐름을 계산하고 있습니다',
  '이름과 사주의 조화를 분석하고 있습니다',
  '풀이를 완성하고 있습니다',
]

function LoadingSpinner({ name }: { name: string }) {
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx(prev => (prev + 1) % LOADING_STEPS.length)
    }, 2800)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="text-center space-y-8">
      {/* 회전 장식 */}
      <div className="relative w-20 h-20 mx-auto">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #D95D39, #F28C6A)',
            animation: 'spin 3s linear infinite',
            opacity: 0.15,
          }}
        />
        <div
          className="absolute inset-2 rounded-full flex items-center justify-center text-3xl font-bold font-serif"
          style={{ background: '#FCF9F7', color: '#D95D39' }}
        >
          ✦
        </div>
        {/* 회전 테두리 */}
        <svg className="absolute inset-0 w-full h-full" style={{ animation: 'spin 2.5s linear infinite' }}>
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke="url(#grad)"
            strokeWidth="2"
            strokeDasharray="60 165"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D95D39" />
              <stop offset="100%" stopColor="#F28C6A" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 이름 */}
      {name && (
        <p className="font-serif text-2xl font-bold text-[#2D2926]">{name}</p>
      )}

      {/* 단계별 메시지 */}
      <div className="space-y-1 min-h-[48px]">
        <p
          className="text-sm text-[#6D6661] transition-all duration-700"
          key={stepIdx}
        >
          {LOADING_STEPS[stepIdx]}…
        </p>
        {/* 점 인디케이터 */}
        <div className="flex justify-center gap-1.5 mt-3">
          {LOADING_STEPS.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all duration-500"
              style={{
                background: i === stepIdx ? '#D95D39' : 'rgba(109,102,97,0.2)',
                transform: i === stepIdx ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-[#6D6661] opacity-60">
        AI 분석 중입니다. 잠시만 기다려 주세요
      </p>
    </div>
  )
}

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'confirming' | 'failed'>('confirming')
  const [uuid, setUuid] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const inputName = params.get('inputName') ?? ''

  useEffect(() => {
    const paymentKey = params.get('paymentKey')
    const orderId = params.get('orderId')
    const amount = params.get('amount')
    const hanjaIds = params.get('hanjaIds')?.split(',').filter(Boolean) ?? []
    const birthDate = params.get('birthDate') ?? ''
    const extraEncoded = params.get('extra') ?? ''
    const gender = params.get('gender') ?? 'male'
    let extraHanja: { character: string; reading: string; meaning: string }[] = []
    try {
      if (extraEncoded) extraHanja = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(extraEncoded)))))
    } catch { /* ignore */ }

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
        extraHanja,
        gender,
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
  }, [params, router, inputName])

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
    return <LoadingSpinner name={inputName} />
  }

  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl"
        style={{ background: 'rgba(217,93,57,0.1)' }}>
        ⚠️
      </div>
      <div className="space-y-2">
        <p className="font-serif text-lg font-bold text-[#2D2926]">풀이 생성 중 오류가 발생했습니다</p>
        <p className="text-sm text-[#6D6661] leading-relaxed">
          결제는 완료되었습니다.<br />아래 버튼으로 다시 시도해주세요.
        </p>
      </div>
      <button
        onClick={handleRetry}
        disabled={retrying}
        data-testid="retry-button"
        className="w-full py-5 rounded-full text-white font-bold text-base active:scale-95 transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(to right, #D95D39, #F28C6A)',
          boxShadow: '0 12px 40px rgba(217,93,57,0.35)',
        }}
      >
        {retrying ? '생성 중…' : '다시 시도하기'}
      </button>
      <p className="text-xs text-[#6D6661]">
        3회 이상 실패 시 고객센터로 문의해주세요
      </p>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <main className="ethereal-gradient min-h-screen flex items-center justify-center px-6 relative">
      {/* 배경 장식 블러 */}
      <div className="fixed top-[-10%] right-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(120px)' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(93,115,157,0.08)', filter: 'blur(120px)' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel rounded-3xl p-8 shadow-sm">
          <Suspense fallback={
            <div className="text-center text-[#6D6661] py-8">
              <div className="text-3xl mb-4" style={{ color: '#D95D39' }}>✦</div>
              <p className="text-sm">로딩 중…</p>
            </div>
          }>
            <SuccessContent />
          </Suspense>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
