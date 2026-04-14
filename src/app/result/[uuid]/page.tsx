import React from 'react'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { ShareActions } from '@/components/share/ShareActions'
import { LifeDirectionTabs } from '@/components/result/LifeDirectionTabs'
import { FortuneResult } from '@/lib/fortune'
import { calculateSaju, getElementFromReading, GANJIBRANCH } from '@/lib/saju'
import { calcNameScore, scoreToPercentile } from '@/lib/name-score'
import type { Gender } from '@gracefullight/saju'

interface Props {
  params: Promise<{ uuid: string }>
}

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

// ─── 상수 ────────────────────────────────────────────────────────────────────

const ELEMENT_COLOR: Record<string, { bg: string; text: string }> = {
  木: { bg: '#4CAF50', text: '#fff' },
  火: { bg: '#EF5350', text: '#fff' },
  土: { bg: '#FF9800', text: '#fff' },
  金: { bg: '#9E9E9E', text: '#fff' },
  水: { bg: '#2196F3', text: '#fff' },
}

const ELEMENT_LABEL: Record<string, string> = {
  木: '목(木)', 火: '화(火)', 土: '토(土)', 金: '금(金)', 水: '수(水)',
}

const ELEMENT_ICON: Record<string, string> = {
  木: '🌲', 火: '🔥', 土: '⛰️', 金: '🪙', 水: '💧',
}

// 한자 카드 색상 (글자 순서별)
const HANJA_CARD_STYLE = [
  { bg: 'rgba(93,157,115,0.1)', accent: '#3D8C5F' },
  { bg: 'rgba(93,115,157,0.1)', accent: '#5D739D' },
  { bg: 'rgba(217,93,57,0.1)',  accent: '#D95D39' },
  { bg: 'rgba(184,131,42,0.1)', accent: '#B8832A' },
]

