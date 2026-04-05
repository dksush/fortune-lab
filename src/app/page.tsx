'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HanjaSelector, NameRow } from '@/components/hanja/HanjaSelector'

const isDev = process.env.NODE_ENV === 'development'

let _rowCounter = 0
function makeRow(): NameRow {
  return { id: String(++_rowCounter), query: '', syllable: '', selected: null }
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1929 }, (_, i) => String(CURRENT_YEAR - i))
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

const ROW_LABELS = ['성', '이름', '이름', '이름', '이름']

export default function HomePage() {
  const router = useRouter()
  const [rows, setRows] = useState<NameRow[]>([makeRow(), makeRow(), makeRow()])
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
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

  const handleRemoveRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const inputName = rows.map(r => r.syllable).filter(Boolean).join('')
  const hanjaIds = rows.flatMap(r =>
    r.selected && !r.selected.id.startsWith('manual-') ? [r.selected.id] : []
  )
  const extraHanja = rows.flatMap(r =>
    r.selected?.id.startsWith('manual-')
      ? [{ character: r.selected.character, reading: r.selected.reading, meaning: r.selected.meaning }]
      : []
  )
  const allSelectedHanja = rows
    .map((r, idx) => r.selected ? {
      pos: idx,
      character: r.selected.character,
      reading: r.selected.reading,
      meaning: r.selected.meaning,
    } : null)
    .filter(Boolean)

  // 생년월일 (양력)
  const birthDateFormatted = (birthYear && birthMonth && birthDay)
    ? `${birthYear}.${birthMonth}.${birthDay}`
    : ''

  const birthDateForApi = (() => {
    if (!birthDateFormatted) return ''
    if (timeUnknown || (!birthTime.hour && !birthTime.minute)) return birthDateFormatted
    const h = birthTime.hour ? `${birthTime.ampm} ${birthTime.hour}시` : ''
    const m = birthTime.minute ? ` ${birthTime.minute}분` : ''
    return `${birthDateFormatted} ${h}${m}`.trim()
  })()

  const canAnalyze = inputName.trim().length > 0 && !!(birthYear && birthMonth && birthDay)

  const handlePreview = () => {
    if (!canAnalyze) return
    const params = new URLSearchParams({
      name: inputName,
      birth: birthDateForApi,
      hanja: btoa(unescape(encodeURIComponent(JSON.stringify(allSelectedHanja)))),
      ids: hanjaIds.join(','),
      extra: btoa(unescape(encodeURIComponent(JSON.stringify(extraHanja)))),
      gender,
    })
    router.push(`/preview?${params.toString()}`)
  }

  const handleDevTest = async () => {
    if (!inputName.trim()) return
    setDevLoading(true)
    try {
      const res = await fetch('/api/dev/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputName, hanjaIds, readingRaw: inputName, extraHanja, allSelectedHanja, birthDate: birthDateForApi, gender }),
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

        {/* 이름 + 한자 */}
        <div>
          <p className="text-[#3D2B1F] text-sm font-medium mb-1">이름</p>
          <p className="text-[#8B7355] text-xs mb-3">
            훈·음으로 검색하거나 직접 한자를 붙여넣기 하세요.
            <span className="ml-1 text-[#C4973A]">한자를 몰라도 한글 이름만으로 분석 가능합니다.</span>
          </p>
          <HanjaSelector
            rows={rows}
            onUpdate={handleUpdate}
            onAddRow={handleAddRow}
            onRemoveRow={handleRemoveRow}
            labels={ROW_LABELS}
          />
        </div>

        <div className="h-px bg-[#D4B896]" />

        {/* 성별 */}
        <div>
          <label className="block text-[#3D2B1F] text-sm mb-2 font-medium">성별</label>
          <div className="flex rounded-xl overflow-hidden border border-[#C4A882] w-fit">
            {(['male', 'female'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`px-8 py-2.5 text-sm font-medium transition-colors ${
                  gender === g
                    ? 'bg-[#3D2B1F] text-[#FAF5EA]'
                    : 'bg-[#FAF5EA] text-[#8B7355] hover:bg-[#F0E6CC]'
                }`}
              >
                {g === 'male' ? '남성' : '여성'}
              </button>
            ))}
          </div>
          <p className="text-[#B0A090] text-xs mt-1.5">대운 방향 계산에 사용됩니다</p>
        </div>

        <div className="h-px bg-[#D4B896]" />

        {/* 생년월일 */}
        <div>
          <label className="block text-[#3D2B1F] text-sm mb-2 font-medium">생년월일</label>
          <div className="flex gap-2">
            <select
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              className="flex-[2] bg-[#FAF5EA] border border-[#C4A882] rounded-xl px-3 py-3 text-[#2C1A0E] text-sm focus:outline-none focus:border-[#8B5A2B] transition-colors appearance-none"
            >
              <option value="">년</option>
              {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select
              value={birthMonth}
              onChange={e => setBirthMonth(e.target.value)}
              className="flex-1 bg-[#FAF5EA] border border-[#C4A882] rounded-xl px-3 py-3 text-[#2C1A0E] text-sm focus:outline-none focus:border-[#8B5A2B] transition-colors appearance-none"
            >
              <option value="">월</option>
              {MONTHS.map(m => <option key={m} value={m}>{parseInt(m)}월</option>)}
            </select>
            <select
              value={birthDay}
              onChange={e => setBirthDay(e.target.value)}
              className="flex-1 bg-[#FAF5EA] border border-[#C4A882] rounded-xl px-3 py-3 text-[#2C1A0E] text-sm focus:outline-none focus:border-[#8B5A2B] transition-colors appearance-none"
            >
              <option value="">일</option>
              {DAYS.map(d => <option key={d} value={d}>{parseInt(d)}일</option>)}
            </select>
          </div>
          <p className="text-[#B0A090] text-xs mt-1.5">양력 기준으로 계산됩니다</p>
        </div>

        {/* 태어난 시간 */}
        <div>
          <label className="block text-[#3D2B1F] text-sm mb-2 font-medium">태어난 시간 <span className="text-[#B0A090] font-normal">(선택)</span></label>
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

        {/* 분석 시작 버튼 */}
        <button
          onClick={handlePreview}
          disabled={!canAnalyze}
          className="w-full py-4 bg-[#3D2B1F] hover:bg-[#2C1A0E] text-[#FAF5EA] font-bold text-lg tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ✦ 내 이름의 기운 분석하기 ✦
        </button>

        <p className="text-center text-[#B0A090] text-xs -mt-4">
          이름과 생년월일을 입력하면 사주 분석표를 먼저 확인할 수 있습니다
        </p>

        {isDev && (
          <button
            onClick={handleDevTest}
            disabled={devLoading}
            className="w-full py-3 border border-dashed border-[#C4A882] text-[#8B7355] hover:text-[#3D2B1F] text-sm transition-colors disabled:opacity-50"
          >
            {devLoading ? '생성 중...' : '🛠 개발 테스트 (결제 없이)'}
          </button>
        )}
      </div>
    </main>
  )
}
