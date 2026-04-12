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

// 12 시진 (時辰) 정의 — value는 API 전달용 시간 문자열
const SIJIN = [
  { label: '자시(子)', range: '00:00~01:29', apiTime: '오전 12시 45분' },
  { label: '축시(丑)', range: '01:30~03:29', apiTime: '오전 2시 30분'  },
  { label: '인시(寅)', range: '03:30~05:29', apiTime: '오전 4시 30분'  },
  { label: '묘시(卯)', range: '05:30~07:29', apiTime: '오전 6시 30분'  },
  { label: '진시(辰)', range: '07:30~09:29', apiTime: '오전 8시 30분'  },
  { label: '사시(巳)', range: '09:30~11:29', apiTime: '오전 10시 30분' },
  { label: '오시(午)', range: '11:30~13:29', apiTime: '오후 12시 30분' },
  { label: '미시(未)', range: '13:30~15:29', apiTime: '오후 2시 30분'  },
  { label: '신시(申)', range: '15:30~17:29', apiTime: '오후 4시 30분'  },
  { label: '유시(酉)', range: '17:30~19:29', apiTime: '오후 6시 30분'  },
  { label: '술시(戌)', range: '19:30~21:29', apiTime: '오후 8시 30분'  },
  { label: '해시(亥)', range: '21:30~23:29', apiTime: '오후 10시 30분' },
] as const

export default function HomePage() {
  const router = useRouter()
  const [rows, setRows] = useState<NameRow[]>([makeRow(), makeRow(), makeRow()])
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  // null = 시간 모름, number = SIJIN 인덱스
  const [sijinIdx, setSijinIdx] = useState<number | null>(null)
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
    if (sijinIdx === null) return birthDateFormatted
    return `${birthDateFormatted} ${SIJIN[sijinIdx].apiTime}`
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

        {/* 태어난 시간 — 시진(時辰) 선택 */}
        <div>
          <label className="block text-[#3D2B1F] text-sm mb-3 font-medium">
            태어난 시간 <span className="text-[#B0A090] font-normal">(선택)</span>
          </label>
          <div className="border border-[#C4A882] overflow-hidden">
            {/* 시간 모름 */}
            <button
              onClick={() => setSijinIdx(null)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors border-b border-[#D4B896] ${
                sijinIdx === null
                  ? 'bg-[#3D2B1F] text-[#FAF5EA]'
                  : 'bg-[#FAF5EA] text-[#8B7355] hover:bg-[#F0E6CC]'
              }`}
            >
              <span className="font-medium">시간 모름</span>
              {sijinIdx === null && <span className="text-[#C4973A] text-xs">●</span>}
            </button>
            {/* 12 시진 — 2열 그리드 */}
            <div className="grid grid-cols-2">
              {SIJIN.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSijinIdx(i)}
                  className={`flex items-center justify-between px-4 py-3 text-sm transition-colors border-b border-r border-[#D4B896] last:border-r-0 ${
                    i % 2 === 1 ? 'border-r-0' : ''
                  } ${
                    sijinIdx === i
                      ? 'bg-[#FFF9ED] text-[#2C1A0E]'
                      : 'bg-[#FAF5EA] text-[#3D2B1F] hover:bg-[#F0E6CC]'
                  }`}
                >
                  <span>
                    <span className={`font-medium ${sijinIdx === i ? 'text-[#C4973A]' : ''}`}>{s.label}</span>
                    <span className="block text-[10px] text-[#B0A090] mt-0.5">{s.range}</span>
                  </span>
                  {sijinIdx === i && <span className="text-[#C4973A] text-xs shrink-0 ml-1">●</span>}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[#B0A090] text-xs mt-1.5">태어난 시간대를 선택하면 시주(時柱)까지 계산됩니다</p>
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
