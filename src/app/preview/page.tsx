import { calculateSaju, getElementFromReading, GANJIBRANCH } from '@/lib/saju'
import type { DaeunCycle } from '@/lib/saju'
import { calcNameScore, scoreToPercentile } from '@/lib/name-score'
import { getDaeunPhrase } from '@/lib/daeun-phrase'
import { createServiceClient } from '@/lib/supabase/server'
import type { Gender } from '@gracefullight/saju'
import { PaymentButtonPreview } from '@/components/payment/PaymentButtonPreview'

interface SelectedHanja {
  pos: number
  character: string
  reading: string
  meaning: string
}

interface ExtraHanja {
  character: string
  reading: string
  meaning: string
}

function decodeB64(str: string) {
  return JSON.parse(Buffer.from(str, 'base64').toString('utf-8'))
}

const OHAENG_ELEMENTS = ['木', '火', '土', '金', '水'] as const

const ELEMENT_COLOR: Record<string, string> = {
  木: '#4a9a5c', 火: '#E07A3A', 土: '#c4a030', 金: '#aaa', 水: '#378ADD',
}

const ELEMENT_ICON: Record<string, string> = {
  木: '🌲', 火: '🔥', 土: '⛰️', 金: '🪙', 水: '💧',
}

const ELEMENT_LABEL: Record<string, string> = {
  木: '목(木)', 火: '화(火)', 土: '토(土)', 金: '금(金)', 水: '수(水)',
}

const ELEMENT_BAR_BG: Record<string, string> = {
  木: '#4CAF50', 火: '#EF5350', 土: '#FF9800', 金: '#9E9E9E', 水: '#2196F3',
}

const WEAKEST_ADVICE: Record<string, string> = {
  木: '목(木) 기운이 가장 부족합니다. 식물 키우기, 자연 속 산책, 나무 소품 두기가 도움이 됩니다.',
  火: '화(火) 기운이 가장 부족합니다. 붉은 소품, 따뜻한 조명, 남쪽 방향 활동이 도움이 됩니다.',
  土: '토(土) 기운이 가장 부족합니다. 황토·도자기 소품, 중심 잡는 생활 루틴이 도움이 됩니다.',
  金: '금(金) 기운이 가장 부족합니다. 흰색·금속 소품, 서쪽 방향 활동이 도움이 됩니다.',
  水: '수(水) 기운이 가장 부족합니다. 물 가까운 공간, 파란 소품, 북쪽 방향 활동이 도움이 됩니다.',
}

const HANJA_CHIP_STYLE = [
  { bg: '#F5F0EB', text: '#2A1A0E' },
  { bg: '#E6F1FB', text: '#185FA5' },
  { bg: '#FAECE7', text: '#D85A30' },
  { bg: '#F5F0EB', text: '#8B4513' },
  { bg: '#F0F8F0', text: '#2E7D32' },
]

const SURI_COLORS = ['#D95D39', '#5D739D', '#3D8C5F', '#B8832A']

function calcActualAge(birth: string): number | null {
  const match = birth.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)
  if (!match) return null
  const bYear = parseInt(match[1])
  const bMonth = parseInt(match[2])
  const bDay = parseInt(match[3])
  const today = new Date()
  let age = today.getFullYear() - bYear
  const monthDiff = today.getMonth() + 1 - bMonth
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bDay)) age--
  return age
}

function splitDaeunCycles(cycles: DaeunCycle[], currentAge: number | null) {
  if (!currentAge || cycles.length === 0) return { pastCount: 0 }
  const currentIdx = cycles.findIndex(c => currentAge >= c.startAge && currentAge <= c.endAge)
  if (currentIdx === -1) {
    const last = cycles[cycles.length - 1]
    if (last && currentAge > last.endAge) return { pastCount: cycles.length }
    return { pastCount: 0 }
  }
  return { pastCount: currentIdx }
}

