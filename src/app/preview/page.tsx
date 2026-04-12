import { calculateSaju, getElementFromReading, GANJIBRANCH } from '@/lib/saju'
import { calcNameScore, scoreToPercentile } from '@/lib/name-score'
import type { Gender } from '@gracefullight/saju'
import { PaymentButtonPreview } from '@/components/payment/PaymentButtonPreview'
import { OhaengDiagram } from '@/components/result/OhaengDiagram'

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

  const pillarsArr = saju ? [
    { label: '년주', info: saju.pillars.year },
    { label: '월주', info: saju.pillars.month },
    { label: '일주', info: saju.pillars.day },
    ...(saju.pillars.hour ? [{ label: '시주', info: saju.pillars.hour }] : []),
  ] : []

  return (
    <main className="ethereal-gradient min-h-screen flex flex-col items-center px-6 pt-12 pb-40 overflow-x-hidden relative">

      {/* 배경 장식 블러 */}
      <div className="fixed top-[-10%] right-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(120px)' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(93,115,157,0.08)', filter: 'blur(120px)' }} />

      <div className="w-full max-w-md flex flex-col gap-8 relative z-10">

        {/* ── 히어로: 이름 ── */}
        <header className="text-center space-y-4">
          <p className="text-xs text-[#6D6661] tracking-[0.25em] uppercase">사주 분석표</p>

          {/* 한자 크게 */}
          {allSelectedHanja.length > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-center gap-3">
                {allSelectedHanja.map((h, i) => (
                  <span key={i} className="font-serif text-5xl font-bold text-[#2D2926]">
                    {h.character}
                  </span>
                ))}
              </div>
              <h1 className="font-serif text-xl text-[#2D2926]">{inputName}</h1>
              <p className="text-xs text-[#6D6661] leading-relaxed">
                {allSelectedHanja.map(h => `${h.character} ${h.meaning} ${h.reading}`).join(' · ')}
              </p>
            </div>
          ) : (
            <h1 className="font-serif text-4xl font-bold text-[#2D2926] tracking-wide">{inputName}</h1>
          )}

          {birth && (
            <p className="text-sm font-medium" style={{ color: '#D95D39' }}>{birth} 生</p>
          )}

          <div className="h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(217,93,57,0.4), transparent)' }} />
        </header>

        {/* ── 이름 점수 (가장 위 — 강한 후킹) ── */}
        {nameScore && (
          <GlassCard>
            <SectionLabel>이름 점수</SectionLabel>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-6xl font-black text-[#2D2926] leading-none">
                  {nameScore.total}
                  <span className="text-xl font-medium text-[#6D6661] ml-1">점</span>
                </p>
                {/* percentile — 핵심 후킹 */}
                <p className="text-sm font-bold mt-2" style={{ color: '#D95D39' }}>
                  {scoreToPercentile(nameScore.total)}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-[#6D6661]">100점 만점</p>
                <div className="w-28 rounded-full h-3 overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${nameScore.total}%`, background: 'linear-gradient(to right, #D95D39, #F28C6A)' }}
                  />
                </div>
              </div>
            </div>
            {/* 항목별 블러 티저 */}
            <div className="relative border-t pt-3" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <div className="space-y-2 blur-sm select-none pointer-events-none" aria-hidden>
                {['용신 일치도', '오행 균형', '한자 뜻 긍정성'].map(label => (
                  <div key={label} className="flex justify-between">
                    <span className="text-sm text-[#2D2926]">{label}</span>
                    <span className="text-sm font-bold text-[#2D2926]">??점</span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                  style={{ background: 'linear-gradient(to right, #D95D39, #F28C6A)' }}>
                  항목별 분석은 결제 후 공개
                </span>
              </div>
            </div>
          </GlassCard>
        )}

        {/* ── 사주 팔자 ── */}
        {saju && (
          <GlassCard>
            <SectionLabel>사주 팔자</SectionLabel>
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <table className="w-full text-center text-sm">
                <thead>
                  <tr style={{ background: '#2D2926' }}>
                    {pillarsArr.map(p => (
                      <th key={p.label} className="py-2.5 px-1 font-medium tracking-wider text-xs text-white/90">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {pillarsArr.map(p => (
                      <td key={p.label + 'gan'} className="py-3 text-xl font-bold text-[#2D2926]">
                        {p.info.gan}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ background: 'rgba(255,255,255,0.4)' }}>
                    {pillarsArr.map(p => (
                      <td key={p.label + 'ji'} className="py-3 text-xl font-bold" style={{ color: '#D95D39' }}>
                        {p.info.ji}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-between mt-3 text-xs text-[#6D6661] px-1">
              <span>일간 <span className="font-bold text-[#2D2926]">{saju.dayMaster}</span></span>
              <span>신강/신약 <span className="font-bold text-[#2D2926]">{saju.strengthLabel}</span></span>
              <span>용신 <span className="font-bold text-[#2D2926]">{saju.yongsinLabel}</span></span>
            </div>
          </GlassCard>
        )}

        {/* ── 오행 분포 ── */}
        {saju && (
          <GlassCard>
            <SectionLabel>오행 분포</SectionLabel>
            <OhaengDiagram elements={saju.elements} yongsin={saju.yongsin} />
            <div className="flex justify-around mt-3 pt-3 text-xs text-[#6D6661]"
              style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <span>용신 <span className="font-bold text-[#2D2926]">{saju.yongsinLabel}</span></span>
              <span>기신 <span className="font-bold text-[#2D2926]">{saju.gisinLabel}</span></span>
            </div>
          </GlassCard>
        )}

        {/* ── 이름의 오행 ── */}
        {nameOhaeng.length > 0 && (
          <GlassCard>
            <SectionLabel>이름의 오행</SectionLabel>
            <div className="flex gap-3 justify-center">
              {nameOhaeng.map((h, i) => {
                const c = ELEMENT_COLOR[h.element] ?? { bg: '#999', text: '#fff' }
                return (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <span className="text-2xl font-bold text-[#2D2926]">{h.character}</span>
                    <span className="text-xs text-[#6D6661]">{h.reading}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: c.bg, color: c.text }}>
                      {ELEMENT_LABEL[h.element]}
                    </span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )}

        {/* ── 대운표 ── */}
        {saju && saju.daeun.cycles.length > 0 && (
          <GlassCard>
            <SectionLabel>
              대운표
              <span className="text-xs font-normal text-[#6D6661] ml-1">({saju.daeun.startAge}세 시작, 10년 주기)</span>
            </SectionLabel>
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#2D2926' }}>
                    <th className="py-2 px-2 text-xs font-medium text-center text-white/90">나이</th>
                    <th className="py-2 px-2 text-xs font-medium text-center text-white/90">천간</th>
                    <th className="py-2 px-2 text-xs font-medium text-center text-white/90">지지</th>
                  </tr>
                </thead>
                <tbody>
                  {saju.daeun.cycles.slice(0, 6).map((c, i) => {
                    const ganInfo = GANJIBRANCH[c.gan]
                    const jiInfo = GANJIBRANCH[c.ji]
                    return (
                      <tr key={i} style={{
                        background: i % 2 === 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
                        borderTop: '1px solid rgba(0,0,0,0.05)',
                      }}>
                        <td className="py-2.5 px-2 text-xs text-[#6D6661] text-center">{c.startAge}~{c.endAge}세</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-lg font-bold text-[#2D2926]">{c.gan}</span>
                          {ganInfo && <span className="block text-[10px] text-[#6D6661]">{ganInfo.nature}</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-lg font-bold" style={{ color: '#D95D39' }}>{c.ji}</span>
                          {jiInfo && <span className="block text-[10px] text-[#6D6661]">{jiInfo.element}·{jiInfo.nature}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#6D6661] mt-2 text-center">결제 후 각 대운 기간의 개인화 해설을 확인할 수 있습니다</p>
          </GlassCard>
        )}

        {/* ── AI 해석 블러 티저 ── */}
        <GlassCard>
          <SectionLabel>AI 이름·사주 전체 해석</SectionLabel>
          <div className="relative rounded-2xl overflow-hidden">
            {/* 블러 처리된 샘플 텍스트 */}
            <div className="p-4 space-y-3 text-sm text-[#2D2926] leading-relaxed select-none blur-sm pointer-events-none" aria-hidden="true">
              <p className="font-bold">✦ {inputName}의 한자 기운</p>
              {allSelectedHanja.length > 0 ? allSelectedHanja.map((h, i) => (
                <p key={i}>
                  <span className="font-bold">{h.character}({h.reading})</span> — 이 글자가 지닌 기운은 깊고 고요한 산처럼 내면의 중심을 잡아주며, 삶의 굴곡 속에서도 흔들리지 않는 본질적 힘을 부여합니다.
                </p>
              )) : (
                <p>이름의 기운이 깊고 고요한 산처럼 내면의 중심을 잡아주며, 삶의 굴곡 속에서도 흔들리지 않는 본질적 힘을 부여합니다.</p>
              )}
              <p className="font-bold mt-2">✦ 이름과 사주의 조화</p>
              <p>사주의 기운과 이름이 빚어내는 조화는 마치 봄비가 대지를 적시듯 자연스럽습니다.</p>
              <p className="font-bold mt-2">✦ 올해의 운세</p>
              <p>올해는 이름 속 기운이 특히 강하게 작용하는 해입니다.</p>
            </div>
            {/* 블러 오버레이 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: 'linear-gradient(to bottom, rgba(252,249,247,0.1) 0%, rgba(252,249,247,0.85) 40%, #FCF9F7 100%)' }}>
              <div className="text-center px-6 pb-4 pt-20">
                <p className="text-[#2D2926] font-bold text-base mb-2">전체 해석은 결제 후 공개됩니다</p>
                <p className="text-sm text-[#6D6661] leading-relaxed">
                  한자 뜻풀이 · 이름×사주 조화<br />올해 운세 · 재능·재물·인간관계 · 총평
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ── 가치 제안 카피 ── */}
        <div className="text-center space-y-2 py-2">
          <p className="font-serif text-base text-[#2D2926]">☕ 커피 한 잔 값으로</p>
          <p className="font-serif text-xl font-bold text-[#2D2926]">내 이름이 운명에 미치는 영향을</p>
          <p className="font-serif text-xl font-bold text-[#2D2926]">지금 확인하세요</p>
          <p className="text-xs text-[#6D6661] mt-2">결제 완료 즉시 AI 전체 해석을 확인할 수 있습니다</p>
        </div>

      </div>

      {/* ── Sticky 하단 결제 CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #FCF9F7 55%, transparent)' }}>
        <div className="max-w-md mx-auto px-6 pb-6 pt-8 pointer-events-auto">
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
    <div className="glass-panel rounded-3xl p-5 shadow-sm">
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#D95D39' }}>
      {children}
    </p>
  )
}
