import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { ShareActions } from '@/components/share/ShareActions'
import { LifeDirectionTabs } from '@/components/result/LifeDirectionTabs'
import { OhaengDiagram } from '@/components/result/OhaengDiagram'
import { FortuneResult } from '@/lib/fortune'
import { calculateSaju, getElementFromReading, GANJIBRANCH } from '@/lib/saju'
import { calcNameScore, scoreToPercentile } from '@/lib/name-score'
import type { Gender } from '@gracefullight/saju'

interface Props {
  params: Promise<{ uuid: string }>
}

// UUID 형식(36자) 여부로 조회 컬럼 결정
function fortuneQuery(supabase: ReturnType<typeof createServiceClient>, id: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  return isUuid
    ? supabase.from('fortunes').select('*').eq('id', id).single()
    : supabase.from('fortunes').select('*').eq('short_id', id).single()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uuid } = await params
  const supabase = createServiceClient()
  const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)
  const { data } = await (isUuidFormat
    ? supabase.from('fortunes').select('input_name').eq('id', uuid).single()
    : supabase.from('fortunes').select('input_name').eq('short_id', uuid).single())
  return {
    title: data ? `${data.input_name}의 이름 풀이` : '이름 풀이',
    openGraph: {
      images: [`${process.env.NEXT_PUBLIC_BASE_URL}/api/og/${uuid}`],
    },
  }
}

// ─── 스타일 상수 ────────────────────────────────────────────────────────────

const ELEMENT_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  木: { bg: '#4CAF50', text: '#fff', border: '#2E7D32' },
  火: { bg: '#EF5350', text: '#fff', border: '#B71C1C' },
  土: { bg: '#FF9800', text: '#fff', border: '#E65100' },
  金: { bg: '#9E9E9E', text: '#fff', border: '#424242' },
  水: { bg: '#2196F3', text: '#fff', border: '#0D47A1' },
}

const ELEMENT_LABEL: Record<string, string> = {
  木: '목(木)', 火: '화(火)', 土: '토(土)', 金: '금(金)', 水: '수(水)',
}

