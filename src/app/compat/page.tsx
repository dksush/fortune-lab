'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { HanjaSelector, NameRow } from '@/components/hanja/HanjaSelector'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1929 }, (_, i) => String(CURRENT_YEAR - i))
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
const ROW_LABELS = ['성', '이름', '이름', '이름', '이름']
const SIJIN = [
  { label: '자시(子)', range: '00:00~01:29', apiTime: '오전 12시 45분' },
  { label: '축시(丑)', range: '01:30~03:29', apiTime: '오전 2시 30분' },
  { label: '인시(寅)', range: '03:30~05:29', apiTime: '오전 4시 30분' },
  { label: '묘시(卯)', range: '05:30~07:29', apiTime: '오전 6시 30분' },
  { label: '진시(辰)', range: '07:30~09:29', apiTime: '오전 8시 30분' },
  { label: '사시(巳)', range: '09:30~11:29', apiTime: '오전 10시 30분' },
  { label: '오시(午)', range: '11:30~13:29', apiTime: '오후 12시 30분' },
  { label: '미시(未)', range: '13:30~15:29', apiTime: '오후 2시 30분' },
  { label: '신시(申)', range: '15:30~17:29', apiTime: '오후 4시 30분' },
  { label: '유시(酉)', range: '17:30~19:29', apiTime: '오후 6시 30분' },
  { label: '술시(戌)', range: '19:30~21:29', apiTime: '오후 8시 30분' },
  { label: '해시(亥)', range: '21:30~23:29', apiTime: '오후 10시 30분' },
] as const

const INITIAL_ROWS = (): NameRow[] => [
  { id: 'r1', query: '', syllable: '', selected: null },
  { id: 'r2', query: '', syllable: '', selected: null },
  { id: 'r3', query: '', syllable: '', selected: null },
]

const RELATION_OPTIONS = [
  { value: 'lover', label: '연인 · 썸' },
  { value: 'friend', label: '친구' },
  { value: 'family', label: '가족' },
]

function CompatPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fontFamily = "-apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"

  // URL params pre-fill (내 결과화면에서 넘어온 경우)
  const prefillName = searchParams.get('myName') ?? ''
  const prefillBirth = searchParams.get('myBirth') ?? ''
  const prefillGender = (searchParams.get('myGender') ?? 'male') as 'male' | 'female'
  const prefillHanja = (() => {
    try { return JSON.parse(decodeURIComponent(escape(atob(searchParams.get('myHanja') ?? '')))) }
    catch { return [] }
  })()
  const hasPrefill = !!prefillName

  // Step: 1=내 정보, 2=상대방 정보
  const [step, setStep] = useState<1 | 2>(hasPrefill ? 2 : 1)
  const [relationType, setRelationType] = useState<'lover' | 'friend' | 'family'>('lover')

  // ── 내 정보 ──
  const myRowCounter = useRef(3)
  const [myRows, setMyRows] = useState<NameRow[]>(INITIAL_ROWS())
  const [myGender, setMyGender] = useState<'male' | 'female'>(prefillGender)
  const [myBirthYear, setMyBirthYear] = useState('')
  const [myBirthMonth, setMyBirthMonth] = useState('')
  const [myBirthDay, setMyBirthDay] = useState('')
  const [mySijinIdx, setMySijinIdx] = useState<number | null>(null)
  const [myBirthDateOpen, setMyBirthDateOpen] = useState(false)
  const [myTimeOpen, setMyTimeOpen] = useState(false)
  const myBirthRef = useRef<HTMLDivElement>(null)
  const myTimeRef = useRef<HTMLDivElement>(null)

  // ── 상대방 정보 ──
  const partnerRowCounter = useRef(3)
  const [partnerRows, setPartnerRows] = useState<NameRow[]>(INITIAL_ROWS())
  const [partnerGender, setPartnerGender] = useState<'male' | 'female'>('female')
  const [partnerBirthYear, setPartnerBirthYear] = useState('')
  const [partnerBirthMonth, setPartnerBirthMonth] = useState('')
  const [partnerBirthDay, setPartnerBirthDay] = useState('')
  const [partnerSijinIdx, setPartnerSijinIdx] = useState<number | null>(null)
  const [partnerBirthDateOpen, setPartnerBirthDateOpen] = useState(false)
  const [partnerTimeOpen, setPartnerTimeOpen] = useState(false)
  const partnerBirthRef = useRef<HTMLDivElement>(null)
  const partnerTimeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (myBirthRef.current && !myBirthRef.current.contains(e.target as Node)) setMyBirthDateOpen(false)
      if (myTimeRef.current && !myTimeRef.current.contains(e.target as Node)) setMyTimeOpen(false)
      if (partnerBirthRef.current && !partnerBirthRef.current.contains(e.target as Node)) setPartnerBirthDateOpen(false)
      if (partnerTimeRef.current && !partnerTimeRef.current.contains(e.target as Node)) setPartnerTimeOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // 내 이름 계산
  const myInputName = myRows.map(r => r.syllable).filter(Boolean).join('')
  const myHanjaIds = myRows.flatMap(r => r.selected && !r.selected.id.startsWith('manual-') ? [r.selected.id] : [])
  const myExtraHanja = myRows.flatMap(r => r.selected?.id.startsWith('manual-') ? [{ character: r.selected.character, reading: r.selected.reading, meaning: r.selected.meaning }] : [])
  const myAllHanja = myRows.map((r, idx) => r.selected ? { pos: idx, character: r.selected.character, reading: r.selected.reading, meaning: r.selected.meaning } : null).filter(Boolean)
  const myBirthFormatted = (myBirthYear && myBirthMonth && myBirthDay) ? `${myBirthYear}.${myBirthMonth}.${myBirthDay}` : ''
  const myBirthForApi = myBirthFormatted ? (mySijinIdx !== null ? `${myBirthFormatted} ${SIJIN[mySijinIdx].apiTime}` : myBirthFormatted) : ''
  const myBirthDisplay = (myBirthYear && myBirthMonth && myBirthDay) ? `${myBirthYear}. ${parseInt(myBirthMonth)}. ${parseInt(myBirthDay)}` : null
  const myTimeDisplay = mySijinIdx === null ? '시간 모름' : SIJIN[mySijinIdx].label
  const myCanProceed = myInputName.trim().length > 0 && !!(myBirthYear && myBirthMonth && myBirthDay)

  // 상대방 이름 계산
  const partnerInputName = partnerRows.map(r => r.syllable).filter(Boolean).join('')
  const partnerHanjaIds = partnerRows.flatMap(r => r.selected && !r.selected.id.startsWith('manual-') ? [r.selected.id] : [])
  const partnerExtraHanja = partnerRows.flatMap(r => r.selected?.id.startsWith('manual-') ? [{ character: r.selected.character, reading: r.selected.reading, meaning: r.selected.meaning }] : [])
  const partnerAllHanja = partnerRows.map((r, idx) => r.selected ? { pos: idx, character: r.selected.character, reading: r.selected.reading, meaning: r.selected.meaning } : null).filter(Boolean)
  const partnerBirthFormatted = (partnerBirthYear && partnerBirthMonth && partnerBirthDay) ? `${partnerBirthYear}.${partnerBirthMonth}.${partnerBirthDay}` : ''
  const partnerBirthForApi = partnerBirthFormatted ? (partnerSijinIdx !== null ? `${partnerBirthFormatted} ${SIJIN[partnerSijinIdx].apiTime}` : partnerBirthFormatted) : ''
  const partnerBirthDisplay = (partnerBirthYear && partnerBirthMonth && partnerBirthDay) ? `${partnerBirthYear}. ${parseInt(partnerBirthMonth)}. ${parseInt(partnerBirthDay)}` : null
  const partnerTimeDisplay = partnerSijinIdx === null ? '시간 모름' : SIJIN[partnerSijinIdx].label
  const partnerCanProceed = partnerInputName.trim().length > 0 && !!(partnerBirthYear && partnerBirthMonth && partnerBirthDay)

  const handleGoToPreview = () => {
    const myH = hasPrefill ? prefillHanja : myAllHanja
    const myN = hasPrefill ? prefillName : myInputName
    const myB = hasPrefill ? prefillBirth : myBirthForApi
    const myG = hasPrefill ? prefillGender : myGender
    const myIds = hasPrefill ? [] : myHanjaIds
    const myExtra = hasPrefill ? [] : myExtraHanja

    const params = new URLSearchParams({
      myName: myN,
      myBirth: myB,
      myGender: myG,
      myHanja: btoa(unescape(encodeURIComponent(JSON.stringify(myH)))),
      myIds: myIds.join(','),
      myExtra: btoa(unescape(encodeURIComponent(JSON.stringify(myExtra)))),
      partnerName: partnerInputName,
      partnerBirth: partnerBirthForApi,
      partnerGender,
      partnerHanja: btoa(unescape(encodeURIComponent(JSON.stringify(partnerAllHanja)))),
      partnerIds: partnerHanjaIds.join(','),
      partnerExtra: btoa(unescape(encodeURIComponent(JSON.stringify(partnerExtraHanja)))),
      relationType,
    })
    router.push(`/compat/preview?${params.toString()}`)
  }

  const inputStyle = {
    width: '100%', background: '#fff',
    border: '1.5px solid #e8ddd4',
    borderRadius: 14, padding: '13px 14px',
    cursor: 'pointer', textAlign: 'left' as const, fontFamily,
    transition: 'border-color 0.15s', boxSizing: 'border-box' as const,
  }

  const renderDatePicker = (
    open: boolean, setOpen: (v: boolean) => void, ref: React.RefObject<HTMLDivElement>,
    year: string, setYear: (v: string) => void,
    month: string, setMonth: (v: string) => void,
    day: string, setDay: (v: string) => void,
    display: string | null,
  ) => (
    <div style={{ position: 'relative' }} ref={ref}>
      <button onClick={() => setOpen(!open)} style={inputStyle}>
        <div style={{ fontSize: 11, color: '#8a7060', marginBottom: 4 }}>생년월일</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: display ? '#2A1A0E' : '#B0A090' }}>
          {display ?? '생년월일 선택'}
        </div>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, background: '#fff', borderRadius: 14, border: '1.5px solid #e8ddd4', padding: 14, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <select value={year} onChange={e => setYear(e.target.value)} style={{ width: '100%', background: '#F5F0EB', border: '1.5px solid #e8ddd4', borderRadius: 10, padding: '11px 12px', fontSize: 14, color: '#2A1A0E', outline: 'none', marginBottom: 8, fontFamily }}>
            <option value="">년도 선택</option>
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <select value={month} onChange={e => setMonth(e.target.value)} style={{ background: '#F5F0EB', border: '1.5px solid #e8ddd4', borderRadius: 10, padding: '11px 10px', fontSize: 14, color: '#2A1A0E', outline: 'none', fontFamily }}>
              <option value="">월</option>
              {MONTHS.map(m => <option key={m} value={m}>{parseInt(m)}월</option>)}
            </select>
            <select value={day} onChange={e => setDay(e.target.value)} style={{ background: '#F5F0EB', border: '1.5px solid #e8ddd4', borderRadius: 10, padding: '11px 10px', fontSize: 14, color: '#2A1A0E', outline: 'none', fontFamily }}>
              <option value="">일</option>
              {DAYS.map(d => <option key={d} value={d}>{parseInt(d)}일</option>)}
            </select>
          </div>
          {year && month && day && (
            <button onClick={() => setOpen(false)} style={{ width: '100%', background: '#E07A3A', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily }}>확인</button>
          )}
        </div>
      )}
    </div>
  )

  const renderTimePicker = (
    open: boolean, setOpen: (v: boolean) => void, ref: React.RefObject<HTMLDivElement>,
    sijinIdx: number | null, setSijinIdx: (v: number | null) => void,
    display: string,
  ) => (
    <div style={{ position: 'relative' }} ref={ref}>
      <button onClick={() => setOpen(!open)} style={inputStyle}>
        <div style={{ fontSize: 11, color: '#8a7060', marginBottom: 4 }}>시간</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#2A1A0E' }}>{display}</div>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#fff', borderRadius: 14, border: '1.5px solid #e8ddd4', zIndex: 50, overflow: 'hidden', width: 260, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          <button onClick={() => { setSijinIdx(null); setOpen(false) }} style={{ width: '100%', padding: '13px 14px', textAlign: 'left', border: 'none', borderBottom: '1px solid #F5F0EB', cursor: 'pointer', background: sijinIdx === null ? '#E07A3A' : '#fff', color: sijinIdx === null ? '#fff' : '#2A1A0E', fontSize: 13, fontWeight: 700, fontFamily }}>시간 모름</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {SIJIN.map((s, i) => (
              <button key={i} onClick={() => { setSijinIdx(i); setOpen(false) }} style={{ padding: '12px 14px', textAlign: 'left', border: 'none', borderBottom: '1px solid #F5F0EB', cursor: 'pointer', fontFamily, background: sijinIdx === i ? '#E07A3A' : '#fff', transition: 'background 0.1s' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: sijinIdx === i ? '#fff' : '#2A1A0E' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: sijinIdx === i ? 'rgba(255,255,255,0.75)' : '#8a7060', marginTop: 1 }}>{s.range}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderGenderToggle = (value: 'male' | 'female', onChange: (v: 'male' | 'female') => void) => (
    <div style={{ display: 'flex', background: '#F5F0EB', borderRadius: 12, padding: 4, gap: 4 }}>
      {(['male', 'female'] as const).map(g => (
        <button key={g} onClick={() => onChange(g)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily, fontSize: 14, fontWeight: 700, transition: 'all 0.15s', background: value === g ? '#fff' : 'transparent', color: value === g ? '#2A1A0E' : '#8a7060', boxShadow: value === g ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
          {g === 'male' ? '남성' : '여성'}
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ background: '#1A0F07', minHeight: '100vh', fontFamily }}>

      {/* 히어로 */}
      <div style={{ padding: '52px 24px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#2e1e0e', border: '1px solid #5a3820', color: '#C4956A', fontSize: 11, letterSpacing: '0.1em', padding: '5px 16px', borderRadius: 20, marginBottom: 18 }}>
          ✦ 이름 궁합 분석
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.45, marginBottom: 10 }}>
          두 사람의 이름에 담긴<br />
          <span style={{ color: '#E07A3A' }}>기운의 조화</span>를 풀어드립니다
        </h1>
        <p style={{ fontSize: 13, color: '#8a6a50', lineHeight: 1.7 }}>
          이름 한자와 사주를 함께 분석해<br />두 사람의 궁합을 도출합니다
        </p>
      </div>

      {/* 관계 유형 선택 */}
      <div style={{ padding: '0 18px 16px' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {RELATION_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setRelationType(opt.value as any)} style={{ flex: 1, padding: '10px 0', borderRadius: 24, border: 'none', cursor: 'pointer', fontFamily, fontSize: 13, fontWeight: 700, transition: 'all 0.15s', background: relationType === opt.value ? '#E07A3A' : 'rgba(255,255,255,0.08)', color: relationType === opt.value ? '#fff' : '#8a7060' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 폼 바텀시트 */}
      <div style={{ background: '#F5F0EB', borderRadius: '28px 28px 0 0', padding: '28px 18px 140px', minHeight: '60vh' }}>

        {/* Step 인디케이터 */}
        {!hasPrefill && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
            {[1, 2].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: step === s ? '#E07A3A' : step > s ? '#E07A3A' : '#e8ddd4', color: step >= s ? '#fff' : '#8a7060', transition: 'all 0.2s' }}>
                  {step > s ? '✓' : s}
                </div>
                <span style={{ fontSize: 12, color: step === s ? '#E07A3A' : '#8a7060', fontWeight: step === s ? 700 : 400 }}>
                  {s === 1 ? '내 정보' : '상대방 정보'}
                </span>
                {s === 1 && <div style={{ width: 24, height: 1, background: '#e8ddd4' }} />}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1: 내 정보 ── */}
        {!hasPrefill && step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2A1A0E', marginBottom: 4 }}>나의 정보</div>

            {renderGenderToggle(myGender, setMyGender)}

            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 12px' }}>
              <p style={{ fontSize: 11, color: '#8a7060', marginBottom: 10 }}>이름 한자</p>
              <HanjaSelector rows={myRows} onUpdate={(id, patch) => setMyRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))} onAddRow={() => { if (myRows.length >= 5) return; const id = `my${++myRowCounter.current}`; setMyRows(prev => [...prev, { id, query: '', syllable: '', selected: null }]) }} onRemoveRow={id => setMyRows(prev => prev.filter(r => r.id !== id))} labels={ROW_LABELS} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {renderDatePicker(myBirthDateOpen, setMyBirthDateOpen, myBirthRef as any, myBirthYear, setMyBirthYear, myBirthMonth, setMyBirthMonth, myBirthDay, setMyBirthDay, myBirthDisplay)}
              {renderTimePicker(myTimeOpen, setMyTimeOpen, myTimeRef as any, mySijinIdx, setMySijinIdx, myTimeDisplay)}
            </div>

            <p style={{ fontSize: 11, color: '#8a7060', marginTop: -8 }}>양력 기준. 시간 입력 시 시주까지 계산됩니다.</p>

            <a href="/" style={{ fontSize: 12, color: '#8a7060', textAlign: 'center', display: 'block', marginTop: 4 }}>
              내 이름만 풀이받기 →
            </a>
          </div>
        )}

        {/* ── Step 2: 상대방 정보 (또는 pre-fill일 때 바로 표시) ── */}
        {(step === 2 || hasPrefill) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {hasPrefill && (
              <div style={{ background: 'rgba(224,122,58,0.08)', borderRadius: 12, padding: '12px 14px', marginBottom: 4 }}>
                <p style={{ fontSize: 11, color: '#E07A3A', fontWeight: 700, marginBottom: 2 }}>내 정보 (이미 입력됨)</p>
                <p style={{ fontSize: 13, color: '#2A1A0E', fontWeight: 600 }}>{prefillName} · {prefillBirth?.split(' ')[0]}</p>
              </div>
            )}

            <div style={{ fontSize: 14, fontWeight: 700, color: '#2A1A0E', marginBottom: 4 }}>상대방 정보</div>

            {renderGenderToggle(partnerGender, setPartnerGender)}

            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 12px' }}>
              <p style={{ fontSize: 11, color: '#8a7060', marginBottom: 10 }}>이름 한자</p>
              <HanjaSelector rows={partnerRows} onUpdate={(id, patch) => setPartnerRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))} onAddRow={() => { if (partnerRows.length >= 5) return; const id = `pt${++partnerRowCounter.current}`; setPartnerRows(prev => [...prev, { id, query: '', syllable: '', selected: null }]) }} onRemoveRow={id => setPartnerRows(prev => prev.filter(r => r.id !== id))} labels={ROW_LABELS} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {renderDatePicker(partnerBirthDateOpen, setPartnerBirthDateOpen, partnerBirthRef as any, partnerBirthYear, setPartnerBirthYear, partnerBirthMonth, setPartnerBirthMonth, partnerBirthDay, setPartnerBirthDay, partnerBirthDisplay)}
              {renderTimePicker(partnerTimeOpen, setPartnerTimeOpen, partnerTimeRef as any, partnerSijinIdx, setPartnerSijinIdx, partnerTimeDisplay)}
            </div>

            <p style={{ fontSize: 11, color: '#8a7060', marginTop: -8 }}>양력 기준. 시간 입력 시 시주까지 계산됩니다.</p>

            {!hasPrefill && (
              <button onClick={() => setStep(1)} style={{ fontSize: 12, color: '#8a7060', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', fontFamily }}>
                ← 내 정보 수정하기
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#F5F0EB', padding: '12px 18px 24px', zIndex: 50 }}>
        <div style={{ maxWidth: 390, margin: '0 auto' }}>
          {!hasPrefill && step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!myCanProceed}
              style={{ width: '100%', background: myCanProceed ? '#E07A3A' : '#ccc', color: '#fff', border: 'none', borderRadius: 14, padding: 17, fontSize: 16, fontWeight: 700, cursor: myCanProceed ? 'pointer' : 'not-allowed', fontFamily, opacity: myCanProceed ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <span>다음 — 상대방 정보 입력</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : (
            <button
              onClick={handleGoToPreview}
              disabled={!partnerCanProceed}
              style={{ width: '100%', background: partnerCanProceed ? '#E07A3A' : '#ccc', color: '#fff', border: 'none', borderRadius: 14, padding: 17, fontSize: 16, fontWeight: 700, cursor: partnerCanProceed ? 'pointer' : 'not-allowed', fontFamily, opacity: partnerCanProceed ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <span>궁합 미리보기</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CompatPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1A0F07', minHeight: '100vh' }} />}>
      <CompatPageInner />
    </Suspense>
  )
}
