'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HanjaSelector, NameRow } from '@/components/hanja/HanjaSelector'
import { PaymentButton } from '@/components/payment/PaymentButton'

const isDev = process.env.NODE_ENV === 'development'

let _rowCounter = 0
function makeRow(): NameRow {
  return { id: String(++_rowCounter), query: '', syllable: '', selected: null }
}

export default function HomePage() {
  const router = useRouter()
  const [rows, setRows] = useState<NameRow[]>([makeRow(), makeRow(), makeRow()])
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState({ ampm: '오전', hour: '', minute: '' })
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [devLoading, setDevLoading] = useState(false)

  const handleUpdate = (id: string, patch: Partial<NameRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  const handleAddRow = () => {
    if (rows.length >= 5) return
    setRows(prev => [...prev, makeRow()])
  }

  // id 기반 삭제 → 인덱스 혼동 없음
  const handleRemoveRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const inputName = rows.map(r => r.syllable).filter(Boolean).join('')
  const selectedHanja = rows.map(r => r.selected)
  const hanjaIds = rows.flatMap(r =>
    r.selected && !r.selected.id.startsWith('manual-') ? [r.selected.id] : []
  )
  // AI 프롬프트용: 직접 입력 한자만
  const extraHanja = rows.flatMap(r =>
    r.selected?.id.startsWith('manual-')
      ? [{ character: r.selected.character, reading: r.selected.reading, meaning: r.selected.meaning }]
      : []
  )
  // 결과 화면 표시용: 위치 정보 포함 전체 선택 한자 (DB + 직접 입력 모두)
  const allSelectedHanja = rows
    .map((r, idx) => r.selected ? {
      pos: idx,
      character: r.selected.character,
      reading: r.selected.reading,
      meaning: r.selected.meaning,
    } : null)
    .filter(Boolean)

  const handleBirthDateChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 6) formatted = `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`
    else if (digits.length > 4) formatted = `${digits.slice(0, 4)}.${digits.slice(4)}`
    setBirthDate(formatted)
  }

  const birthDateForApi = (() => {
    if (!birthDate) return ''
    if (timeUnknown || (!birthTime.hour && !birthTime.minute)) return birthDate
    const h = birthTime.hour ? `${birthTime.ampm} ${birthTime.hour}시` : ''
    const m = birthTime.minute ? ` ${birthTime.minute}분` : ''
    return `${birthDate} ${h}${m}`.trim()
  })()

  const handleDevTest = async () => {
    if (!inputName.trim()) return
    setDevLoading(true)
    try {
      const res = await fetch('/api/dev/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputName, hanjaIds, readingRaw: inputName, extraHanja, allSelectedHanja, birthDate: birthDateForApi }),
      })
      const data = await res.json()
      if (data.uuid) router.push(`/result/${data.uuid}`)
      else alert(data.error ?? '오류 발생')
    } finally {
      setDevLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F5EDD8] flex flex-col items-center px-4 py-10">
      {/* 헤더 */}
      <div className="text-center mb-10">
        <div className="text-[#C4973A] text-sm tracking-[0.3em] mb-3">✦ 이름풀이 ✦</div>
        <h1 className="text-3xl font-bold text-[#2C1A0E] mb-2 tracking-wide">내 이름의 기운</h1>
        <p className="text-[#8B7355] text-sm leading-relaxed">
          이름 속에 담긴 의미와 오행의 기운을<br />AI가 철학관 스타일로 풀어드립니다
        </p>
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-[#C4973A] to-transparent" />
      </div>

      <div className="w-full max-w-md space-y-8">

        {/* 한자 선택 */}
        <div>
          <p className="text-[#3D2B1F] text-sm font-medium mb-1">이름</p>
          <p className="text-[#8B7355] text-xs mb-3">
            훈·음으로 검색하거나 직접 한자를 붙여넣기 하세요.
          </p>
          <HanjaSelector
            rows={rows}
            onUpdate={handleUpdate}
            onAddRow={handleAddRow}
            onRemoveRow={handleRemoveRow}
          />
        </div>

        {/* 구분선 */}
        <div className="h-px bg-[#D4B896]" />

        {/* 생년월일 */}
        <div>
          <label className="block text-[#3D2B1F] text-sm mb-2 font-medium">생년월일</label>
          <input
            type="text"
            value={birthDate}
            onChange={e => handleBirthDateChange(e.target.value)}
            placeholder="1992.08.28"
            inputMode="numeric"
            className="w-full bg-[#FAF5EA] border border-[#C4A882] rounded-xl px-4 py-3 text-[#2C1A0E] text-center placeholder-[#C4A882] focus:outline-none focus:border-[#8B5A2B] transition-colors"
          />
        </div>

        {/* 태어난 시간 */}
        <div>
          <label className="block text-[#3D2B1F] text-sm mb-2 font-medium">태어난 시간</label>
          <div className={`flex gap-2 ${timeUnknown ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex rounded-lg overflow-hidden border border-[#C4A882]">
              {['오전', '오후'].map(v => (
                <button
                  key={v}
                  onClick={() => setBirthTime(t => ({ ...t, ampm: v }))}
                  className={`px-4 py-2.5 text-sm transition-colors ${
                    birthTime.ampm === v
                      ? 'bg-[#3D2B1F] text-[#FAF5EA]'
                      : 'bg-[#FAF5EA] text-[#8B7355]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <input
              type="number" min={1} max={12}
              value={birthTime.hour}
              onChange={e => setBirthTime(t => ({ ...t, hour: e.target.value }))}
              placeholder="시"
              className="flex-1 bg-[#FAF5EA] border border-[#C4A882] rounded-lg px-3 py-2.5 text-[#2C1A0E] text-center placeholder-[#C4A882] focus:outline-none focus:border-[#8B5A2B] transition-colors"
            />
            <input
              type="number" min={0} max={59}
              value={birthTime.minute}
              onChange={e => setBirthTime(t => ({ ...t, minute: e.target.value }))}
              placeholder="분"
              className="flex-1 bg-[#FAF5EA] border border-[#C4A882] rounded-lg px-3 py-2.5 text-[#2C1A0E] text-center placeholder-[#C4A882] focus:outline-none focus:border-[#8B5A2B] transition-colors"
            />
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={e => setTimeUnknown(e.target.checked)}
              className="accent-[#8B5A2B]"
            />
            <span className="text-[#8B7355] text-sm">시간을 모릅니다</span>
          </label>
        </div>

        {/* 구매 유도 블러 */}
        <div className="relative rounded-xl overflow-hidden border border-[#D4B896]">
          <div className="blur-sm p-5 bg-[#FAF5EA] select-none pointer-events-none">
            <p className="text-[#3D2B1F] text-sm leading-relaxed">
              이 이름은 강한 목(木)의 기운을 품고 있으며, 위로 뻗어 오르는 나무처럼 성장과 발전의 기운이 가득합니다...
            </p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-[#FAF5EA]/70">
            <span className="text-[#8B5A2B] text-sm font-semibold tracking-wide">✦ 결제 후 전문 공개 ✦</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-center text-[#B0A090] text-xs">토스페이먼츠 안전 결제 · 카드 / 카카오페이 / 네이버페이</p>
          <PaymentButton inputName={inputName} selectedHanja={selectedHanja} birthDate={birthDateForApi} />
        </div>

        {isDev && (
          <button
            onClick={handleDevTest}
            disabled={devLoading}
            className="w-full py-3 border border-dashed border-[#C4A882] text-[#8B7355] hover:text-[#3D2B1F] text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            {devLoading ? '생성 중...' : '🛠 개발 테스트 (결제 없이)'}
          </button>
        )}
      </div>
    </main>
  )
}
