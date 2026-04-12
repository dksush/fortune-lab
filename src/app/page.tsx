'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HanjaSelector, NameRow } from '@/components/hanja/HanjaSelector'

const isDev = process.env.NODE_ENV === 'development'

const INITIAL_ROWS: NameRow[] = [
  { id: 'r1', query: '', syllable: '', selected: null },
  { id: 'r2', query: '', syllable: '', selected: null },
  { id: 'r3', query: '', syllable: '', selected: null },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1929 }, (_, i) => String(CURRENT_YEAR - i))
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

const ROW_LABELS = ['성', '이름', '이름', '이름', '이름']

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
  const rowCounterRef = useRef(INITIAL_ROWS.length)
  const [rows, setRows] = useState<NameRow[]>(INITIAL_ROWS)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [sijinIdx, setSijinIdx] = useState<number | null>(null)
  const [devLoading, setDevLoading] = useState(false)
  const [birthDateOpen, setBirthDateOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)

  const birthDateRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (birthDateRef.current && !birthDateRef.current.contains(e.target as Node)) {
        setBirthDateOpen(false)
      }
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) {
        setTimeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleUpdate = (id: string, patch: Partial<NameRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }
  const handleAddRow = () => {
    if (rows.length >= 5) return
    const id = `r${++rowCounterRef.current}`
    setRows(prev => [...prev, { id, query: '', syllable: '', selected: null }])
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

  const birthDateDisplay = birthDateFormatted
    ? `${birthYear}. ${parseInt(birthMonth)}. ${parseInt(birthDay)}`
    : null
  const timeDisplay = sijinIdx === null ? '시간 모름' : SIJIN[sijinIdx].label

  return (
    <main className="ethereal-gradient min-h-screen flex flex-col items-center px-6 pt-12 pb-40 overflow-x-hidden relative">

      {/* 배경 장식 블러 */}
      <div className="fixed top-[-10%] right-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(120px)' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(93,115,157,0.08)', filter: 'blur(120px)' }} />

      <div className="w-full max-w-md flex flex-col gap-10 relative z-10">

        {/* ── 헤더 ── */}
        <header className="text-center space-y-3">
          <h1 className="font-serif text-3xl leading-snug tracking-tight text-[#2D2926]">
            당신의 이름에 깃든<br />하늘의 기운을 마주하세요
          </h1>
          <p className="text-xs text-[#6D6661] tracking-[0.25em] uppercase">
            The Celestial Curator
          </p>
        </header>

        {/* ── 성명 입력 ── */}
        <section className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#D95D39]">
            성명 입력
          </label>
          <div className="glass-panel rounded-3xl p-5 shadow-sm">
            <HanjaSelector
              rows={rows}
              onUpdate={handleUpdate}
              onAddRow={handleAddRow}
              onRemoveRow={handleRemoveRow}
              labels={ROW_LABELS}
            />
          </div>
        </section>

        {/* ── 달력 + 성별 토글 (2열) ── */}
        <section className="grid grid-cols-2 gap-4">
          {/* 달력 */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#D95D39]">
              달력
            </label>
            <div className="glass-panel p-1 rounded-full flex shadow-sm">
              {(['solar', 'lunar'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setCalendarType(type)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
                    calendarType === type
                      ? 'bg-[#D95D39] text-white shadow-sm'
                      : 'text-[#6D6661] hover:text-[#2D2926]'
                  }`}
                >
                  {type === 'solar' ? '양력' : '음력'}
                </button>
              ))}
            </div>
          </div>

          {/* 성별 */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#D95D39]">
              성별
            </label>
            <div className="glass-panel p-1 rounded-full flex shadow-sm">
              {(['male', 'female'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${
                    gender === g
                      ? 'bg-[#D95D39] text-white shadow-sm'
                      : 'text-[#6D6661] hover:text-[#2D2926]'
                  }`}
                >
                  {g === 'male' ? '남성' : '여성'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 생년월일 + 시간 ── */}
        <section className="space-y-5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[#D95D39]">
            생년월일 및 태어난 시간
          </label>

          <div className="grid grid-cols-2 gap-4">

            {/* 생일 드롭다운 */}
            <div className="relative" ref={birthDateRef}>
              <button
                onClick={() => { setBirthDateOpen(o => !o); setTimeOpen(false) }}
                className="w-full glass-panel rounded-3xl px-5 py-5 flex flex-col gap-1 shadow-sm text-left transition-all hover:shadow-md"
              >
                <span className="text-xs text-[#6D6661]">생일</span>
                <span className={`text-sm font-semibold leading-tight ${birthDateDisplay ? 'text-[#2D2926]' : 'text-[#B0A090]'}`}>
                  {birthDateDisplay ?? '날짜 선택'}
                </span>
              </button>

              {birthDateOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-3xl p-4 shadow-2xl z-50 space-y-3 border border-[#E8E3DC]"
                  style={{ background: '#FAF8F5' }}>
                  <select
                    value={birthYear}
                    onChange={e => setBirthYear(e.target.value)}
                    className="w-full bg-white border border-[#E8E3DC] rounded-2xl px-4 py-3 text-[#2D2926] text-sm focus:outline-none focus:ring-1 focus:ring-[#D95D39]/30"
                  >
                    <option value="">년도 선택</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={birthMonth}
                      onChange={e => setBirthMonth(e.target.value)}
                      className="w-full bg-white border border-[#E8E3DC] rounded-2xl px-3 py-3 text-[#2D2926] text-sm focus:outline-none focus:ring-1 focus:ring-[#D95D39]/30"
                    >
                      <option value="">월</option>
                      {MONTHS.map(m => <option key={m} value={m}>{parseInt(m)}월</option>)}
                    </select>
                    <select
                      value={birthDay}
                      onChange={e => setBirthDay(e.target.value)}
                      className="w-full bg-white border border-[#E8E3DC] rounded-2xl px-3 py-3 text-[#2D2926] text-sm focus:outline-none focus:ring-1 focus:ring-[#D95D39]/30"
                    >
                      <option value="">일</option>
                      {DAYS.map(d => <option key={d} value={d}>{parseInt(d)}일</option>)}
                    </select>
                  </div>
                  {birthYear && birthMonth && birthDay && (
                    <button
                      onClick={() => setBirthDateOpen(false)}
                      className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all"
                      style={{ background: 'linear-gradient(to right, #D95D39, #F28C6A)' }}
                    >
                      확인
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 시간 드롭다운 */}
            <div className="relative" ref={timeRef}>
              <button
                onClick={() => { setTimeOpen(o => !o); setBirthDateOpen(false) }}
                className="w-full glass-panel rounded-3xl px-5 py-5 flex flex-col gap-1 shadow-sm text-left transition-all hover:shadow-md"
              >
                <span className="text-xs text-[#6D6661]">시간</span>
                <span className="text-sm font-semibold text-[#2D2926] leading-tight">
                  {timeDisplay}
                </span>
              </button>

              {timeOpen && (
                <div className="absolute top-full right-0 mt-2 rounded-3xl p-4 shadow-2xl z-50 w-[260px] border border-[#E8E3DC]"
                  style={{ background: '#FAF8F5' }}>
                  {/* 시간 모름 */}
                  <button
                    onClick={() => { setSijinIdx(null); setTimeOpen(false) }}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-sm mb-3 font-medium transition-colors ${
                      sijinIdx === null ? 'text-white' : 'text-[#6D6661] hover:bg-[#F0EDE8]'
                    }`}
                    style={sijinIdx === null ? { background: 'linear-gradient(to right, #D95D39, #F28C6A)' } : {}}
                  >
                    시간 모름
                  </button>
                  {/* 12 시진 — 2열 */}
                  <div className="grid grid-cols-2 gap-2">
                    {SIJIN.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setSijinIdx(i); setTimeOpen(false) }}
                        className={`text-left px-3 py-2.5 rounded-2xl text-xs transition-colors ${
                          sijinIdx === i ? 'text-white' : 'text-[#6D6661] hover:bg-[#F0EDE8]'
                        }`}
                        style={sijinIdx === i ? { background: 'linear-gradient(to right, #D95D39, #F28C6A)' } : {}}
                      >
                        <span className="block font-semibold">{s.label}</span>
                        <span className="block opacity-70 text-[10px] mt-0.5">{s.range}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-[#B0A090]">양력 기준. 시간 입력 시 시주(時柱)까지 계산됩니다</p>
        </section>

        {/* ── 정보 카드 ── */}
        <div className="glass-panel rounded-3xl p-5 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none"
            style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(40px)' }} />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 text-lg"
              style={{ background: 'linear-gradient(135deg, #D95D39, #F28C6A)' }}>
              ✦
            </div>
            <div>
              <h3 className="font-serif text-base mb-1 text-[#2D2926]">정확한 사주 분석</h3>
              <p className="text-xs text-[#6D6661] leading-relaxed">
                태어난 시각을 정확히 입력할수록 더 정교한 에너지 분석 결과가 도출됩니다.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#6D6661] opacity-50 tracking-[0.3em] uppercase">
          Your Destiny Is Written In The Stars
        </p>

        {isDev && (
          <button
            onClick={handleDevTest}
            disabled={devLoading}
            className="w-full py-3 rounded-2xl border border-dashed border-[#D95D39]/30 text-[#6D6661] text-sm transition-colors disabled:opacity-50"
          >
            {devLoading ? '생성 중...' : '🛠 개발 테스트 (결제 없이)'}
          </button>
        )}
      </div>

      {/* ── 하단 고정 CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none">
        <div className="max-w-md mx-auto w-full pointer-events-auto">
          <button
            onClick={handlePreview}
            disabled={!canAnalyze}
            className="w-full py-5 rounded-full text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canAnalyze ? 'linear-gradient(to right, #D95D39, #F28C6A)' : '#C4B8B0',
              boxShadow: canAnalyze ? '0 12px 40px rgba(217,93,57,0.45)' : 'none',
            }}
          >
            내 이름의 기운 분석하기
          </button>
        </div>
      </div>
    </main>
  )
}