// ─── 헬퍼 컴포넌트 ──────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="h-px" style={{
      background: 'linear-gradient(to right, transparent, rgba(217,93,57,0.25), transparent)',
    }} />
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-widest mb-1" style={{ color: '#D95D39' }}>
      ✦ {children}
    </p>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-1 h-6 rounded-full shrink-0" style={{ background: 'linear-gradient(to bottom, #D95D39, #F28C6A)' }} />
      <h2 className="text-xl font-bold text-[#2D2926]">
        {title}
        {sub && <span className="text-xs font-normal text-[#6D6661] ml-2">{sub}</span>}
      </h2>
    </div>
  )
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 border border-white/40 ${className}`}
      style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
    >
      {children}
    </div>
  )
}

// ─── 메인 페이지 ────────────────────────────────────────────────────────────

export default async function ResultPage({ params }: Props) {
  const { uuid } = await params
  const supabase = createServiceClient()

  const { data: fortune } = await fortuneQuery(supabase, uuid)

  if (!fortune) notFound()

  // 한자 데이터 로드
  type HanjaDisplay = { pos: number; character: string; reading: string; meaning: string }
  let hanjaData: HanjaDisplay[] = []

  if (Array.isArray(fortune.extra_hanja) && fortune.extra_hanja.length > 0) {
    hanjaData = (fortune.extra_hanja as HanjaDisplay[]).sort((a, b) => a.pos - b.pos)
  } else if (fortune.hanja_ids?.length > 0) {
    const { data } = await supabase
      .from('hanja')
      .select('id, character, reading, meaning')
      .in('id', fortune.hanja_ids)
    if (data?.length) {
      hanjaData = fortune.hanja_ids
        .map((id: string, idx: number) => {
          const found = data.find((h: { id: string }) => h.id === id)
          return found ? { pos: idx, character: found.character, reading: found.reading, meaning: found.meaning } : null
        })
        .filter(Boolean) as HanjaDisplay[]
    }
  }

  // AI 결과 파싱
  let fortuneResult: FortuneResult | null = null
  if (fortune.result) {
    try { fortuneResult = JSON.parse(fortune.result) as FortuneResult } catch { /* fallback */ }
  }

  // 사주 계산 (성별 반영)
  const sajuGender: Gender = fortune.gender === 'female' ? 'female' : 'male'
  const saju = fortune.birth_date
    ? await calculateSaju(fortune.birth_date, sajuGender).catch(() => null)
    : null

  // 이름 오행
  const nameOhaeng = hanjaData.map(h => ({
    character: h.character,
    reading: h.reading,
    element: getElementFromReading(h.reading),
  }))

  // 이름 점수 계산
  const nameScore = hanjaData.length > 0 && saju ? calcNameScore({
    nameOhaeng,
    yongsin: saju.yongsin,
    gisin: saju.gisin,
    meanings: hanjaData.map(h => h.meaning),
  }) : null

  const syllables = fortune.input_name.split('')

  // AI hanja narrative 매핑
  const narrativeMap: Record<number, string> = {}
  if (fortuneResult?.hanja) {
    fortuneResult.hanja.forEach((h, i) => {
      const pos = hanjaData[i]?.pos ?? i
      narrativeMap[pos] = h.narrative
    })
  }

  // 현재 대운 인덱스 계산
  const birthYear = fortune.birth_date ? parseInt(fortune.birth_date.split('.')[0]) : 0
  const currentAge = birthYear ? new Date().getFullYear() - birthYear : -1
  const currentCycleIndex = saju
    ? saju.daeun.cycles.findIndex(c => currentAge >= c.startAge && currentAge <= c.endAge)
    : -1

  // daeun_commentary 매핑 (pillar 기준)
  const daeunCommentaryMap: Record<string, string> = {}
  if (fortuneResult?.daeun_commentary) {
    fortuneResult.daeun_commentary.forEach(d => {
      daeunCommentaryMap[d.pillar] = d.brief
    })
  }

  const pillarsArr = saju ? [
    { label: '년주', info: saju.pillars.year },
    { label: '월주', info: saju.pillars.month },
    { label: '일주', info: saju.pillars.day },
    ...(saju.pillars.hour ? [{ label: '시주', info: saju.pillars.hour }] : []),
  ] : []

  const currentYear = new Date().getFullYear()

  return (
    <main className="ethereal-gradient min-h-screen">
      {/* 배경 블러 장식 */}
      <div className="fixed top-[-10%] right-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(120px)' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(93,115,157,0.08)', filter: 'blur(120px)' }} />

      <div className="relative z-10 max-w-[480px] mx-auto px-6 pt-10 pb-24 space-y-12">

        {/* ── Zone 1: 정체성 훅 ────────────────────────────────────── */}
        <section className="text-center space-y-6">

          {/* 이름 헤더 */}
          <GlassCard className="rounded-3xl">
            {fortune.birth_date && (
              <p className="text-xs text-[#6D6661] mb-3 tracking-widest">{fortune.birth_date} 生</p>
            )}
            <h1 className="text-5xl font-black text-[#2D2926] mb-4 tracking-[0.2em] font-serif" data-testid="fortune-name">
              {syllables.join(' ')}
            </h1>
            {hanjaData.length > 0 && (
              <div className="flex justify-center gap-4 text-2xl font-bold" style={{ color: '#D95D39' }}>
                {hanjaData.map((h, i) => <span key={i}>{h.character}</span>)}
              </div>
            )}
          </GlassCard>

          {/* 키워드 */}
          {fortuneResult?.keywords && fortuneResult.keywords.length > 0 && (
            <div className="flex justify-center gap-2 flex-wrap">
              {fortuneResult.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-4 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: 'rgba(217,93,57,0.08)',
                    color: '#D95D39',
                    border: '1px solid rgba(217,93,57,0.2)',
                  }}
                >
                  #{kw}
                </span>
              ))}
            </div>
          )}

          {/* Quote */}
          {fortuneResult?.quote && (
            <GlassCard className="text-left">
              <SectionLabel>이름이 전하는 한 마디</SectionLabel>
              <p className="italic text-[#2D2926] text-base leading-relaxed font-medium mt-2">
                "{fortuneResult.quote}"
              </p>
            </GlassCard>
          )}
        </section>

        <Divider />

        {/* ── Zone 2: 신뢰 데이터 ──────────────────────────────────── */}
        {saju && (
          <section className="space-y-6">

            {/* 이름 점수 */}
            {nameScore && (
              <div>
                <SectionHeader title="이름 점수" />
                <GlassCard>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-5xl font-black text-[#2D2926]">
                        {nameScore.total}
                        <span className="text-xl font-medium text-[#6D6661] ml-1">점</span>
                      </p>
                      <p className="text-xs font-bold mt-1" style={{ color: '#D95D39' }}>
                        {scoreToPercentile(nameScore.total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#6D6661] mb-2">100점 만점</p>
                      <div className="w-28 bg-black/8 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${nameScore.total}%`,
                            background: 'linear-gradient(to right, #D95D39, #F28C6A)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* 항목별 상세 */}
                  <div className="space-y-3 border-t border-white/50 pt-4">
                    <SectionLabel>항목별 분석</SectionLabel>
                    {[
                      { label: '용신 일치도', desc: '이름 오행이 사주 용신과 얼마나 맞는가', score: nameScore.yongsinScore, max: 40 },
                      { label: '오행 균형',   desc: '이름 글자들의 오행이 다양하게 어우러지는가', score: nameScore.balanceScore, max: 30 },
                      { label: '한자 뜻 긍정성', desc: '한자 의미가 긍정적이고 상서로운가', score: nameScore.meaningScore, max: 30 },
                    ].map(({ label, desc, score, max }) => (
                      <div key={label}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-medium text-[#2D2926]">{label}</span>
                          <span className="text-sm font-bold text-[#2D2926]">{score}<span className="text-[10px] text-[#6D6661] font-normal">/{max}</span></span>
                        </div>
                        <div className="bg-black/8 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(score / max) * 100}%`,
                              background: 'linear-gradient(to right, #D95D39, #F28C6A)',
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-[#6D6661] mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            )}

            {/* 사주 팔자 테이블 */}
            <div>
              <SectionHeader title="사주 팔자" />
              <GlassCard className="p-0 overflow-hidden">
                <table className="w-full text-center text-sm">
                  <thead>
                    <tr style={{ background: '#2D2926' }}>
                      {pillarsArr.map(p => (
                        <th key={p.label} className="py-2.5 px-1 font-medium tracking-wider text-xs text-white/80">{p.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/30">
                      {pillarsArr.map(p => (
                        <td key={p.label + 'g'} className="py-3 text-xl font-bold text-[#2D2926]">{p.info.gan}</td>
                      ))}
                    </tr>
                    <tr>
                      {pillarsArr.map(p => (
                        <td key={p.label + 'j'} className="py-3 text-xl font-bold" style={{ color: '#D95D39' }}>{p.info.ji}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <div className="flex border-t border-white/30">
                  <div className="flex-1 py-2 text-center text-xs text-[#6D6661] border-r border-white/30">천간</div>
                  <div className="flex-1 py-2 text-center text-xs text-[#6D6661]">지지</div>
                </div>
              </GlassCard>
              <div className="flex justify-between mt-2 px-1">
                <span className="text-xs text-[#6D6661]">일간 <span className="font-bold text-[#2D2926]">{saju.dayMaster}</span></span>
                <span className="text-xs text-[#6D6661]">신강/신약 <span className="font-bold text-[#2D2926]">{saju.strengthLabel}</span></span>
                <span className="text-xs text-[#6D6661]">용신 <span className="font-bold text-[#2D2926]">{saju.yongsinLabel}</span></span>
              </div>
            </div>

            {/* 오행 분포 — SVG 다이어그램 */}
            <div>
              <SectionHeader title="오행 분포" />
              <GlassCard>
                <OhaengDiagram elements={saju.elements} yongsin={saju.yongsin} />
                <div className="flex justify-around mt-3 pt-3 border-t border-white/50 text-xs text-[#6D6661]">
                  <span>용신 <span className="font-bold text-[#2D2926]">{saju.yongsinLabel}</span></span>
                  <span>기신 <span className="font-bold text-[#2D2926]">{saju.gisinLabel}</span></span>
                  <span>신강/신약 <span className="font-bold text-[#2D2926]">{saju.strengthLabel}</span></span>
                </div>
                {fortuneResult?.element_summary && (
                  <p className="text-sm text-[#2D2926] leading-relaxed text-center italic border-t border-white/50 pt-4 mt-3">
                    "{fortuneResult.element_summary}"
                  </p>
                )}
              </GlassCard>
            </div>

            {/* 이름의 오행 — 글자별 + 바 차트 */}
            {nameOhaeng.length > 0 && (
              <div>
                <SectionHeader title="이름의 오행" />
                <GlassCard>
                  {/* 글자별 오행 */}
                  <div className="flex gap-3 justify-center mb-5">
                    {nameOhaeng.map((h, i) => {
                      const c = ELEMENT_COLOR[h.element] ?? { bg: '#999', text: '#fff', border: '#666' }
                      return (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1">
                          <div className="text-3xl font-bold text-[#2D2926]">{h.character}</div>
                          <div className="text-xs text-[#6D6661]">{h.reading}</div>
                          <div
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: c.bg, color: c.text }}
                          >
                            {ELEMENT_LABEL[h.element]}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* 오행 바 차트 */}
                  <div className="border-t border-white/50 pt-4 space-y-2">
                    <SectionLabel>이름 오행 균형</SectionLabel>
                    {(() => {
                      const counts: Record<string, number> = {}
                      nameOhaeng.forEach(h => { counts[h.element] = (counts[h.element] ?? 0) + 1 })
                      const max = Math.max(...Object.values(counts), 1)
                      return (['木','火','土','金','水'] as const).map(el => {
                        const cnt = counts[el] ?? 0
                        const c = ELEMENT_COLOR[el] ?? { bg: '#999', text: '#fff', border: '#666' }
                        const isYongsin = el === saju.yongsin
                        return (
                          <div key={el} className="flex items-center gap-2">
                            <span className="text-xs w-10 text-[#6D6661] shrink-0">{ELEMENT_LABEL[el]}</span>
                            <div className="flex-1 bg-black/8 rounded-full h-3 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: cnt === 0 ? '0%' : `${(cnt / max) * 100}%`,
                                  backgroundColor: c.bg,
                                  opacity: cnt === 0 ? 0 : 1,
                                }}
                              />
                            </div>
                            <span className="text-xs w-5 text-right shrink-0" style={{ color: cnt > 0 ? c.bg : 'rgba(109,102,97,0.4)' }}>
                              {cnt}
                            </span>
                            {isYongsin && cnt > 0 && (
                              <span className="text-[9px] font-bold shrink-0" style={{ color: '#D95D39' }}>용신</span>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </GlassCard>
              </div>
            )}
          </section>
        )}

        <Divider />

        {/* ── Zone 3: 이름 뜻풀이 ──────────────────────────────────── */}
        {hanjaData.length > 0 && (
          <section>
            <SectionHeader title="이름 뜻풀이" />
            <div className="space-y-4">
              {hanjaData.map((h) => (
                <GlassCard key={h.pos} className="flex items-start gap-4">
                  <div className="text-4xl font-bold shrink-0 leading-none pt-0.5" style={{ color: '#D95D39' }}>{h.character}</div>
                  <div>
                    <h3 className="font-bold text-[#2D2926] mb-2">
                      {syllables[h.pos] ?? h.reading}
                      {h.meaning ? ` (${h.meaning} ${h.reading})` : ` (${h.reading})`}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#2D2926]">
                      {narrativeMap[h.pos] ?? h.meaning}
                    </p>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* 종합 기운 */}
            {fortuneResult?.combined && (
              <div
                className="mt-6 pl-5 py-3 rounded-r-xl"
                style={{ borderLeft: '3px solid #D95D39', background: 'rgba(217,93,57,0.04)' }}
              >
                <SectionLabel>이름의 종합 기운</SectionLabel>
                <p className="text-sm leading-loose text-[#2D2926] mt-1">{fortuneResult.combined}</p>
              </div>
            )}
          </section>
        )}

        {/* ── Zone 4: 이름 × 사주 (시각적 강조) ───────────────────── */}
        {fortuneResult?.saju && (
          <section className="-mx-6">
            <div className="px-6 py-10 space-y-1" style={{ background: '#1E1A18' }}>
              <div className="flex items-center gap-3 mb-7">
                <span className="w-1 h-6 rounded-full shrink-0" style={{ background: 'linear-gradient(to bottom, #D95D39, #F28C6A)' }} />
                <h2 className="text-xl font-bold text-white">이름과 사주</h2>
              </div>

              <div className="space-y-4">
                <div className="p-5 space-y-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs font-bold tracking-widest" style={{ color: '#F28C6A' }}>✦ 타고난 기운</p>
                  <p className="text-sm leading-loose text-white/80">{fortuneResult.saju.innate}</p>
                </div>

                <div className="p-5 space-y-2 rounded-2xl" style={{ background: 'rgba(217,93,57,0.15)', border: '1px solid rgba(217,93,57,0.4)' }}>
                  <p className="text-xs font-bold tracking-widest" style={{ color: '#F28C6A' }}>✦ 이름과 사주의 조화</p>
                  <p className="text-sm leading-loose text-white/90">{fortuneResult.saju.harmony}</p>
                </div>

                <div className="p-5 space-y-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs font-bold tracking-widest" style={{ color: '#F28C6A' }}>✦ {currentYear}년 올해의 운세</p>
                  <p className="text-sm leading-loose text-white/80">{fortuneResult.saju.this_year}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Zone 5: 인생의 방향 (탭) ─────────────────────────────── */}
        {fortuneResult?.life_direction && (
          <section>
            <SectionHeader title="인생의 방향" />
            <LifeDirectionTabs data={fortuneResult.life_direction} />
          </section>
        )}

        {/* ── Zone 6: 총평 ──────────────────────────────────────────── */}
        {fortuneResult?.overall && (
          <section>
            <SectionHeader title="총평" />
            <GlassCard className="text-center rounded-3xl py-8">
              <p className="text-base font-bold text-[#2D2926] leading-relaxed">{fortuneResult.overall}</p>
            </GlassCard>
          </section>
        )}

        {/* ── Zone 7: 대운표 ────────────────────────────────────────── */}
        {saju && saju.daeun.cycles.length > 0 && (
          <section>
            <SectionHeader title="대운표" sub={`(${saju.daeun.startAge}세부터 10년 주기)`} />
            <div className="space-y-3">
              {saju.daeun.cycles.slice(0, 6).map((c, i) => {
                const isCurrent = i === currentCycleIndex
                const ganInfo = GANJIBRANCH[c.gan]
                const jiInfo = GANJIBRANCH[c.ji]
                const commentary = daeunCommentaryMap[c.pillar]
                  ?? daeunCommentaryMap[c.gan + c.ji]
                  ?? fortuneResult?.daeun_commentary?.[i]?.brief

                return (
                  <div
                    key={i}
                    className="rounded-2xl p-4"
                    style={isCurrent ? {
                      background: 'rgba(217,93,57,0.08)',
                      border: '1px solid rgba(217,93,57,0.35)',
                    } : {
                      background: 'rgba(255,255,255,0.55)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.4)',
                    }}
                  >
                    <div className="flex items-center gap-4 mb-2">
                      {/* 나이 */}
                      <span className="text-xs font-medium shrink-0" style={{ color: isCurrent ? '#D95D39' : '#6D6661' }}>
                        {c.startAge}~{c.endAge}세
                        {isCurrent && (
                          <span className="ml-1.5 text-[10px] text-white px-1.5 py-0.5 rounded-full"
                            style={{ background: '#D95D39' }}>현재</span>
                        )}
                      </span>
                      {/* 천간 */}
                      <div className="text-center">
                        <span className="text-xl font-bold text-[#2D2926]">{c.gan}</span>
                        {ganInfo && <span className="block text-[10px] text-[#6D6661]">{ganInfo.nature}</span>}
                      </div>
                      {/* 지지 */}
                      <div className="text-center">
                        <span className="text-xl font-bold" style={{ color: '#D95D39' }}>{c.ji}</span>
                        {jiInfo && <span className="block text-[10px] text-[#6D6661]">{jiInfo.element}·{jiInfo.nature}</span>}
                      </div>
                    </div>
                    {/* AI 해설 */}
                    {commentary && (
                      <p className="text-sm leading-relaxed text-[#2D2926]">{commentary}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* fallback */}
        {!fortuneResult && (
          <GlassCard className="text-center rounded-3xl">
            <p className="text-[#6D6661] text-sm">풀이를 불러오는 중입니다…</p>
          </GlassCard>
        )}

        <Divider />

        {/* ── Zone 8: 공유 + CTA ────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-center text-[#6D6661] text-xs tracking-wide">이 풀이를 친구에게 공유해보세요</p>
          <ShareActions uuid={uuid} inputName={fortune.input_name} />
        </div>

        <Link
          href="/"
          className="block w-full py-5 rounded-full text-white font-bold text-base text-center transition-all active:scale-95"
          style={{
            background: 'linear-gradient(to right, #D95D39, #F28C6A)',
            boxShadow: '0 12px 40px rgba(217,93,57,0.35)',
          }}
        >
          나도 내 이름의 기운을 알고 싶다
        </Link>

      </div>
    </main>
  )
}
