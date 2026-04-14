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
      {/* 이름 */}
      {name && (
        <div className="space-y-1">
          <p className="text-xs tracking-[0.25em] uppercase text-[#6D6661]">분석 중</p>
          <p className="font-serif text-2xl font-bold text-[#2D2926]">{name}</p>
        </div>
      )}

      {/* 회전 장식 */}
      <div className="relative w-24 h-24 mx-auto">
        {/* 바깥 회전 링 */}
        <svg className="absolute inset-0 w-full h-full" style={{ animation: 'spin 4s linear infinite' }}>
          <circle
            cx="48" cy="48" r="44"
            fill="none"
            stroke="url(#grad1)"
            strokeWidth="1.5"
            strokeDasharray="80 196"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D95D39" />
              <stop offset="100%" stopColor="#F28C6A" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        {/* 안쪽 반대 방향 링 */}
        <svg className="absolute inset-0 w-full h-full" style={{ animation: 'spin 6s linear infinite reverse' }}>
          <circle
            cx="48" cy="48" r="36"
            fill="none"
            stroke="rgba(93,115,157,0.3)"
            strokeWidth="1"
            strokeDasharray="40 186"
            strokeLinecap="round"
          />
        </svg>
        {/* 중앙 아이콘 */}
        <div
          className="absolute inset-0 m-auto w-14 h-14 rounded-full flex items-center justify-center font-serif font-bold"
          style={{
            background: 'linear-gradient(135deg, #FCF9F7, #F5EFE8)',
            color: '#D95D39',
            fontSize: '1.6rem',
            boxShadow: '0 4px 20px rgba(217,93,57,0.2)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        >
          ✦
        </div>
      </div>

      {/* 단계별 메시지 */}
      <div className="space-y-4 min-h-[64px]">
        <p
          className="text-sm text-[#6D6661] leading-relaxed"
          key={stepIdx}
          style={{ animation: 'fade-step 0.6s ease-out' }}
        >
          {LOADING_STEPS[stepIdx]}…
        </p>
        {/* 프로그레스 바 */}
        <div className="w-48 mx-auto rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(0,0,0,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${((stepIdx + 1) / LOADING_STEPS.length) * 100}%`,
              background: 'linear-gradient(to right, #D95D39, #F28C6A)',
            }}
          />
        </div>
        {/* 점 인디케이터 */}
        <div className="flex justify-center gap-1.5">
          {LOADING_STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === stepIdx ? 16 : 6,
                height: 6,
                background: i === stepIdx ? '#D95D39' : 'rgba(109,102,97,0.2)',
              }}
            />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-[#6D6661] opacity-50 tracking-[0.2em] uppercase">
        AI가 깊이 읽고 있습니다
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
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(217,93,57,0.2); }
          50% { box-shadow: 0 4px 30px rgba(217,93,57,0.45); }
        }
        @keyframes fade-step {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}
