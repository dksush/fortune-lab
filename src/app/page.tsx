'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HanjaSelector } from '@/components/hanja/HanjaSelector'
import { PaymentButton } from '@/components/payment/PaymentButton'
import { Hanja } from '@/types'

const isDev = process.env.NODE_ENV === 'development'

export default function HomePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [step, setStep] = useState<'input' | 'hanja'>('input')
  const [selectedHanja, setSelectedHanja] = useState<(Hanja | null)[]>([])
  const [devLoading, setDevLoading] = useState(false)

  const handleDevTest = async () => {
    if (!name.trim()) return
    setDevLoading(true)
    try {
      const res = await fetch('/api/dev/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputName: name,
          hanjaIds: selectedHanja.filter(Boolean).map(h => h!.id),
          readingRaw: name,
        }),
      })
      const data = await res.json()
      if (data.uuid) router.push(`/result/${data.uuid}`)
      else alert(data.error ?? '오류 발생')
    } finally {
      setDevLoading(false)
    }
  }

  const syllables = name.trim().split('')

  const handleNameSubmit = () => {
    if (name.trim().length < 2) return
    setSelectedHanja(new Array(syllables.length).fill(null))
    setStep('hanja')
  }

  const handleHanjaSelect = (index: number, hanja: Hanja | null) => {
    setSelectedHanja(prev => {
      const next = [...prev]
      next[index] = hanja
      return next
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="text-yellow-400 text-sm tracking-widest mb-3">✦ 이름 풀이 ✦</div>
        <h1 className="text-4xl font-bold text-white mb-3">내 이름의 기운</h1>
        <p className="text-purple-300 text-sm leading-relaxed">
          이름 속에 담긴 의미와 오행의 기운을<br />AI가 철학관 스타일로 풀어드립니다
        </p>
      </div>

      <div className="w-full max-w-md space-y-6">
        {step === 'input' && (
          <>
            <div>
              <label className="block text-purple-300 text-sm mb-2">이름을 입력하세요</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                placeholder="홍길동"
                maxLength={5}
                className="w-full bg-purple-950/50 border border-purple-700 rounded-2xl px-5 py-4 text-white text-2xl tracking-widest text-center placeholder-purple-600 focus:outline-none focus:border-yellow-400 transition-colors"
              />
            </div>
            <button
              onClick={handleNameSubmit}
              disabled={name.trim().length < 2}
              className="w-full py-4 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-2xl transition-colors disabled:opacity-50"
            >
              한자 선택하기
            </button>
          </>
        )}

        {step === 'hanja' && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep('input')} className="text-purple-400 hover:text-white text-sm transition-colors">
                ← 이름 수정
              </button>
              <span className="text-white font-bold text-xl tracking-widest">{name}</span>
            </div>

            <p className="text-purple-400 text-sm">각 글자의 한자를 선택해주세요. (선택 안 해도 됩니다)</p>

            <HanjaSelector syllables={syllables} onSelect={handleHanjaSelect} selected={selectedHanja} />

            {/* 블러 샘플 — 구매 유도 */}
            <div className="relative rounded-2xl overflow-hidden border border-purple-800">
              <div className="blur-sm p-5 bg-purple-950/30 select-none pointer-events-none">
                <p className="text-purple-200 text-sm leading-relaxed">
                  이 이름은 강한 목(木)의 기운을 품고 있으며, 위로 뻗어 오르는 나무처럼 성장과 발전의 기운이 가득합니다. 음양의 조화가 절묘하여...
                </p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-purple-950/60">
                <span className="text-yellow-400 text-sm font-semibold">결제 후 전문 공개</span>
              </div>
            </div>

            <PaymentButton inputName={name} selectedHanja={selectedHanja} />

            {isDev && (
              <button
                onClick={handleDevTest}
                disabled={devLoading}
                className="w-full py-3 border border-dashed border-purple-600 text-purple-400 hover:text-purple-200 hover:border-purple-400 text-sm rounded-2xl transition-colors disabled:opacity-50"
              >
                {devLoading ? '생성 중...' : '🛠 개발 테스트 (결제 없이 바로 풀이)'}
              </button>
            )}

            <p className="text-center text-purple-500 text-xs">
              토스페이먼츠 안전 결제 · 카드 / 카카오페이 / 네이버페이
            </p>
          </>
        )}
      </div>
    </main>
  )
}
