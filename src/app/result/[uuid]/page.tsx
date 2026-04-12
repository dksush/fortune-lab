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
  return <div className="h-px bg-gradient-to-r from-transparent via-[#C4973A] to-transparent" />
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-1.5 h-6 bg-[#C4973A] shrink-0" />
      <h2 className="text-xl font-bold text-[#2C1A0E]">
        {title}
        {sub && <span className="text-xs font-normal text-[#8B7355] ml-2">{sub}</span>}
      </h2>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#FAF5EA] border border-[#D4B896] p-5">
      {children}
    </div>
  )
}

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#C4973A] tracking-widest mb-2">✦ {label}</p>
      <p className="text-sm leading-loose text-[#3D2B1F]">{children}</p>
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
    <main className="min-h-screen bg-[#F5EDD8]">
      <div className="max-w-[480px] mx-auto px-6 pt-10 pb-20 space-y-12">

        {/* ── Zone 1: 정체성 훅 ────────────────────────────────────── */}
        <section className="text-center space-y-6">

          {/* 이름 헤더 */}
          <div className="inline-block border border-[#D4B896] p-1 w-full">
            <div className="border border-[#D4B896] px-6 py-8 bg-[#FAF5EA]">
              {fortune.birth_date && (
                <p className="text-xs text-[#9C8B7A] mb-3 tracking-widest">{fortune.birth_date} 生</p>
              )}
              <h1 className="text-5xl font-black text-[#2C1A0E] mb-4 tracking-[0.2em]" data-testid="fortune-name">
                {syllables.join(' ')}
              </h1>
              {hanjaData.length > 0 && (
                <div className="flex justify-center gap-4 text-2xl text-[#C4973A]">
                  {hanjaData.map((h, i) => <span key={i}>{h.character}</span>)}
                </div>
              )}
            </div>
          </div>

          {/* 키워드 (상단 배치) */}
          {fortuneResult?.keywords && fortuneResult.keywords.length > 0 && (
            <div className="flex justify-center gap-2 flex-wrap">
              {fortuneResult.keywords.map((kw, i) => (
                <span key={i} className="px-4 py-1 border border-[#D4B896] text-xs font-bold text-[#8B5A2B] bg-[#FAF5EA]">
                  #{kw}
                </span>
              ))}
            </div>
          )}

          {/* Quote (상단 배치 - 정체성 훅) */}
          {fortuneResult?.quote && (
            <div className="border-l-4 border-[#C4973A] pl-5 py-3 text-left bg-[#FAF5EA] border border-[#D4B896]">
              <p className="text-[#C4973A] text-xs tracking-widest mb-2">✦ 이름이 전하는 한 마디</p>
              <p className="italic text-[#3D2B1F] text-base leading-relaxed font-medium">"{fortuneResult.quote}"</p>
            </div>
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
                <Card>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-5xl font-black text-[#2C1A0E]">
                        {nameScore.total}
                        <span className="text-xl font-medium text-[#8B7355] ml-1">점</span>
                      </p>
                      <p className="text-xs text-[#C4973A] font-bold mt-1">
                        {scoreToPercentile(nameScore.total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#8B7355] mb-2">100점 만점</p>
                      {/* 점수 게이지 */}
                      <div className="w-28 bg-[#EDE0C8] rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#C4973A]"
                          style={{ width: `${nameScore.total}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* 항목별 상세 */}
                  <div className="space-y-3 border-t border-[#D4B896] pt-4">
                    <p className="text-[10px] text-[#C4973A] font-bold tracking-widest">✦ 항목별 분석</p>
                    {[
                      { label: '용신 일치도', desc: '이름 오행이 사주 용신과 얼마나 맞는가', score: nameScore.yongsinScore, max: 40 },
                      { label: '오행 균형',   desc: '이름 글자들의 오행이 다양하게 어우러지는가', score: nameScore.balanceScore, max: 30 },
                      { label: '한자 뜻 긍정성', desc: '한자 의미가 긍정적이고 상서로운가', score: nameScore.meaningScore, max: 30 },
                    ].map(({ label, desc, score, max }) => (
                      <div key={label}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-medium text-[#3D2B1F]">{label}</span>
                          <span className="text-sm font-bold text-[#2C1A0E]">{score}<span className="text-[10px] text-[#8B7355] font-normal">/{max}</span></span>
                        </div>
                        <div className="bg-[#EDE0C8] rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#C4973A]"
                            style={{ width: `${(score / max) * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-[#B0A090] mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* 사주 팔자 테이블 */}
            <div>
              <SectionHeader title="사주 팔자" />
              <div className="border border-[#C4A882] overflow-hidden">
                <table className="w-full text-center text-sm">
                  <thead>
                    <tr className="bg-[#3D2B1F] text-[#FAF5EA]">
                      {pillarsArr.map(p => (
                        <th key={p.label} className="py-2 px-1 font-medium tracking-wider text-xs">{p.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-[#FAF5EA] border-b border-[#D4B896]">
                      {pillarsArr.map(p => (
                        <td key={p.label + 'g'} className="py-3 text-xl font-bold text-[#2C1A0E]">{p.info.gan}</td>
                      ))}
                    </tr>
                    <tr className="bg-[#FAF5EA]">
                      {pillarsArr.map(p => (
                        <td key={p.label + 'j'} className="py-3 text-xl font-bold text-[#8B5A2B]">{p.info.ji}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <div className="flex border-t border-[#D4B896]">
                  <div className="flex-1 py-2 text-center text-xs text-[#8B7355] border-r border-[#D4B896]">천간</div>
                  <div className="flex-1 py-2 text-center text-xs text-[#8B7355]">지지</div>
                </div>
              </div>
              <div className="flex justify-between mt-2 px-1">
                <span className="text-xs text-[#8B7355]">일간 <span className="font-bold text-[#3D2B1F]">{saju.dayMaster}</span></span>
                <span className="text-xs text-[#8B7355]">신강/신약 <span className="font-bold text-[#3D2B1F]">{saju.strengthLabel}</span></span>
                <span className="text-xs text-[#8B7355]">용신 <span className="font-bold text-[#3D2B1F]">{saju.yongsinLabel}</span></span>
              </div>
            </div>

            {/* 오행 분포 — SVG 다이어그램 */}
            <div>
              <SectionHeader title="오행 분포" />
              <Card>
                <OhaengDiagram elements={saju.elements} yongsin={saju.yongsin} />
                <div className="flex justify-around mt-3 pt-3 border-t border-[#D4B896] text-xs text-[#8B7355]">
                  <span>용신 <span className="font-bold text-[#3D2B1F]">{saju.yongsinLabel}</span></span>
                  <span>기신 <span className="font-bold text-[#3D2B1F]">{saju.gisinLabel}</span></span>
                  <span>신강/신약 <span className="font-bold text-[#3D2B1F]">{saju.strengthLabel}</span></span>
                </div>
                {fortuneResult?.element_summary && (
                  <p className="text-sm text-[#3D2B1F] leading-relaxed text-center italic border-t border-[#D4B896] pt-4 mt-3">
                    "{fortuneResult.element_summary}"
                  </p>
                )}
              </Card>
            </div>

            {/* 이름의 오행 — 글자별 + 바 차트 */}
            {nameOhaeng.length > 0 && (
              <div>
                <SectionHeader title="이름의 오행" />
                <Card>
                  {/* 글자별 오행 */}
                  <div className="flex gap-3 justify-center mb-5">
                    {nameOhaeng.map((h, i) => {
                      const c = ELEMENT_COLOR[h.element] ?? { bg: '#999', text: '#fff', border: '#666' }
                      return (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1">
                          <div className="text-3xl font-bold text-[#2C1A0E]">{h.character}</div>
                          <div className="text-xs text-[#8B7355]">{h.reading}</div>
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
                  <div className="border-t border-[#D4B896] pt-4 space-y-2">
                    <p className="text-[10px] text-[#C4973A] font-bold tracking-widest mb-3">✦ 이름 오행 균형</p>
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
                            <span className="text-xs w-10 text-[#8B7355] shrink-0">{ELEMENT_LABEL[el]}</span>
                            <div className="flex-1 bg-[#EDE0C8] rounded-full h-3 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: cnt === 0 ? '0%' : `${(cnt / max) * 100}%`,
                                  backgroundColor: c.bg,
                                  opacity: cnt === 0 ? 0 : 1,
                                }}
                              />
                            </div>
                            <span className="text-xs w-5 text-right shrink-0" style={{ color: cnt > 0 ? c.bg : '#C4A882' }}>
                              {cnt}
                            </span>
                            {isYongsin && cnt > 0 && (
                              <span className="text-[9px] text-[#C4973A] font-bold shrink-0">용신</span>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </Card>
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
                <div key={h.pos} className="flex bg-[#FAF5EA] border border-[#D4B896] p-5 items-start gap-4">
                  <div className="text-4xl text-[#C4973A] shrink-0 font-bold leading-none pt-0.5">{h.character}</div>
                  <div>
                    <h3 className="font-bold text-[#2C1A0E] mb-2">
                      {syllables[h.pos] ?? h.reading}
                      {h.meaning ? ` (${h.meaning} ${h.reading})` : ` (${h.reading})`}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#3D2B1F]">
                      {narrativeMap[h.pos] ?? h.meaning}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 종합 기운 */}
            {fortuneResult?.combined && (
              <div className="mt-6 border-l-2 border-[#C4973A] pl-6 py-2">
                <p className="text-xs font-bold text-[#C4973A] tracking-widest mb-2">✦ 이름의 종합 기운</p>
                <p className="text-sm leading-loose text-[#3D2B1F]">{fortuneResult.combined}</p>
              </div>
            )}
          </section>
        )}

        {/* ── Zone 4: 이름 × 사주 (시각적 강조) ───────────────────── */}
        {fortuneResult?.saju && (
          <section className="-mx-6">
            <div className="bg-[#2C1A0E] px-6 py-10 space-y-1">
              <div className="flex items-center gap-3 mb-7">
                <span className="w-1.5 h-6 bg-[#C4973A] shrink-0" />
                <h2 className="text-xl font-bold text-[#FAF5EA]">이름과 사주</h2>
              </div>

              <div className="space-y-5">
                <div className="border border-[#5A3E28] p-5 space-y-2">
                  <p className="text-xs font-bold text-[#C4973A] tracking-widest">✦ 타고난 기운</p>
                  <p className="text-sm leading-loose text-[#E8D9C0]">{fortuneResult.saju.innate}</p>
                </div>

                <div className="border-2 border-[#C4973A] p-5 space-y-2">
                  <p className="text-xs font-bold text-[#C4973A] tracking-widest">✦ 이름과 사주의 조화</p>
                  <p className="text-sm leading-loose text-[#E8D9C0]">{fortuneResult.saju.harmony}</p>
                </div>

                <div className="border border-[#5A3E28] p-5 space-y-2">
                  <p className="text-xs font-bold text-[#C4973A] tracking-widest">✦ {currentYear}년 올해의 운세</p>
                  <p className="text-sm leading-loose text-[#E8D9C0]">{fortuneResult.saju.this_year}</p>
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
            <div className="py-8 px-6 bg-[#FAF5EA] border-y border-[#D4B896] text-center">
              <p className="text-base font-bold text-[#2C1A0E] leading-relaxed">{fortuneResult.overall}</p>
            </div>
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
                    className={`border p-4 ${
                      isCurrent
                        ? 'border-[#C4973A] bg-[#FFF9ED]'
                        : 'border-[#D4B896] bg-[#FAF5EA]'
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-2">
                      {/* 나이 */}
                      <span className={`text-xs font-medium shrink-0 ${isCurrent ? 'text-[#C4973A]' : 'text-[#8B7355]'}`}>
                        {c.startAge}~{c.endAge}세
                        {isCurrent && <span className="ml-1 text-[10px] bg-[#C4973A] text-white px-1.5 py-0.5 rounded-full">현재</span>}
                      </span>
                      {/* 천간 */}
                      <div className="text-center">
                        <span className="text-xl font-bold text-[#2C1A0E]">{c.gan}</span>
                        {ganInfo && <span className="block text-[10px] text-[#8B7355]">{ganInfo.nature}</span>}
                      </div>
                      {/* 지지 */}
                      <div className="text-center">
                        <span className="text-xl font-bold text-[#8B5A2B]">{c.ji}</span>
                        {jiInfo && <span className="block text-[10px] text-[#8B7355]">{jiInfo.element}·{jiInfo.nature}</span>}
                      </div>
                    </div>
                    {/* AI 해설 */}
                    {commentary && (
                      <p className={`text-sm leading-relaxed ${isCurrent ? 'text-[#3D2B1F]' : 'text-[#5A4030]'}`}>
                        {commentary}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* fallback */}
        {!fortuneResult && (
          <section className="bg-[#FAF5EA] border border-[#D4B896] p-6 text-center">
            <p className="text-[#8B7355] text-sm">풀이를 불러오는 중입니다…</p>
          </section>
        )}

        <Divider />

        {/* ── Zone 8: 공유 + CTA ────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-center text-[#8B7355] text-xs tracking-wide">이 풀이를 친구에게 공유해보세요</p>
          <ShareActions uuid={uuid} inputName={fortune.input_name} />
        </div>

        <Link
          href="/"
          className="block w-full py-4 text-center bg-[#3D2B1F] hover:bg-[#2C1A0E] text-[#FAF5EA] font-bold text-base tracking-wide transition-colors"
        >
          나도 내 이름의 기운을 알고 싶다
        </Link>

      </div>
    </main>
  )
}
