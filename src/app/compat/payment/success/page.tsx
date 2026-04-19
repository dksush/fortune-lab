'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const LOADING_STEPS = [
  '결제를 확인하고 있습니다',
  '두 사람의 이름 한자를 풀이하고 있습니다',
  '오행의 상생·상극 흐름을 분석하고 있습니다',
  '이름이 서로에게 미치는 영향을 읽고 있습니다',
  '두 사람의 궁합을 완성하고 있습니다',
]

function LoadingSpinner({ myName, partnerName }: { myName: string; partnerName: string }) {
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx(prev => (prev + 1) % LOADING_STEPS.length)
    }, 2800)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="text-center space-y-8">
      {myName && partnerName && (
        <div className="space-y-1">
          <p className="text-xs tracking-[0.25em] uppercase text-[#6D6661]">궁합 분석 중</p>
          <p className="font-serif text-2xl font-bold text-[#2D2926]">
            {myName} <span style={{ color: '#D95D39' }}>♥</span> {partnerName}
          </p>
        </div>
      )}

      <div className="relative w-24 h-24 mx-auto">
        <svg className="absolute inset-0 w-full h-full" style={{ animation: 'spin 4s linear infinite' }}>
          <circle cx="48" cy="48" r="44" fill="none" stroke="url(#compat-grad1)"
            strokeWidth="1.5" strokeDasharray="80 196" strokeLinecap="round" />
          <defs>
            <linearGradient id="compat-grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D95D39" />
              <stop offset="100%" stopColor="#F28C6A" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <svg className="absolute inset-0 w-full h-full" style={{ animation: 'spin 6s linear infinite reverse' }}>
          <circle cx="48" cy="48" r="36" fill="none" stroke="rgba(93,115,157,0.3)"
            strokeWidth="1" strokeDasharray="40 186" strokeLinecap="round" />
        </svg>
        <div
          className="absolute inset-0 m-auto w-14 h-14 rounded-full flex items-center justify-center font-bold"
          style={{
            background: 'linear-gradient(135deg, #FCF9F7, #F5EFE8)',
            color: '#D95D39',
            fontSize: '1.4rem',
            boxShadow: '0 4px 20px rgba(217,93,57,0.2)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        >
          ♥
        </div>
      </div>

      <div className="space-y-4 min-h-[64px]">
        <p className="text-sm text-[#6D6661] leading-relaxed" key={stepIdx}
          style={{ animation: 'fade-step 0.6s ease-out' }}>
          {LOADING_STEPS[stepIdx]}…
        </p>
        <div className="w-48 mx-auto rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(0,0,0,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${((stepIdx + 1) / LOADING_STEPS.length) * 100}%`,
              background: 'linear-gradient(to right, #D95D39, #F28C6A)',
            }}
          />
        </div>
        <div className="flex justify-center gap-1.5">
          {LOADING_STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-500"
              style={{ width: i === stepIdx ? 16 : 6, height: 6, background: i === stepIdx ? '#D95D39' : 'rgba(109,102,97,0.2)' }} />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-[#6D6661] opacity-50 tracking-[0.2em] uppercase">
        AI가 두 사람의 기운을 읽고 있습니다
      </p>
    </div>
  )
}

function CompatSuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'confirming' | 'failed'>('confirming')
  const [uuid, setUuid] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const myName = params.get('myName') ?? ''
  const partnerName = params.get('partnerName') ?? ''

  useEffect(() => {
    const paymentId = params.get('paymentId')
    if (!paymentId) return

    const myHanjaEncoded = params.get('myHanja') ?? ''
    const partnerHanjaEncoded = params.get('partnerHanja') ?? ''

    let myHanja: object[] = []
    let partnerHanja: object[] = []
    try {
      if (myHanjaEncoded) myHanja = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(myHanjaEncoded)))))
      if (partnerHanjaEncoded) partnerHanja = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(partnerHanjaEncoded)))))
    } catch { /* ignore */ }

    fetch('/api/payment/compat-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId,
        myName,
        myBirth: params.get('myBirth') ?? '',
        myGender: params.get('myGender') ?? 'male',
        myHanja,
        partnerName,
        partnerBirth: params.get('partnerBirth') ?? '',
        partnerGender: params.get('partnerGender') ?? 'female',
        partnerHanja,
        relationType: params.get('relationType') ?? 'lover',
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.uuid && data.status !== 'failed') {
          router.replace(`/compat/result/${data.uuid}`)
        } else if (data.uuid) {
          setUuid(data.uuid)
          setStatus('failed')
        }
      })
      .catch(() => setStatus('failed'))
  }, [params, router, myName, partnerName])

  const handleRetry = async () => {
    if (!uuid) return
    setRetrying(true)
    try {
      const res = await fetch('/api/compat/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid }),
      })
      const data = await res.json()
      if (data.uuid) router.replace(`/compat/result/${data.uuid}`)
      else alert(data.error ?? '다시 시도해주세요.')
    } finally {
      setRetrying(false)
    }
  }

  if (status === 'confirming') {
    return <LoadingSpinner myName={myName} partnerName={partnerName} />
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
        className="w-full py-5 rounded-full text-white font-bold text-base active:scale-95 transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(to right, #D95D39, #F28C6A)',
          boxShadow: '0 12px 40px rgba(217,93,57,0.35)',
        }}
      >
        {retrying ? '생성 중…' : '다시 시도하기'}
      </button>
      <p className="text-xs text-[#6D6661]">3회 이상 실패 시 고객센터로 문의해주세요</p>
    </div>
  )
}

export default function CompatPaymentSuccessPage() {
  return (
    <main className="ethereal-gradient min-h-screen flex items-center justify-center px-6 relative">
      <div className="fixed top-[-10%] right-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(120px)' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(93,115,157,0.08)', filter: 'blur(120px)' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel rounded-3xl p-8 shadow-sm">
          <Suspense fallback={
            <div className="text-center text-[#6D6661] py-8">
              <div className="text-3xl mb-4" style={{ color: '#D95D39' }}>♥</div>
              <p className="text-sm">로딩 중…</p>
            </div>
          }>
            <CompatSuccessContent />
          </Suspense>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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
