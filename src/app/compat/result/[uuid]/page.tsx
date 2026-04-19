import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import type { CompatFortuneResult } from '@/lib/compat-fortune'
import Link from 'next/link'

interface Props {
  params: Promise<{ uuid: string }>
}

function compatQuery(supabase: ReturnType<typeof createServiceClient>, id: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  return isUuid
    ? supabase.from('compat_fortunes').select('*').eq('id', id).single()
    : supabase.from('compat_fortunes').select('*').eq('short_id', id).single()
}

const RELATION_LABEL: Record<string, string> = {
  lover: '연인 · 썸', friend: '친구', family: '가족',
}

const SCORE_COLORS = [
  { min: 85, color: '#3D8C5F', label: '천생연분' },
  { min: 70, color: '#5D739D', label: '좋은 인연' },
  { min: 55, color: '#B8832A', label: '보통 인연' },
  { min: 0,  color: '#D95D39', label: '인연의 과제' },
]

function getScoreColor(score: number) {
  return SCORE_COLORS.find(s => score >= s.min) ?? SCORE_COLORS[SCORE_COLORS.length - 1]
}

export default async function CompatResultPage({ params }: Props) {
  const { uuid } = await params
  const supabase = createServiceClient()
  const { data, error } = await compatQuery(supabase, uuid)

  if (error || !data) notFound()

  let result: CompatFortuneResult | null = null
  if (data.result) {
    try { result = JSON.parse(data.result) } catch { /* ignore */ }
  }

  // 결제 완료됐지만 아직 생성 중
  if (!result || data.status !== 'completed') {
    return (
      <main className="ethereal-gradient min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="text-3xl" style={{ color: '#D95D39' }}>♥</div>
          <p className="text-sm text-[#6D6661]">
            {data.status === 'failed' ? '풀이 생성에 실패했습니다. 고객센터에 문의해주세요.' : '풀이를 준비하고 있습니다…'}
          </p>
        </div>
      </main>
    )
  }

  const scoreInfo = getScoreColor(result.score)
  const currentYear = new Date().getFullYear()
  const myHanja: { character: string; reading: string; meaning: string }[] = Array.isArray(data.my_hanja) ? data.my_hanja : []
  const partnerHanja: { character: string; reading: string; meaning: string }[] = Array.isArray(data.partner_hanja) ? data.partner_hanja : []

  return (
    <main className="ethereal-gradient min-h-screen">
      {/* 배경 블러 장식 */}
      <div className="fixed top-[-10%] right-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(120px)' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(93,115,157,0.08)', filter: 'blur(120px)' }} />

      <div className="relative z-10 max-w-[480px] mx-auto px-4 pt-6 pb-20 space-y-3">

        {/* ── 관계 유형 뱃지 ── */}
        <div className="flex justify-center">
          <span className="text-xs font-bold tracking-[0.15em] px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(217,93,57,0.1)', color: '#D95D39' }}>
            ✦ {RELATION_LABEL[data.relation_type ?? 'lover'] ?? data.relation_type} 궁합
          </span>
        </div>

        {/* ── 히어로 카드 ── */}
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(150deg, #1E1A18 0%, #3D2010 60%, #1E1A18 100%)' }}
        >
          <div className="absolute top-[-40px] right-[-40px] w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'rgba(217,93,57,0.12)' }} />

          {/* 두 이름 */}
          <div className="relative flex items-center justify-between mb-5">
            <div>
              <div className="text-[10px] tracking-[1.5px] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>나</div>
              <div className="text-2xl font-black text-white tracking-[-0.5px]">{data.my_name}</div>
              {myHanja.length > 0 && (
                <div className="text-sm font-light tracking-[2px]" style={{ color: '#D95D39' }}>
                  {myHanja.map(h => h.character).join('')}
                </div>
              )}
            </div>

            {/* 점수 원 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: `2px solid ${scoreInfo.color}` }}>
                <span className="text-2xl font-black" style={{ color: scoreInfo.color }}>{result.score}</span>
              </div>
              <div className="text-[10px] mt-1 font-bold" style={{ color: scoreInfo.color }}>{result.score_label}</div>
            </div>

            <div className="text-right">
              <div className="text-[10px] tracking-[1.5px] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>상대방</div>
              <div className="text-2xl font-black text-white tracking-[-0.5px]">{data.partner_name}</div>
              {partnerHanja.length > 0 && (
                <div className="text-sm font-light tracking-[2px]" style={{ color: '#D95D39' }}>
                  {partnerHanja.map(h => h.character).join('')}
                </div>
              )}
            </div>
          </div>

          {/* 요약 */}
          <div className="relative rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <p className="text-sm text-white leading-relaxed">{result.summary}</p>
          </div>
        </div>

        {/* ── 오행 상성 ── */}
        <GlassCard>
          <SectionHeader>오행 상성</SectionHeader>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
              <div className="text-[10px] text-[#9D9690] mb-1">{data.my_name}</div>
              <div className="text-lg font-bold text-[#2D2926]">{result.element_compat.my_dominant}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
              <div className="text-[10px] text-[#9D9690] mb-1">{data.partner_name}</div>
              <div className="text-lg font-bold text-[#2D2926]">{result.element_compat.partner_dominant}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{
                background: result.element_compat.relation === '상생' ? 'rgba(61,140,95,0.1)' : result.element_compat.relation === '상극' ? 'rgba(217,93,57,0.1)' : 'rgba(93,115,157,0.1)',
                color: result.element_compat.relation === '상생' ? '#3D8C5F' : result.element_compat.relation === '상극' ? '#D95D39' : '#5D739D',
              }}
            >
              {result.element_compat.relation}
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
          </div>
          <p className="text-sm text-[#4a3828] leading-relaxed">{result.element_compat.description}</p>
        </GlassCard>

        {/* ── 이름 한자 교차 분석 ── */}
        <GlassCard>
          <SectionHeader>이름 한자 교차 분석</SectionHeader>
          <p className="text-sm text-[#4a3828] leading-relaxed">{result.name_cross}</p>
        </GlassCard>

        {/* ── 함께할 때 강점 ── */}
        <GlassCard>
          <SectionHeader>함께할 때 강점</SectionHeader>
          <div className="flex items-start gap-3">
            <span className="text-base mt-0.5">✨</span>
            <p className="text-sm text-[#4a3828] leading-relaxed flex-1">{result.strengths}</p>
          </div>
        </GlassCard>

        {/* ── 주의할 갈등 포인트 ── */}
        <GlassCard>
          <SectionHeader>주의할 갈등 포인트</SectionHeader>
          <div className="flex items-start gap-3">
            <span className="text-base mt-0.5">⚠️</span>
            <p className="text-sm text-[#4a3828] leading-relaxed flex-1">{result.cautions}</p>
          </div>
        </GlassCard>

        {/* ── 올해 두 사람의 흐름 ── */}
        <GlassCard>
          <SectionHeader>{currentYear}년 두 사람의 흐름</SectionHeader>
          <p className="text-sm text-[#4a3828] leading-relaxed">{result.this_year}</p>
        </GlassCard>

        {/* ── 인연의 한 마디 ── */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(217,93,57,0.08), rgba(93,115,157,0.08))' }}
        >
          <div className="text-lg mb-3" style={{ color: '#D95D39' }}>✦</div>
          <p className="text-base font-semibold text-[#2D2926] leading-relaxed italic">
            &ldquo;{result.quote}&rdquo;
          </p>
        </div>

        {/* ── 하단 액션 ── */}
        <div className="space-y-3 pt-2">
          <Link
            href="/"
            className="block w-full py-4 rounded-2xl text-center text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.6)', color: '#2D2926', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            내 이름 운세 풀이받기 →
          </Link>
          <Link
            href="/compat"
            className="block w-full py-4 rounded-2xl text-center text-sm font-semibold"
            style={{ background: 'rgba(0,0,0,0.03)', color: '#6D6661' }}
          >
            다른 사람과 궁합 보기
          </Link>
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