// 개운법 — 용신 오행별 고정 데이터
const GAEUN: Record<string, Array<{ icon: string; label: string; desc: string; accentColor: string; bgColor: string }>> = {
  火: [
    { icon: '🎨', label: '행운 색상', desc: '빨강, 주황, 골드 계열 — 부족한 화(火)를 보완', accentColor: '#D95D39', bgColor: 'rgba(217,93,57,0.07)' },
    { icon: '🧭', label: '행운 방위', desc: '남쪽과 동쪽 — 활동과 열정의 방향', accentColor: '#3D8C5F', bgColor: 'rgba(93,157,115,0.07)' },
    { icon: '💎', label: '행운 소재', desc: '촛불·따뜻한 조명, 붉은 포인트 소품 활용', accentColor: '#B8832A', bgColor: 'rgba(184,131,42,0.07)' },
    { icon: '🌊', label: '보완 방법', desc: '수(水) 기운 보완: 물 가까운 공간, 파란 소품', accentColor: '#5D739D', bgColor: 'rgba(93,115,157,0.07)' },
  ],
  水: [
    { icon: '🎨', label: '행운 색상', desc: '파랑, 검정, 남색 계열 — 수(水) 기운 강화', accentColor: '#5D739D', bgColor: 'rgba(93,115,157,0.07)' },
    { icon: '🧭', label: '행운 방위', desc: '북쪽 — 지혜와 유연함의 방향', accentColor: '#3D8C5F', bgColor: 'rgba(93,157,115,0.07)' },
    { icon: '💎', label: '행운 소재', desc: '유리·수정 소재, 파란 소품 활용', accentColor: '#B8832A', bgColor: 'rgba(184,131,42,0.07)' },
    { icon: '🌱', label: '보완 방법', desc: '목(木) 기운 보완: 식물 키우기, 자연 소재 인테리어', accentColor: '#3D8C5F', bgColor: 'rgba(93,157,115,0.07)' },
  ],
  木: [
    { icon: '🎨', label: '행운 색상', desc: '초록, 청록, 연두 계열 — 목(木) 기운 강화', accentColor: '#3D8C5F', bgColor: 'rgba(93,157,115,0.07)' },
    { icon: '🧭', label: '행운 방위', desc: '동쪽 — 성장과 새로운 시작의 방향', accentColor: '#5D739D', bgColor: 'rgba(93,115,157,0.07)' },
    { icon: '💎', label: '행운 소재', desc: '나무·대나무 등 천연 소재 활용', accentColor: '#B8832A', bgColor: 'rgba(184,131,42,0.07)' },
    { icon: '🔥', label: '보완 방법', desc: '화(火) 기운 보완: 따뜻한 조명, 빨간 포인트 소품', accentColor: '#D95D39', bgColor: 'rgba(217,93,57,0.07)' },
  ],
  土: [
    { icon: '🎨', label: '행운 색상', desc: '황토, 베이지, 갈색 계열 — 토(土) 기운 강화', accentColor: '#B8832A', bgColor: 'rgba(184,131,42,0.07)' },
    { icon: '🧭', label: '행운 방위', desc: '중앙·남서쪽 — 안정과 신뢰의 방향', accentColor: '#3D8C5F', bgColor: 'rgba(93,157,115,0.07)' },
    { icon: '💎', label: '행운 소재', desc: '도자기·흙 소재, 황토색 소품 활용', accentColor: '#B8832A', bgColor: 'rgba(184,131,42,0.07)' },
    { icon: '⚡', label: '보완 방법', desc: '금(金) 기운 보완: 금속 소품, 흰색 포인트 활용', accentColor: '#6D6661', bgColor: 'rgba(109,102,97,0.07)' },
  ],
  金: [
    { icon: '🎨', label: '행운 색상', desc: '흰색, 실버, 금색 계열 — 금(金) 기운 강화', accentColor: '#6D6661', bgColor: 'rgba(109,102,97,0.07)' },
    { icon: '🧭', label: '행운 방위', desc: '서쪽 — 결단과 완성의 방향', accentColor: '#5D739D', bgColor: 'rgba(93,115,157,0.07)' },
    { icon: '💎', label: '행운 소재', desc: '금속·보석류, 흰색·은색 소품 활용', accentColor: '#B8832A', bgColor: 'rgba(184,131,42,0.07)' },
    { icon: '🌊', label: '보완 방법', desc: '수(水) 기운 보완: 물가 산책, 감정 표현 습관', accentColor: '#5D739D', bgColor: 'rgba(93,115,157,0.07)' },
  ],
}

const OHAENG_ELEMENTS = ['木', '火', '土', '金', '水'] as const