function getNameTeaserParts(
  yongsinScore: number,
  yongsinLabel: string,
  gisinLabel: string,
  nameOhaeng: { element: string }[],
): { prefix: string; blurred: string; suffix: string } {
  if (nameOhaeng.length === 0) {
    return { prefix: '이름의 기운이', blurred: '사주와 나누는 이야기', suffix: '가 담겨 있습니다.' }
  }
  const elementCount: Record<string, number> = {}
  nameOhaeng.forEach(h => { elementCount[h.element] = (elementCount[h.element] ?? 0) + 1 })
  const dominant = Object.entries(elementCount).sort((a, b) => b[1] - a[1])[0]
  const dominantLabel = dominant ? (ELEMENT_LABEL[dominant[0]] ?? dominant[0]) : yongsinLabel

  if (yongsinScore >= 30) {
    return {
      prefix: `이 이름은 ${yongsinLabel}의 기운을 품어,`,
      blurred: '사주와 깊이 공명하는 흐름',
      suffix: '을 타고 있습니다.',
    }
  } else if (yongsinScore >= 20) {
    return {
      prefix: `이 이름의 ${dominantLabel} 기운이`,
      blurred: '사주와 어떻게 만나는지',
      suffix: '에 따라 삶의 흐름이 달라집니다.',
    }
  } else {
    return {
      prefix: '이 이름의',
      blurred: `${gisinLabel} 기운과 사주의 이야기`,
      suffix: '가 이 사람의 길을 독특하게 만듭니다.',
    }
  }
}

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; birth?: string; hanja?: string; ids?: string; extra?: string; gender?: string }>
}) {
  const params = await searchParams
  const inputName = params.name ?? ''
  const birth = params.birth ?? ''
  const hanjaIds = params.ids ? params.ids.split(',').filter(Boolean) : []
  const gender: Gender = params.gender === 'female' ? 'female' : 'male'

  let allSelectedHanja: SelectedHanja[] = []
  let extraHanja: ExtraHanja[] = []
  try {
    if (params.hanja) allSelectedHanja = decodeB64(params.hanja)
    if (params.extra) extraHanja = decodeB64(params.extra)
  } catch { /* ignore */ }

  // 획수 조회 (Supabase)
  let strokeById: Record<string, number> = {}
  if (hanjaIds.length > 0) {
    try {
      const supabase = createServiceClient()
      const { data } = await supabase
        .from('hanja')
        .select('id, stroke')
        .in('id', hanjaIds)
      if (data) data.forEach((h: { id: string; stroke: number }) => { strokeById[h.id] = h.stroke ?? 0 })
    } catch { /* ignore */ }
  }

  // 수리 획수 계산
  const hanjaWithStrokes = allSelectedHanja.map((h, i) => ({
    ...h,
    stroke: strokeById[hanjaIds[i]] ?? 0,
  }))
  const hasStroke = hanjaWithStrokes.length >= 2 && hanjaWithStrokes.every(h => h.stroke > 0)
  const suriGeaksu = hasStroke
    ? (() => {
        const strokes = hanjaWithStrokes.map(h => h.stroke)
        const surname = strokes[0]
        const given = strokes.slice(1)
        return [
          { label: '원격', value: given[0] ?? 0,                      desc: '선천적 자질', color: SURI_COLORS[0] },
          { label: '형격', value: surname + (given[0] ?? 0),           desc: '청년 운',    color: SURI_COLORS[1] },
          { label: '이격', value: given.reduce((a, b) => a + b, 0),    desc: '중년 운',    color: SURI_COLORS[2] },
          { label: '정격', value: strokes.reduce((a, b) => a + b, 0),  desc: '총체 운',    color: SURI_COLORS[3] },
        ]
      })()
    : null

  const saju = birth ? await calculateSaju(birth, gender).catch(() => null) : null

  const nameOhaeng = allSelectedHanja.map(h => ({
    character: h.character,
    reading: h.reading,
    element: getElementFromReading(h.reading),
  }))

  const nameScore = allSelectedHanja.length > 0 && saju ? calcNameScore({
    nameOhaeng,
    yongsin: saju.yongsin,
    gisin: saju.gisin,
    meanings: allSelectedHanja.map(h => h.meaning),
  }) : null

  const elements = saju ? (saju.elements as unknown as Record<string, number>) : null
  const totalElCount = elements
    ? OHAENG_ELEMENTS.reduce((s, el) => s + (elements[el] ?? 0), 0)
    : 0

  // 현재 나이 & 대운
  const currentAge = birth ? calcActualAge(birth) : null
  const daeunCycles = saju?.daeun.cycles ?? []
  const { pastCount } = splitDaeunCycles(daeunCycles, currentAge)

  // 가장 부족한 오행
  const weakestEl = elements
    ? OHAENG_ELEMENTS.reduce((min, el) =>
        (elements[el] ?? 0) < (elements[min] ?? 0) ? el : min
      , OHAENG_ELEMENTS[0])
    : null

  // 개인화 티저 문장
  const teaser = nameScore && saju
    ? getNameTeaserParts(nameScore.yongsinScore, saju.yongsinLabel, saju.gisinLabel, nameOhaeng)
    : null

  const currentYear = new Date().getFullYear()

  return (
    <main className="ethereal-gradient min-h-screen">
      {/* 배경 블러 장식 */}
      <div className="fixed top-[-10%] right-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(120px)' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(93,115,157,0.08)', filter: 'blur(120px)' }} />

      <div className="relative z-10 max-w-[480px] mx-auto px-4 pt-6 pb-44 space-y-3">

        {/* ── 2. 다크 히어로 카드 ── */}
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(150deg, #1E1A18 0%, #3D2010 60%, #1E1A18 100%)' }}
        >
          <div className="absolute top-[-40px] right-[-40px] w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'rgba(217,93,57,0.12)' }} />
          <div className="absolute bottom-[-30px] left-[-20px] w-24 h-24 rounded-full pointer-events-none"
            style={{ background: 'rgba(93,115,157,0.15)' }} />

          <div className="relative flex justify-between items-center mb-4">
            <span className="text-[10px] tracking-[2px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
              ✦ 이름 운세 분석
            </span>
            {birth && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{birth.split(' ')[0]}</span>}
          </div>

          <div className="relative mb-4">
            <div className="flex items-baseline gap-3 mb-1">
              <h1 className="text-4xl font-black text-white tracking-[-1px]">{inputName}</h1>
              {allSelectedHanja.length > 0 && (
                <span className="text-xl font-light tracking-[4px]" style={{ color: '#D95D39' }}>
                  {allSelectedHanja.map(h => h.character).join('')}
                </span>
              )}
            </div>
            {allSelectedHanja.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {allSelectedHanja.map((h, i) => (
                  <span key={i} className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: 4 }}>·</span>}
                    {h.meaning} {h.reading}
                  </span>
                ))}
              </div>
            )}
          </div>

          {nameScore && (
            <div className="relative grid gap-2 mb-4" style={{ gridTemplateColumns: 'auto 1fr' }}>
              <div className="rounded-2xl px-4 py-3 min-w-[88px]" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="text-[10px] font-bold tracking-[1px] mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  종합 점수
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black leading-none" style={{ color: '#D95D39' }}>
                    {nameScore.total}
                  </span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>/100</span>
                </div>
                <div className="mt-2 rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(0,0,0,0.3)' }}>
                  <div className="h-full rounded-full" style={{ width: `${nameScore.total}%`, background: '#D95D39' }} />
                </div>
                <div className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {scoreToPercentile(nameScore.total)}
                </div>
              </div>
              {teaser && (
                <div className="rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div className="text-[10px] font-bold tracking-[1px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    이름 총평
                  </div>
                  <p className="text-sm font-medium text-white leading-snug">
                    {teaser.prefix}{' '}
                    <span className="blur-sm select-none pointer-events-none" aria-hidden>{teaser.blurred}</span>
                    {teaser.suffix}
                  </p>
                </div>
              )}
            </div>
          )}

          {saju && elements && (
            <div className="relative flex gap-1.5">
              {OHAENG_ELEMENTS.map(el => {
                const count = elements[el] ?? 0
                const pct = totalElCount > 0 ? Math.round((count / totalElCount) * 100) : 20
                return (
                  <div key={el} className="flex-1 rounded-xl py-2 px-1 text-center"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="text-sm mb-1">{ELEMENT_ICON[el]}</div>
                    <div className="text-[10px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{el}</div>
                    <div className="rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(0,0,0,0.2)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 4)}%`, background: ELEMENT_COLOR[el] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 3. 글자별 한자 풀이 ── */}
        {allSelectedHanja.length > 0 && (
          <GlassCard>
            <SectionHeader>글자별 한자 풀이</SectionHeader>
            <div className="space-y-3">
              {allSelectedHanja.map((h, i) => {
                const chip = HANJA_CHIP_STYLE[i % HANJA_CHIP_STYLE.length]
                const placeholderDesc = `${h.character}이 품은 ${h.meaning}의 기운은 이 이름에 깊은 흔적을 남기며, 사주와 어우러져 독특한 운명의 패턴을 만들어냅니다.`
                return (
                  <div key={i} className="flex gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-medium shrink-0"
                      style={{ background: chip.bg, color: chip.text }}>
                      {h.character}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#2D2926] mb-1">{h.reading} · {h.meaning}</div>
                      <p className="blur-sm select-none pointer-events-none text-xs text-[#6D6661] leading-relaxed" aria-hidden>
                        {placeholderDesc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )}

        {/* ── 4. 수리 획수 분석 ── */}
        {suriGeaksu && (
          <GlassCard>
            <SectionHeader>수리 획수 분석</SectionHeader>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {suriGeaksu.map(item => (
                <div key={item.label} className="rounded-xl py-2.5 px-1 text-center"
                  style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-[10px] text-[#6D6661] mt-1">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.04)' }}>
              <p className="blur-sm select-none pointer-events-none text-xs text-[#6D6661] leading-relaxed" aria-hidden>
                형격 {suriGeaksu[1].value}수는 대인관계와 사회적 활동의 방향성을 나타냅니다. 정격 {suriGeaksu[3].value}수는 평생을 관통하는 총체적 운명의 패턴을 보여줍니다.
              </p>
            </div>
          </GlassCard>
        )}

        {/* ── 5. 오행 분석 ── */}
        {saju && elements && (
          <GlassCard>
            <SectionHeader>오행 분석</SectionHeader>
            <div className="space-y-2 mb-3">
              {OHAENG_ELEMENTS.map(el => {
                const count = elements[el] ?? 0
                const pct = totalElCount > 0 ? Math.round((count / totalElCount) * 100) : 20
                return (
                  <div key={el} className="flex items-center gap-2">
                    <span className="text-xs text-[#6D6661] w-9">{ELEMENT_ICON[el]} {el}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ELEMENT_BAR_BG[el] }} />
                    </div>
                    <span className="text-[11px] text-[#6D6661] w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-[#6D6661] border-t pt-2 mb-0"
              style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <span>용신 <strong className="text-[#2D2926]">{saju.yongsinLabel}</strong></span>
              <span>기신 <strong className="text-[#2D2926]">{saju.gisinLabel}</strong></span>
            </div>
            {weakestEl && (
              <div className="mt-3 rounded-xl p-3 text-xs leading-relaxed"
                style={{ background: 'rgba(217,93,57,0.07)', borderLeft: '3px solid #D95D39', color: '#6D6661' }}>
                {WEAKEST_ADVICE[weakestEl]}
              </div>
            )}
          </GlassCard>
        )}

        {/* ── 6. 대운표 ── */}
        {saju && daeunCycles.length > 0 && (
          <GlassCard>
            <SectionHeader>대운표 · 10년 주기</SectionHeader>
            <div>
              {daeunCycles.map((cycle, i) => {
                const isCurrent = i === pastCount
                const phrase = getDaeunPhrase(cycle.gan, cycle.ji)
                return (
                  <div key={i} className="flex items-center gap-3 py-2"
                    style={{ borderBottom: i < daeunCycles.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                    {/* 왼쪽: 나이대 + 간지 */}
                    <div className="shrink-0 w-20">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[11px]" style={{ color: isCurrent ? '#D95D39' : '#9D9690', fontWeight: isCurrent ? 700 : 400 }}>
                          {cycle.startAge}~{cycle.endAge}세
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full text-white" style={{ background: '#D95D39' }}>현재</span>
                        )}
                      </div>
                      <span className="text-base font-bold tracking-wide" style={{ color: isCurrent ? '#D95D39' : '#2D2926' }}>
                        {cycle.gan}{cycle.ji}
                      </span>
                    </div>
                    {/* 오른쪽: 설명 (블러) */}
                    <p className="blur-sm select-none pointer-events-none text-xs text-[#6D6661] leading-relaxed flex-1" aria-hidden>
                      {phrase}
                    </p>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )}

        {/* ── 7. AI 전체 해석 unlock-wall ── */}
        <div className="relative rounded-2xl overflow-hidden">
          <div
            className="rounded-2xl p-5 border border-white/40"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              filter: 'blur(3px)',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            <SectionHeader>{currentYear}년 상세 운세</SectionHeader>
            <p className="text-sm text-[#2D2926] leading-relaxed mb-3">
              {currentYear}년은 강렬한 기운이 넘치는 해로, 이 이름의 오행과 정면으로 마주하는 큰 변화와 결단의 시기입니다.
              {allSelectedHanja[0] ? ` ${allSelectedHanja[0].character}은 외부의 급격한 변화 속에서 내면의 중심을 잃지 않도록 닻의 역할을 합니다.` : ''}
            </p>
            <SectionHeader>이름 × 사주 조화 분석</SectionHeader>
            <p className="text-sm text-[#2D2926] leading-relaxed mb-3">
              이름이 지닌 오행 기운이 사주의 용신·기신과 어떻게 공명하는지 깊이 분석합니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['성격 · 기질 분석', '직업 · 재물 운', '대인관계 · 연애', `${currentYear}년 운세`, '이름 개운법', '종합 총평'].map(item => (
                <div key={item} className="rounded-xl px-3 py-2 text-xs text-[#6D6661]"
                  style={{ background: 'rgba(0,0,0,0.04)' }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: 'rgba(252,249,247,0.78)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: '#2D2926' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3.5" y="7" width="9" height="7.5" rx="1.5" fill="white" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-[#2D2926]">전체 해석 열람하기</div>
            <div className="text-xs text-[#6D6661] text-center leading-relaxed">
              성격 · 직업·재물 · 관계 분석 포함<br />결제 후 즉시 공개
            </div>
          </div>
        </div>

        {/* ── 8. 개인화 배너 ── */}
        {birth && inputName && (
          <div className="rounded-2xl p-3 border border-white/40 text-center text-xs text-[#6D6661] leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
            이 분석은 <strong className="text-[#2D2926]">{birth.split(' ')[0]}생, {inputName}님</strong>만을 위해 생성된 결과입니다
          </div>
        )}

        {/* ── 9. 전체 해석 포함 내용 리스트 ── */}
        <GlassCard>
          <SectionHeader>전체 해석에 포함된 내용</SectionHeader>
          <ul className="space-y-2.5">
            {[
              { icon: '🔢', label: '수리 획수 완전 해석', desc: '원격·형격·이격·정격 풀이' },
              { icon: '🌊', label: '10년 단위 대운 흐름 전체', desc: '지금 이후의 모든 사이클' },
              { icon: '☯️', label: '이름 × 사주 조화 분석', desc: '이름이 사주를 보완하는 방식' },
              { icon: '🪞', label: '성격 · 기질 분석', desc: '타고난 성향과 강점' },
              { icon: '💰', label: '직업 · 재물 운', desc: '잘 맞는 직종과 재물 흐름' },
              { icon: '✨', label: '이름 개운법', desc: '이름의 부족한 기운을 채우는 법' },
            ].map(item => (
              <li key={item.label} className="flex items-center gap-3">
                <span className="text-base w-6 text-center shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-[#2D2926]">{item.label}</span>
                  <span className="text-xs text-[#9D9690] ml-2">{item.desc}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(217,93,57,0.1)', color: '#D95D39' }}>포함</span>
              </li>
            ))}
          </ul>
        </GlassCard>

      </div>

      {/* ── Sticky 하단 결제 CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #FCF9F7 55%, transparent)' }}>
        <div className="max-w-[480px] mx-auto px-4 pb-6 pt-8 pointer-events-auto">
          <PaymentButtonPreview
            inputName={inputName}
            hanjaIds={hanjaIds}
            extraHanja={extraHanja}
            birthDate={birth}
            gender={gender}
          />
        </div>
      </div>
    </main>
  )
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 border border-white/40"
      style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-1 h-5 rounded-full shrink-0"
        style={{ background: 'linear-gradient(to bottom, #D95D39, #F28C6A)' }} />
      <h2 className="text-base font-bold text-[#2D2926]">{children}</h2>
    </div>
  )
}
