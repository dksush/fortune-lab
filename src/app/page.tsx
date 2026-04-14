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

const MARQUEE_CHIPS = [
  { icon: '🔢', label: '종합 점수' },
  { icon: '漢', label: '한자 풀이' },
  { icon: '☯', label: '오행 분석' },
  { icon: '📅', label: '대운표' },
  { icon: '✨', label: `${CURRENT_YEAR} 운세` },
  { icon: '💫', label: '사주 궁합' },
  { icon: '🌿', label: '성격 분석' },
  { icon: '💼', label: '직업·재물' },
  { icon: '❤️', label: '관계 운세' },
  { icon: '🔑', label: '이름 개운법' },
]

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

  const birthDateDisplay = (birthYear && birthMonth && birthDay)
    ? `${birthYear}. ${parseInt(birthMonth)}. ${parseInt(birthDay)}`
    : null
  const timeDisplay = sijinIdx === null ? '시간 모름' : SIJIN[sijinIdx].label

  const fontFamily = "-apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"

  return (
    <div style={{ background: '#1A0F07', minHeight: '100vh', fontFamily }}>
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee-scroll 20s linear infinite;
        }
        .marquee-wrap:hover .marquee-track {
          animation-play-state: paused;
        }
      `}</style>
      <div style={{ maxWidth: 390, margin: '0 auto', overflowX: 'hidden' }}>

      {/* ── Hero ── */}
      <div style={{ padding: '52px 24px 24px', textAlign: 'center', position: 'relative' }}>
        <div style={{
          display: 'inline-block', background: '#2e1e0e',
          border: '1px solid #5a3820', color: '#C4956A',
          fontSize: 11, letterSpacing: '0.1em',
          padding: '5px 16px', borderRadius: 20, marginBottom: 18,
        }}>
          ✦ 이름 운세 분석
        </div>
        <h1 style={{ fontSize: 23, fontWeight: 700, color: '#fff', lineHeight: 1.45, marginBottom: 10 }}>
          당신의 이름에 깃든<br />
          <span style={{ color: '#E07A3A' }}>하늘의 기운</span>을 풀어드립니다
        </h1>
        <p style={{ fontSize: 13, color: '#8a6a50', lineHeight: 1.7, marginBottom: 24 }}>
          이름 · 생년월일 · 사주를 함께 분석해<br />당신만의 운세를 도출합니다
        </p>
      </div>

      {/* ── Marquee ── */}
      <div className="marquee-wrap" style={{ overflow: 'hidden', width: '100%', position: 'relative', marginBottom: 8 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 40, background: 'linear-gradient(to right, #1A0F07, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, background: 'linear-gradient(to left, #1A0F07, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div className="marquee-track" style={{ display: 'flex', gap: 10, width: 'max-content', padding: '4px 0' }}>
          {[...MARQUEE_CHIPS, ...MARQUEE_CHIPS].map((chip, i) => (
            <div key={i} style={{
              flexShrink: 0, background: '#2e1e0e', border: '1px solid #5a3820',
              borderRadius: 12, padding: '11px 14px', textAlign: 'center', minWidth: 82,
            }}>
              <span style={{ fontSize: 20, display: 'block', marginBottom: 5, lineHeight: 1, color: '#fff' }}>{chip.icon}</span>
              <span style={{ fontSize: 11, color: '#C4956A', whiteSpace: 'nowrap' }}>{chip.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 20 }} />

      {/* ── Form area (bottom-sheet) ── */}
      <div style={{ background: '#F5F0EB', borderRadius: '28px 28px 0 0', padding: '22px 18px 180px' }}>

        {/* Handle */}
        <div style={{ width: 36, height: 4, background: '#d4c8bc', borderRadius: 2, margin: '0 auto 22px' }} />

        {/* 성명 입력 */}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#E07A3A', marginBottom: 12 }}>성명 입력</p>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 10 }}>
          <HanjaSelector
            rows={rows}
            onUpdate={handleUpdate}
            onAddRow={handleAddRow}
            onRemoveRow={handleRemoveRow}
            labels={ROW_LABELS}
          />
        </div>

        {/* 달력 & 성별 */}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#E07A3A', marginBottom: 12, marginTop: 18 }}>달력 &amp; 성별</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
          <div>
            <p style={{ fontSize: 12, color: '#8a7060', marginBottom: 6 }}>달력</p>
            <div style={{ display: 'flex', background: '#e8ddd4', borderRadius: 12, padding: 3, gap: 3 }}>
              {(['solar', 'lunar'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setCalendarType(type)}
                  style={{
                    flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 10,
                    fontSize: 14, cursor: 'pointer',
                    fontWeight: calendarType === type ? 700 : 500,
                    background: calendarType === type ? '#5a72a8' : 'transparent',
                    color: calendarType === type ? '#fff' : '#8a7060',
                    border: 'none', fontFamily,
                    transition: 'all 0.15s',
                  }}
                >
                  {type === 'solar' ? '양력' : '음력'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#8a7060', marginBottom: 6 }}>성별</p>
            <div style={{ display: 'flex', background: '#e8ddd4', borderRadius: 12, padding: 3, gap: 3 }}>
              {(['male', 'female'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  style={{
                    flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 10,
                    fontSize: 14, cursor: 'pointer',
                    fontWeight: gender === g ? 700 : 500,
                    background: gender === g ? '#E07A3A' : 'transparent',
                    color: gender === g ? '#fff' : '#8a7060',
                    border: 'none', fontFamily,
                    transition: 'all 0.15s',
                  }}
                >
                  {g === 'male' ? '남성' : '여성'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 생년월일 및 태어난 시간 */}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#E07A3A', marginBottom: 12, marginTop: 16 }}>생년월일 및 태어난 시간</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 6 }}>

          {/* 생일 dcard */}
          <div style={{ position: 'relative' }} ref={birthDateRef}>
            <button
              onClick={() => { setBirthDateOpen(o => !o); setTimeOpen(false) }}
              style={{
                width: '100%', background: '#fff',
                border: `1.5px solid ${birthDateOpen ? '#378ADD' : '#e8ddd4'}`,
                borderRadius: 14, padding: '13px 14px',
                cursor: 'pointer', textAlign: 'left', fontFamily,
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ fontSize: 11, color: '#8a7060', marginBottom: 4 }}>생일</div>
              <div style={{ fontSize: 15, fontWeight: birthDateDisplay ? 700 : 400, color: birthDateDisplay ? '#2A1A0E' : '#bbb' }}>
                {birthDateDisplay ?? '날짜 선택'}
              </div>
            </button>

            {birthDateOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8,
                background: '#fff', borderRadius: 14, border: '1.5px solid #e8ddd4',
                padding: 14, zIndex: 50,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}>
                <select
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value)}
                  style={{ width: '100%', background: '#F5F0EB', border: '1.5px solid #e8ddd4', borderRadius: 10, padding: '11px 12px', fontSize: 14, color: '#2A1A0E', outline: 'none', marginBottom: 8, fontFamily }}
                >
                  <option value="">년도 선택</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <select
                    value={birthMonth}
                    onChange={e => setBirthMonth(e.target.value)}
                    style={{ background: '#F5F0EB', border: '1.5px solid #e8ddd4', borderRadius: 10, padding: '11px 10px', fontSize: 14, color: '#2A1A0E', outline: 'none', fontFamily }}
                  >
                    <option value="">월</option>
                    {MONTHS.map(m => <option key={m} value={m}>{parseInt(m)}월</option>)}
                  </select>
                  <select
                    value={birthDay}
                    onChange={e => setBirthDay(e.target.value)}
                    style={{ background: '#F5F0EB', border: '1.5px solid #e8ddd4', borderRadius: 10, padding: '11px 10px', fontSize: 14, color: '#2A1A0E', outline: 'none', fontFamily }}
                  >
                    <option value="">일</option>
                    {DAYS.map(d => <option key={d} value={d}>{parseInt(d)}일</option>)}
                  </select>
                </div>
                {birthYear && birthMonth && birthDay && (
                  <button
                    onClick={() => setBirthDateOpen(false)}
                    style={{ width: '100%', background: '#E07A3A', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily }}
                  >
                    확인
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 시간 dcard */}
          <div style={{ position: 'relative' }} ref={timeRef}>
            <button
              onClick={() => { setTimeOpen(o => !o); setBirthDateOpen(false) }}
              style={{
                width: '100%', background: '#fff',
                border: `1.5px solid ${timeOpen ? '#378ADD' : '#e8ddd4'}`,
                borderRadius: 14, padding: '13px 14px',
                cursor: 'pointer', textAlign: 'left', fontFamily,
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ fontSize: 11, color: '#8a7060', marginBottom: 4 }}>시간</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#2A1A0E' }}>{timeDisplay}</div>
            </button>

            {timeOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                background: '#fff', borderRadius: 14, border: '1.5px solid #e8ddd4',
                zIndex: 50, overflow: 'hidden', width: 260,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}>
                {/* 시간 모름 */}
                <button
                  onClick={() => { setSijinIdx(null); setTimeOpen(false) }}
                  style={{
                    width: '100%', padding: '13px 14px', textAlign: 'left',
                    border: 'none', borderBottom: '1px solid #F5F0EB', cursor: 'pointer',
                    background: sijinIdx === null ? '#E07A3A' : '#fff',
                    color: sijinIdx === null ? '#fff' : '#2A1A0E',
                    fontSize: 13, fontWeight: 700, fontFamily,
                  }}
                >
                  시간 모름
                </button>
                {/* 12 시진 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {SIJIN.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setSijinIdx(i); setTimeOpen(false) }}
                      style={{
                        padding: '12px 14px', textAlign: 'left',
                        border: 'none', borderBottom: '1px solid #F5F0EB',
                        cursor: 'pointer', fontFamily,
                        background: sijinIdx === i ? '#E07A3A' : '#fff',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: sijinIdx === i ? '#fff' : '#2A1A0E' }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: sijinIdx === i ? 'rgba(255,255,255,0.75)' : '#8a7060', marginTop: 1 }}>{s.range}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p style={{ fontSize: 11, color: '#8a7060', marginBottom: 10 }}>양력 기준. 시간 입력 시 시주(時柱)까지 계산됩니다</p>

        {/* Tip box */}
        <div style={{ display: 'flex', gap: 10, background: '#fff', borderRadius: 12, padding: '12px 14px', alignItems: 'flex-start' }}>
          <div style={{ width: 32, height: 32, background: '#E07A3A', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>
            ✦
          </div>
          <div>
            <p style={{ fontWeight: 700, color: '#2A1A0E', fontSize: 13, marginBottom: 3 }}>정확한 사주 분석</p>
            <p style={{ fontSize: 12, color: '#5a4030', lineHeight: 1.6 }}>
              태어난 시각을 정확히 입력할수록 더 정교한 에너지 분석 결과가 도출됩니다.
            </p>
          </div>
        </div>

        {/* Teaser card — show when name is 2+ chars */}
        {inputName.length >= 2 && (
          <div style={{ background: '#2A1A0E', borderRadius: 14, padding: '14px 16px', margin: '18px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: '#8a6a50', marginBottom: 2 }}>예상 종합 점수</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#E07A3A', lineHeight: 1 }}>
                —<span style={{ fontSize: 13, color: '#8a6a50', fontWeight: 400 }}>/100</span>
              </p>
            </div>
            <p style={{ fontSize: 12, color: '#C4956A', lineHeight: 1.7, flex: 1 }}>
              <span style={{ color: '#E07A3A', fontWeight: 700 }}>{inputName}</span>님의 이름에<br />
              상승의 기운이 담겨있어요.<br />
              <span style={{ color: '#6a5040' }}>전체 분석을 확인하세요</span>
            </p>
            <div style={{ width: 30, height: 30, background: '#3a2a1a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="7" width="10" height="8" rx="2" fill="#C4956A" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="#C4956A" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
          </div>
        )}

      </div>
      </div>{/* max-width wrapper */}

      {/* ── Fixed bottom CTA ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#F5F0EB', padding: '12px 18px 24px', zIndex: 50 }}>
        <div style={{ maxWidth: 390, margin: '0 auto' }}>
          <button
            onClick={handlePreview}
            disabled={!canAnalyze}
            style={{
              width: '100%', background: canAnalyze ? '#E07A3A' : '#ccc',
              color: '#fff', border: 'none', borderRadius: 14, padding: 17,
              fontSize: 16, fontWeight: 700, cursor: canAnalyze ? 'pointer' : 'not-allowed',
              fontFamily, marginBottom: isDev ? 10 : 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
              opacity: canAnalyze ? 1 : 0.5,
            }}
          >
            <span>{canAnalyze ? `${inputName}의 운세 분석하기` : '이름의 기운 분석하기'}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {isDev && (
            <button
              onClick={handleDevTest}
              disabled={devLoading}
              style={{
                width: '100%', marginTop: 10, padding: '10px 0',
                background: 'transparent', border: '1px dashed rgba(217,93,57,0.3)',
                borderRadius: 10, color: '#8a7060', fontSize: 13,
                cursor: 'pointer', fontFamily,
                opacity: devLoading ? 0.5 : 1,
              }}
            >
              {devLoading ? '생성 중...' : '🛠 개발 테스트 (결제 없이)'}
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