// 약한 오행별 구체적 생활 팁
const WEAK_ELEMENT_TIP: Record<string, string> = {
  木: '식물 키우기, 주 2~3회 자연 속 산책, 나무·대나무 소품 두기가 도움이 됩니다.',
  火: '규칙적인 유산소 운동, 따뜻한 조명 환경 조성, 사교 모임 늘리기를 권장해요.',
  土: '규칙적인 식사·수면 루틴 만들기, 황토·베이지 계열 인테리어가 좋습니다.',
  金: '명확한 할 일 목록 작성, 정리정돈 습관, 흰색·금속 소품 활용을 추천해요.',
  水: '매일 짧은 독서나 일기 쓰기, 물가 산책, 감정을 언어로 표현하는 습관이 도움이 됩니다.',
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

/** 텍스트를 최대 n문장까지만 반환. 문장 구분: . ! ? 。 */
function truncateSentences(text: string, max: number): string {
  const sentences = text.split(/(?<=[.!?。])\s+/)
  return sentences.slice(0, max).join(' ')
}

// ─── 헬퍼 컴포넌트 ────────────────────────────────────────────────────────────

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
      <span
        className="w-1 h-6 rounded-full shrink-0"
        style={{ background: 'linear-gradient(to bottom, #D95D39, #F28C6A)' }}
      />
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
      style={{
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {children}
    </div>
  )
}

function ProgressBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: 'rgba(0,0,0,0.08)' }}>
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default async function ResultPage({ params }: Props) {
  const { uuid } = await params
  const supabase = createServiceClient()

  const { data: fortune } = await fortuneQuery(supabase, uuid)
  if (!fortune) notFound()

  // 한자 데이터 로드 (stroke 포함)
  type HanjaDisplay = {
    pos: number
    character: string
    reading: string
    meaning: string
    stroke?: number
  }
  let hanjaData: HanjaDisplay[] = []

  if (Array.isArray(fortune.extra_hanja) && fortune.extra_hanja.length > 0) {
    hanjaData = (fortune.extra_hanja as HanjaDisplay[]).sort((a, b) => a.pos - b.pos)
  } else if (fortune.hanja_ids?.length > 0) {
    const { data } = await supabase
      .from('hanja')
      .select('id, character, reading, meaning, stroke')
      .in('id', fortune.hanja_ids)
    if (data?.length) {
      hanjaData = fortune.hanja_ids
        .map((id: string, idx: number) => {
          const found = data.find((h: { id: string }) => h.id === id)
          return found
            ? {
                pos: idx,
                character: found.character,
                reading: found.reading,
                meaning: found.meaning,
                stroke: found.stroke,
              }
            : null
        })
        .filter(Boolean) as HanjaDisplay[]
    }
  }

  // AI 결과 파싱
  let fortuneResult: FortuneResult | null = null
  if (fortune.result) {
    try { fortuneResult = JSON.parse(fortune.result) as FortuneResult } catch { /* fallback */ }
  }

  // 사주 계산
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

  // 이름 점수
  const nameScore =
    hanjaData.length > 0 && saju
      ? calcNameScore({
          nameOhaeng,
          yongsin: saju.yongsin,
          gisin: saju.gisin,
          meanings: hanjaData.map(h => h.meaning),
        })
      : null

  const syllables = fortune.input_name.split('')

  // AI 한자 narrative 매핑
  const narrativeMap: Record<number, string> = {}
  if (fortuneResult?.hanja) {
    fortuneResult.hanja.forEach((h, i) => {
      const pos = hanjaData[i]?.pos ?? i
      narrativeMap[pos] = h.narrative
    })
  }

  // 대운 현재 인덱스
  const birthYear = fortune.birth_date ? parseInt(fortune.birth_date.split('.')[0]) : 0
  const currentAge = birthYear ? new Date().getFullYear() - birthYear : -1
  const currentCycleIndex = saju
    ? saju.daeun.cycles.findIndex(c => currentAge >= c.startAge && currentAge <= c.endAge)
    : -1

  // daeun_commentary 매핑
  const daeunCommentaryMap: Record<string, string> = {}
  if (fortuneResult?.daeun_commentary) {
    fortuneResult.daeun_commentary.forEach(d => {
      daeunCommentaryMap[d.pillar] = d.brief
    })
  }

  // extra_hanja 경로에서 stroke가 없는 경우 한자 테이블에서 보완 조회
  if (hanjaData.some(h => !h.stroke)) {
    const chars = hanjaData.filter(h => !h.stroke).map(h => h.character)
    if (chars.length > 0) {
      const { data: strokeRows } = await supabase
        .from('hanja')
        .select('character, stroke')
        .in('character', chars)
      if (strokeRows?.length) {
        hanjaData = hanjaData.map(h =>
          h.stroke
            ? h
            : { ...h, stroke: strokeRows.find((r: { character: string; stroke: number }) => r.character === h.character)?.stroke }
        )
      }
    }
  }

  // 수리획수 계산 (성씨 1자 + 이름 1~3자 구조)
  const hasStroke = hanjaData.length >= 2 && hanjaData.every(h => h.stroke && h.stroke > 0)
  const suriGeaksu = hasStroke
    ? (() => {
        const strokes = hanjaData.map(h => h.stroke!)
        const surname = strokes[0]
        const givenStrokes = strokes.slice(1)
        return [
          { label: '원격', value: givenStrokes[0] ?? 0,                          desc: '선천적 자질', color: '#D95D39' },
          { label: '형격', value: surname + (givenStrokes[0] ?? 0),               desc: '청년 운',    color: '#5D739D' },
          { label: '이격', value: givenStrokes.reduce((a, b) => a + b, 0),        desc: '중년 운',    color: '#3D8C5F' },
          { label: '정격', value: strokes.reduce((a, b) => a + b, 0),             desc: '총체 운',    color: '#B8832A' },
        ]
      })()
    : null

  // 개운법 아이템 (용신 기반)
  const gaeunItems = saju?.yongsin ? (GAEUN[saju.yongsin] ?? null) : null

  // 점수 → 별점 (5점 만점)
  const starCount = nameScore ? Math.round((nameScore.total / 100) * 5) : 0

  // 오행 바 차트 — 사주 원국 기준
  const elements = saju ? (saju.elements as unknown as Record<string, number>) : null
  const totalElCount = elements
    ? OHAENG_ELEMENTS.reduce((sum, el) => sum + (elements[el] ?? 0), 0)
    : 0

  const currentYear = new Date().getFullYear()

  return (
    <main className="ethereal-gradient min-h-screen">
      {/* 배경 블러 장식 */}
      <div
        className="fixed top-[-10%] right-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(120px)' }}
      />
      <div
        className="fixed bottom-[-10%] left-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(93,115,157,0.08)', filter: 'blur(120px)' }}
      />

      <div className="relative z-10 max-w-[480px] mx-auto px-4 pt-6 pb-24 space-y-3">

        {/* ── Block 1: 바이럴 요약 카드 ─────────────────────────────── */}
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(150deg, #1E1A18 0%, #3D2010 60%, #1E1A18 100%)' }}
        >
          {/* 배경 장식 원 */}
          <div
            className="absolute top-[-40px] right-[-40px] w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'rgba(217,93,57,0.12)' }}
          />
          <div
            className="absolute bottom-[-30px] left-[-20px] w-24 h-24 rounded-full pointer-events-none"
            style={{ background: 'rgba(93,115,157,0.15)' }}
          />

          {/* 헤더 */}
          <div className="relative flex justify-between items-center mb-4">
            <span
              className="text-[10px] tracking-[2px] font-bold"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              ✦ 이름 운세 분석
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {fortune.birth_date ?? ''}
            </span>
          </div>

          {/* 이름 */}
          <div className="relative mb-4">
            <div className="flex items-baseline gap-3 mb-1">
              <h1
                className="text-4xl font-black text-white tracking-[-1px]"
                data-testid="fortune-name"
              >
                {syllables.join(' ')}
              </h1>
              {hanjaData.length > 0 && (
                <span
                  className="text-xl font-light tracking-[4px]"
                  style={{ color: '#D95D39' }}
                >
                  {hanjaData.map(h => h.character).join('')}
                </span>
              )}
            </div>
            {hanjaData.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {hanjaData.map((h, i) => (
                  <React.Fragment key={h.character}>
                    {i > 0 && (
                      <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
                    )}
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {h.meaning} {h.reading}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* 점수 + 총평 */}
          {(nameScore || fortuneResult?.overall) && (
            <div
              className="relative grid gap-2 mb-4"
              style={{ gridTemplateColumns: nameScore ? 'auto 1fr' : '1fr' }}
            >
              {/* 점수 블록 */}
              {nameScore && (
                <div
                  className="rounded-2xl px-4 py-3 min-w-[88px]"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="text-[10px] font-bold tracking-[1px] mb-1.5"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    종합 점수
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black leading-none" style={{ color: '#D95D39' }}>
                      {nameScore.total}
                    </span>
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>/100</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar
                      value={nameScore.total}
                      color="linear-gradient(90deg, #D95D39, #F28C6A)"
                      height={4}
                    />
                    <div className="text-[10px] font-bold mt-1" style={{ color: '#D95D39' }}>
                      {scoreToPercentile(nameScore.total)}
                    </div>
                  </div>
                </div>
              )}

              {/* 총평 블록 */}
              {fortuneResult?.overall && (
                <div
                  className="rounded-2xl p-3"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="text-[10px] font-bold tracking-[1px] mb-2"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    이름 총평
                  </div>
                  <div className="text-sm font-bold text-white leading-snug mb-2">
                    {fortuneResult.overall.split(/[.!?。]/)[0]?.trim()}
                  </div>
                  {fortuneResult.quote && (
                    <div className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      "{fortuneResult.quote}"
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 오행 미니 바 */}
          {saju && elements && (
            <div className="relative flex gap-1.5 mb-4">
              {OHAENG_ELEMENTS.map(el => {
                const count = elements[el] ?? 0
                const pct = totalElCount > 0 ? Math.round((count / totalElCount) * 100) : 20
                return (
                  <div
                    key={el}
                    className="flex-1 rounded-xl py-2 px-1 text-center"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  >
                    <div className="text-sm mb-1">{ELEMENT_ICON[el]}</div>
                    <div
                      className="text-[10px] font-semibold mb-1.5"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      {el}
                    </div>
                    <ProgressBar value={pct} color={ELEMENT_COLOR[el].bg} height={3} />
                  </div>
                )
              })}
            </div>
          )}

          {/* CTA 버튼 */}
          <a
            href="#share-section"
            className="w-full py-3 px-3 rounded-xl text-center text-sm font-bold text-white flex items-center justify-center gap-1.5"
            style={{ background: '#D95D39' }}
          >
            📤 카드 저장 · 공유
          </a>
        </div>

        {/* ── Block 2: 사주 × 이름 궁합 ──────────────────────────────── */}
        {fortuneResult?.saju?.harmony && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'rgba(251,243,226,0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(232,212,160,0.8)',
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div
                  className="text-[10px] font-bold tracking-[1.5px] mb-1"
                  style={{ color: '#B8832A' }}
                >
                  ✦ 사주 × 이름 궁합
                </div>
                <h2 className="text-base font-bold text-[#2D2926]">이름이 사주를 보완해요</h2>
              </div>
              {nameScore && (
                <div className="text-right shrink-0 ml-2">
                  <div
                    className="text-lg leading-none tracking-[-2px]"
                    style={{ color: '#B8832A' }}
                  >
                    {'★'.repeat(starCount)}{'☆'.repeat(5 - starCount)}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: '#B8832A' }}>
                    궁합 {starCount}.0점
                  </div>
                </div>
              )}
            </div>
            <div
              className="p-3 rounded-xl text-sm leading-relaxed text-[#2D2926]"
              style={{
                background: 'rgba(255,255,255,0.65)',
                borderLeft: '3px solid #B8832A',
              }}
            >
              {fortuneResult.saju.harmony}
            </div>
          </div>
        )}

        {/* ── Block 3: 한자 글자별 풀이 ───────────────────────────────── */}
        {hanjaData.length > 0 && (
          <GlassCard>
            <SectionHeader title="글자별 한자 풀이" sub="이름 세 글자가 만드는 에너지" />
            <div className="space-y-3">
              {hanjaData.map((h, i) => {
                const style = HANJA_CARD_STYLE[i % HANJA_CARD_STYLE.length]
                return (
                  <div
                    key={h.pos}
                    className="flex gap-3 p-3 rounded-2xl items-start"
                    style={{ background: style.bg }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0"
                      style={{ boxShadow: `0 2px 8px ${style.bg}` }}
                    >
                      <span className="text-2xl font-black" style={{ color: style.accent }}>
                        {h.character}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-[#2D2926]">
                          {syllables[h.pos] ?? h.reading}
                        </span>
                        <span className="text-xs text-[#6D6661]">
                          · {h.meaning} {h.reading}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#2D2926]">
                        {truncateSentences(narrativeMap[h.pos] ?? h.meaning, 2)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            {fortuneResult?.combined && (
              <div
                className="mt-4 pl-4 pr-4 py-3 rounded-r-xl"
                style={{ borderLeft: '3px solid #D95D39', background: 'rgba(217,93,57,0.04)' }}
              >
                <SectionLabel>이름의 종합 기운</SectionLabel>
                <p className="text-sm leading-loose text-[#2D2926] mt-1">{fortuneResult.combined}</p>
              </div>
            )}
          </GlassCard>
        )}

        {/* ── Block 4: 수리 획수 분석 ─────────────────────────────────── */}
        {suriGeaksu && (
          <GlassCard>
            <SectionHeader title="수리 획수 분석" sub="이름의 획수가 만드는 수리 운" />
            <div className="grid grid-cols-4 gap-2 mb-4">
              {suriGeaksu.map(s => (
                <div
                  key={s.label}
                  className="text-center py-3 px-1 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.03)' }}
                >
                  <div className="text-2xl font-black mb-0.5" style={{ color: s.color }}>
                    {s.value}
                  </div>
                  <div className="text-xs font-bold text-[#2D2926] mb-0.5">{s.label}</div>
                  <div className="text-[10px] text-[#6D6661]">{s.desc}</div>
                </div>
              ))}
            </div>
            <div
              className="p-3 rounded-xl text-xs leading-relaxed text-[#2D2926]"
              style={{ background: 'rgba(217,93,57,0.06)' }}
            >
              <strong>형격 {suriGeaksu[1].value}수</strong>는 성씨와 이름 첫 글자가 만나는 사회 운으로,
              대인관계와 사회적 활동의 방향성을 나타냅니다.{' '}
              <strong>정격 {suriGeaksu[3].value}수</strong>는 이름 전체의 수리로
              평생을 관통하는 총체적 운명의 패턴을 보여줍니다.
            </div>
          </GlassCard>
        )}

        {/* ── Block 5: 오행 분석 ──────────────────────────────────────── */}
        {saju && elements && (
          <GlassCard>
            <SectionHeader title="오행 분석" sub="이름에 담긴 다섯 가지 기운의 균형" />
            <div className="space-y-3 mb-4">
              {OHAENG_ELEMENTS.map(el => {
                const count = elements[el] ?? 0
                const pct = totalElCount > 0 ? Math.round((count / totalElCount) * 100) : 20
                const strengthLabel = pct >= 30 ? '강함' : pct >= 15 ? '보통' : '약함'
                const c = ELEMENT_COLOR[el]
                return (
                  <div key={el} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center shrink-0">{ELEMENT_ICON[el]}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-sm font-bold text-[#2D2926]">{ELEMENT_LABEL[el]}</span>
                        <span className="text-xs text-[#6D6661]">
                          {strengthLabel}
                          {count > 0 ? ` — ${pct}%` : ''}
                        </span>
                      </div>
                      <ProgressBar value={pct} color={c.bg} height={7} />
                    </div>
                  </div>
                )
              })}
            </div>
            {/* 가장 약한 오행 팁 */}
            {(() => {
              const weakest = OHAENG_ELEMENTS.reduce((prev, curr) =>
                (elements[curr] ?? 0) < (elements[prev] ?? 0) ? curr : prev
              )
              return (
                <div
                  className="p-3 rounded-xl text-sm leading-relaxed text-[#2D2926]"
                  style={{ background: 'rgba(93,115,157,0.08)', borderLeft: '3px solid #5D739D' }}
                >
                  💡 <strong>{ELEMENT_LABEL[weakest]}</strong> 기운이 가장 부족해요.{' '}
                  {WEAK_ELEMENT_TIP[weakest]}
                </div>
              )
            })()}
          </GlassCard>
        )}

        {/* ── Block 5-1: 개운법 (오행 분석 바로 아래) ─────────────────── */}
        {gaeunItems && (
          <GlassCard>
            <SectionHeader title="이름 개운법" sub="이 이름과 잘 맞는 생활 습관" />
            <div className="space-y-2">
              {gaeunItems.map(item => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: item.bgColor }}
                >
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <div>
                    <div className="text-xs font-bold mb-0.5" style={{ color: item.accentColor }}>
                      {item.label}
                    </div>
                    <div className="text-xs text-[#2D2926]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* ── Block 6: 탭형 상세 운세 ─────────────────────────────────── */}
        {fortuneResult?.life_direction && (
          <GlassCard>
            <SectionHeader title="상세 운세 풀이" sub="탭을 눌러 영역별로 확인하세요" />
            <LifeDirectionTabs
              talent={fortuneResult.life_direction.talent}
              wealth={fortuneResult.life_direction.wealth}
              relationships={fortuneResult.life_direction.relationships}
              thisYear={fortuneResult.saju?.this_year}
            />
          </GlassCard>
        )}

        {/* ── Block 7: 이름 종합 총평 ─────────────────────────────────── */}
        {fortuneResult?.overall && (
          <GlassCard className="rounded-3xl">
            <SectionHeader title="이름 종합 총평" />
            {fortuneResult.quote && (
              <p className="text-base font-bold italic text-[#2D2926] text-center mb-4 leading-relaxed">
                "{fortuneResult.quote}"
              </p>
            )}
            <p className="text-sm leading-loose text-[#2D2926]">{fortuneResult.overall}</p>
          </GlassCard>
        )}

        {/* ── Block 8: 대운표 ──────────────────────────────────────────── */}
        {saju && saju.daeun.cycles.length > 0 && (
          <section>
            <div className="px-1 mb-3 mt-6">
              <SectionHeader title="대운표" sub={`${saju.daeun.startAge}세부터 10년 주기`} />
            </div>
            <div className="space-y-3">
              {saju.daeun.cycles.slice(0, 6).map((c, i) => {
                const isCurrent = i === currentCycleIndex
                const ganInfo = GANJIBRANCH[c.gan]
                const jiInfo = GANJIBRANCH[c.ji]
                const commentary =
                  daeunCommentaryMap[c.pillar] ??
                  daeunCommentaryMap[c.gan + c.ji] ??
                  fortuneResult?.daeun_commentary?.[i]?.brief

                return (
                  <div
                    key={i}
                    className="rounded-2xl p-4"
                    style={
                      isCurrent
                        ? {
                            background: 'rgba(217,93,57,0.08)',
                            border: '1px solid rgba(217,93,57,0.35)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.55)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255,255,255,0.4)',
                          }
                    }
                  >
                    <div className="flex items-center gap-4 mb-2">
                      <span
                        className="text-xs font-medium shrink-0"
                        style={{ color: isCurrent ? '#D95D39' : '#6D6661' }}
                      >
                        {c.startAge}~{c.endAge}세
                        {isCurrent && (
                          <span
                            className="ml-1.5 text-[10px] text-white px-1.5 py-0.5 rounded-full"
                            style={{ background: '#D95D39' }}
                          >
                            현재
                          </span>
                        )}
                      </span>
                      <div className="text-center">
                        <span className="text-xl font-bold text-[#2D2926]">{c.gan}</span>
                        {ganInfo && (
                          <span className="block text-[10px] text-[#6D6661]">{ganInfo.nature}</span>
                        )}
                      </div>
                      <div className="text-center">
                        <span className="text-xl font-bold" style={{ color: '#D95D39' }}>{c.ji}</span>
                        {jiInfo && (
                          <span className="block text-[10px] text-[#6D6661]">
                            {jiInfo.element}·{jiInfo.nature}
                          </span>
                        )}
                      </div>
                    </div>
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

        {/* ── Block 10: 공유 + CTA ─────────────────────────────────────── */}
        <div id="share-section" className="space-y-3 pt-4">
          <p className="text-center text-[#6D6661] text-xs tracking-wide">
            이 풀이를 친구에게 공유해보세요
          </p>
          <ShareActions uuid={uuid} inputName={fortune.input_name} />
        </div>

        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: '#1E1A18' }}
        >
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            이 결과가 마음에 드셨나요?
          </p>
          <p className="text-base font-bold text-white mb-4">친구 이름도 분석해보세요</p>
          <Link
            href="/"
            className="block w-full py-4 rounded-xl text-white font-bold text-sm text-center transition-all active:scale-95"
            style={{
              background: 'linear-gradient(to right, #D95D39, #F28C6A)',
              boxShadow: '0 8px 24px rgba(217,93,57,0.3)',
            }}
          >
            나도 내 이름의 기운을 알고 싶다
          </Link>
        </div>

      </div>
    </main>
  )
}
