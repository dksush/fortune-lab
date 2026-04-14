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
    <main style={{ background: '#F5F0EB', minHeight: '100vh' }} className="relative overflow-x-hidden">
      <div className="max-w-md mx-auto px-4 pt-6 pb-44">

        {/* ── 1. 앱 헤더 ── */}
        <div className="flex justify-between items-center mb-5">
          <span style={{ fontSize: 14, fontWeight: 600, color: '#2A1A0E' }}>이름 운세 분석</span>
          {birth && <span style={{ fontSize: 12, color: '#888' }}>{birth.split(' ')[0]}</span>}
        </div>

        {/* ── 2. 다크 히어로 카드 ── */}
        <div style={{ background: '#2A1A0E', borderRadius: 16, padding: 20, marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: '#C4956A', letterSpacing: '0.08em', marginBottom: 8 }}>
            이름 운세 분석
          </p>

          <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '0.05em', marginBottom: 2 }}>
            {inputName}
          </div>
          {allSelectedHanja.length > 0 && (
            <div style={{ fontSize: 16, color: '#C4956A', marginBottom: 16, letterSpacing: '0.1em' }}>
              {allSelectedHanja.map(h => h.character).join(' ')}
            </div>
          )}

          {nameScore ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 48, fontWeight: 700, color: '#E07A3A', lineHeight: 1 }}>
                  {nameScore.total}
                </span>
                <span style={{ fontSize: 16, color: '#888', marginBottom: 8 }}>/100</span>
              </div>
              <div style={{ height: 4, background: '#3a2a1a', borderRadius: 2, width: '100%', marginBottom: 6 }}>
                <div style={{ height: 4, background: '#E07A3A', borderRadius: 2, width: `${nameScore.total}%` }} />
              </div>
              <p style={{ fontSize: 12, color: '#E07A3A' }}>{scoreToPercentile(nameScore.total)}</p>
            </>
          ) : (
            <div style={{ height: 4, background: '#3a2a1a', borderRadius: 2, width: '100%', marginBottom: 6 }} />
          )}

          {teaser && (
            <div style={{ borderTop: '1px solid #3a2a1a', marginTop: 14, paddingTop: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', lineHeight: 1.6 }}>
                {teaser.prefix}{' '}
                <span className="blur-sm select-none pointer-events-none" aria-hidden>
                  {teaser.blurred}
                </span>
                {teaser.suffix}
              </p>
            </div>
          )}

          {saju && elements && (
            <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
              {OHAENG_ELEMENTS.map(el => {
                const count = elements[el] ?? 0
                const pct = totalElCount > 0 ? Math.round((count / totalElCount) * 100) : 20
                return (
                  <div key={el} style={{ flex: 1, background: '#3a2a1a', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
                    <span style={{ fontSize: 16, display: 'block', marginBottom: 3 }}>{ELEMENT_ICON[el]}</span>
                    <span style={{ fontSize: 13, color: '#C4956A' }}>{el}</span>
                    <div style={{ height: 2, background: ELEMENT_COLOR[el], width: `${Math.max(pct, 4)}%`, borderRadius: 1, marginTop: 5 }} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 3. 글자별 한자 풀이 ── */}
        {allSelectedHanja.length > 0 && (
          <SectionCard>
            <SectionLabel>글자별 한자 풀이</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allSelectedHanja.map((h, i) => {
                const chip = HANJA_CHIP_STYLE[i % HANJA_CHIP_STYLE.length]
                const placeholderDesc = `${h.character}이 품은 ${h.meaning}의 기운은 이 이름에 깊은 흔적을 남기며, 사주와 어우러져 독특한 운명의 패턴을 만들어냅니다.`
                return (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 44, height: 44, background: chip.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 500, color: chip.text, flexShrink: 0 }}>
                      {h.character}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#2A1A0E', marginBottom: 3 }}>
                        {h.reading} · {h.meaning}
                      </div>
                      <p className="blur-sm select-none pointer-events-none" style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }} aria-hidden>
                        {placeholderDesc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* ── 4. 수리 획수 분석 ── */}
        {suriGeaksu && (
          <SectionCard>
            <SectionLabel>수리 획수 분석</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
              {suriGeaksu.map(item => (
                <div key={item.label} style={{ background: '#F5F0EB', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#F5F0EB', borderRadius: 8, padding: '10px 12px' }}>
              <p className="blur-sm select-none pointer-events-none" style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }} aria-hidden>
                형격 {suriGeaksu[1].value}수는 대인관계와 사회적 활동의 방향성을 나타냅니다. 정격 {suriGeaksu[3].value}수는 평생을 관통하는 총체적 운명의 패턴을 보여줍니다.
              </p>
            </div>
          </SectionCard>
        )}

        {/* ── 5. 오행 분석 ── */}
        {saju && elements && (
          <SectionCard>
            <SectionLabel>오행 분석</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {OHAENG_ELEMENTS.map(el => {
                const count = elements[el] ?? 0
                const pct = totalElCount > 0 ? Math.round((count / totalElCount) * 100) : 20
                return (
                  <div key={el} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#444', width: 36 }}>{ELEMENT_ICON[el]} {el}</span>
                    <div style={{ flex: 1, height: 6, background: '#F0EDE8', borderRadius: 3 }}>
                      <div style={{ height: 6, background: ELEMENT_BAR_BG[el], borderRadius: 3, width: `${pct}%` }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#888', width: 30, textAlign: 'right' }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', borderTop: '1px solid #F0EDE8', paddingTop: 8, marginBottom: weakestEl ? 10 : 0 }}>
              <span>용신 <strong style={{ color: '#2A1A0E' }}>{saju.yongsinLabel}</strong></span>
              <span>기신 <strong style={{ color: '#2A1A0E' }}>{saju.gisinLabel}</strong></span>
            </div>
            {weakestEl && (
              <div style={{ background: '#FAECE7', borderLeft: '3px solid #E07A3A', borderRadius: '0 8px 8px 0', padding: '10px 12px', fontSize: 12, color: '#712B13', lineHeight: 1.6 }}>
                {WEAKEST_ADVICE[weakestEl]}
              </div>
            )}
          </SectionCard>
        )}

        {/* ── 6. 대운표 ── */}
        {saju && daeunCycles.length > 0 && (
          <SectionCard>
            <SectionLabel>대운표 · 10년 주기</SectionLabel>

            <div>
              {daeunCycles.map((cycle, i) => {
                const isCurrent = i === pastCount
                const phrase = getDaeunPhrase(cycle.gan, cycle.ji)
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 0',
                      borderBottom: i < daeunCycles.length - 1 ? '1px solid #F0EDE8' : 'none',
                    }}
                  >
                    {/* 왼쪽: 나이대 + 간지 (항상 공개) */}
                    <div style={{ flexShrink: 0, minWidth: 80 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, color: isCurrent ? '#E07A3A' : '#aaa', fontWeight: isCurrent ? 700 : 400 }}>
                          {cycle.startAge}~{cycle.endAge}세
                        </span>
                        {isCurrent && (
                          <span style={{ background: '#E07A3A', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 8, flexShrink: 0 }}>
                            현재
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 17, fontWeight: 700, color: isCurrent ? '#E07A3A' : '#2A1A0E', letterSpacing: '0.05em' }}>
                        {cycle.gan}{cycle.ji}
                      </span>
                    </div>

                    {/* 오른쪽: 설명 (블러 잠금) */}
                    <p
                      className="blur-sm select-none pointer-events-none"
                      style={{ fontSize: 12, color: '#555', lineHeight: 1.6, flex: 1 }}
                      aria-hidden
                    >
                      {phrase}
                    </p>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* ── 7. AI 전체 해석 unlock-wall ── */}
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <div
            style={{ background: '#fff', padding: 16, filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none' }}
            aria-hidden
          >
            <p style={{ fontSize: 11, fontWeight: 600, color: '#C4956A', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 3, height: 13, background: '#E07A3A', borderRadius: 2 }} />
              {currentYear}년 상세 운세
            </p>
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.7, marginBottom: 12 }}>
              {currentYear}년은 강렬한 기운이 넘치는 해로, 이 이름의 오행과 정면으로 마주하는 큰 변화와 결단의 시기입니다.
              {allSelectedHanja[0] ? ` ${allSelectedHanja[0].character}은 외부의 급격한 변화 속에서 내면의 중심을 잃지 않도록 닻의 역할을 합니다.` : ''}
            </p>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#C4956A', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 3, height: 13, background: '#E07A3A', borderRadius: 2 }} />
              이름 × 사주 조화 분석
            </p>
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.7, marginBottom: 12 }}>
              이름이 지닌 오행 기운이 사주의 용신·기신과 어떻게 공명하는지, 어떤 방향으로 작용하는지를 깊이 분석합니다. 이름의 소리와 뜻이 만들어내는 고유한 에너지 패턴을 풀어냅니다.
            </p>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#C4956A', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 3, height: 13, background: '#E07A3A', borderRadius: 2 }} />
              포함 항목
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {['성격 · 기질 분석', `직업 · 재물 운`, '대인관계 · 연애', `${currentYear}년 운세`, '이름 개운법', '종합 총평'].map(item => (
                <div key={item} style={{ background: '#F5F0EB', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#555' }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(245,240,235,0.75)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 32, height: 32, background: '#2A1A0E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3.5" y="7" width="9" height="7.5" rx="1.5" fill="white" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2A1A0E' }}>전체 해석 열람하기</div>
            <div style={{ fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 1.5 }}>
              성격 · 직업·재물 · 관계 분석 포함<br />결제 후 즉시 공개
            </div>
          </div>
        </div>

        {/* ── 8. 개인화 배너 ── */}
        {birth && inputName && (
          <div
            style={{
              background: '#FFF8F3',
              border: '1px solid #F5C4B3',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 12,
              fontSize: 12,
              color: '#712B13',
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            이 분석은{' '}
            <strong>{birth.split(' ')[0]}생, {inputName}님</strong>만을 위해
            <br />생성된 결과입니다
          </div>
        )}

      </div>

      {/* ── Sticky 하단 결제 CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #F5F0EB 55%, transparent)' }}
      >
        <div className="max-w-md mx-auto px-4 pb-6 pt-8 pointer-events-auto">
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

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: '#C4956A', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-block', width: 3, height: 13, background: '#E07A3A', borderRadius: 2, flexShrink: 0 }} />
      {children}
    </p>
  )
}
