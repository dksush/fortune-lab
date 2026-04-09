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

  // 사주 계산
  const saju = birth ? await calculateSaju(birth, gender).catch(() => null) : null

  // 이름 오행 계산
  const nameOhaeng = allSelectedHanja.map(h => ({
    character: h.character,
    reading: h.reading,
    element: getElementFromReading(h.reading),
  }))

  // 이름 점수 계산 (티저용)
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

  const elementsArr = saju ? Object.entries(saju.elements).map(([el, cnt]) => ({ el, cnt })) : []

  return (
    <main className="min-h-screen bg-[#F5EDD8] flex flex-col items-center px-4 py-10">

      {/* 헤더 */}
      <div className="text-center mb-8 w-full max-w-md">
        <div className="text-[#C4973A] text-sm tracking-[0.3em] mb-3">✦ 사주 분석표 ✦</div>
        <h1 className="text-2xl font-bold text-[#2C1A0E] mb-1 tracking-wide">
          {allSelectedHanja.length > 0
            ? allSelectedHanja.map(h => h.character).join('')
            : inputName}
          <span className="text-[#8B7355] text-base font-medium ml-2">({inputName})</span>
        </h1>
        {allSelectedHanja.length > 0 && (
          <p className="text-[#8B7355] text-sm mt-1">
            {allSelectedHanja.map(h => `${h.character} ${h.meaning} ${h.reading}`).join(' · ')}
          </p>
        )}
        <p className="text-[#C4973A] text-sm mt-2">생년월일 {birth}</p>
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-[#C4973A] to-transparent" />
      </div>

      <div className="w-full max-w-md space-y-6">

        {/* 사주 팔자 테이블 */}
        {saju && (
          <section>
            <SectionTitle>사주 팔자</SectionTitle>
            <div className="border border-[#C4A882] rounded-xl overflow-hidden">
              <table className="w-full text-center text-sm">
                <thead>
                  <tr className="bg-[#3D2B1F] text-[#FAF5EA]">
                    {pillarsArr.map(p => (
                      <th key={p.label} className="py-2 px-1 font-medium tracking-wider text-xs">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-[#FAF5EA] border-b border-[#D4B896]">
                    {pillarsArr.map(p => (
                      <td key={p.label + 'gan'} className="py-3 text-xl font-bold text-[#2C1A0E]">
                        {p.info.gan}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-[#FAF5EA]">
                    {pillarsArr.map(p => (
                      <td key={p.label + 'ji'} className="py-3 text-xl font-bold text-[#8B5A2B]">
                        {p.info.ji}
                      </td>
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
              <span className="text-xs text-[#8B7355]">일간(日干): <span className="font-bold text-[#3D2B1F]">{saju.dayMaster}</span></span>
              <span className="text-xs text-[#8B7355]">신강/신약: <span className="font-bold text-[#3D2B1F]">{saju.strengthLabel}</span></span>
            </div>
          </section>
        )}

        {/* 오행 분포 — SVG 다이어그램 */}
        {saju && (
          <section>
            <SectionTitle>오행 분포</SectionTitle>
            <div className="bg-[#FAF5EA] border border-[#C4A882] rounded-xl p-4">
              <OhaengDiagram elements={saju.elements} yongsin={saju.yongsin} />
              <div className="mt-3 pt-3 border-t border-[#D4B896] flex justify-around text-xs text-[#8B7355]">
                <span>용신 <span className="font-bold text-[#3D2B1F]">{saju.yongsinLabel}</span></span>
                <span>기신 <span className="font-bold text-[#3D2B1F]">{saju.gisinLabel}</span></span>
              </div>
            </div>
          </section>
        )}

        {/* 이름 점수 — 티저 (상세는 결제 후) */}
        {nameScore && (
          <section>
            <SectionTitle>이름 점수</SectionTitle>
            <div className="bg-[#FAF5EA] border border-[#C4A882] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-4xl font-black text-[#2C1A0E]">
                    {nameScore.total}
                    <span className="text-lg font-medium text-[#8B7355] ml-1">점</span>
                  </p>
                  <p className="text-xs text-[#C4973A] font-bold mt-1">{scoreToPercentile(nameScore.total)}</p>
                </div>
                <div className="w-24">
                  <div className="bg-[#EDE0C8] rounded-full h-2.5 overflow-hidden">
                    <div className="h-full rounded-full bg-[#C4973A]" style={{ width: `${nameScore.total}%` }} />
                  </div>
                  <p className="text-[10px] text-[#B0A090] mt-1 text-right">100점 만점</p>
                </div>
              </div>
              {/* 항목 블러 티저 */}
              <div className="relative border-t border-[#D4B896] pt-3">
                <div className="space-y-2 blur-sm select-none pointer-events-none" aria-hidden>
                  {['용신 일치도', '오행 균형', '한자 뜻 긍정성'].map(label => (
                    <div key={label} className="flex justify-between">
                      <span className="text-xs text-[#3D2B1F]">{label}</span>
                      <span className="text-xs font-bold text-[#2C1A0E]">??점</span>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[11px] text-[#8B5A2B] font-bold bg-[#FFF9ED] px-3 py-1 border border-[#C4973A] rounded-full">
                    항목별 분석은 결제 후 공개
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 이름의 오행 */}
        {nameOhaeng.length > 0 && (
          <section>
            <SectionTitle>이름의 오행</SectionTitle>
            <div className="bg-[#FAF5EA] border border-[#C4A882] rounded-xl p-4">
              <div className="flex gap-3 justify-center">
                {nameOhaeng.map((h, i) => {
                  const c = ELEMENT_COLOR[h.element] ?? { bg: '#999', text: '#fff', border: '#666' }
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1">
                      <div className="text-2xl font-bold text-[#2C1A0E]">{h.character}</div>
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
            </div>
          </section>
        )}

        {/* 대운표 */}
        {saju && saju.daeun.cycles.length > 0 && (
          <section>
            <SectionTitle>대운표 <span className="text-xs font-normal text-[#8B7355]">(10년 주기, {saju.daeun.startAge}세 시작)</span></SectionTitle>
            <div className="border border-[#C4A882] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#3D2B1F] text-[#FAF5EA]">
                    <th className="py-2 px-2 text-xs font-medium text-center">나이</th>
                    <th className="py-2 px-2 text-xs font-medium text-center">천간</th>
                    <th className="py-2 px-2 text-xs font-medium text-center">지지</th>
                  </tr>
                </thead>
                <tbody>
                  {saju.daeun.cycles.slice(0, 6).map((c, i) => {
                    const ganInfo = GANJIBRANCH[c.gan]
                    const jiInfo = GANJIBRANCH[c.ji]
                    return (
                      <tr key={i} className={`border-t border-[#D4B896] ${i % 2 === 0 ? 'bg-[#FAF5EA]' : 'bg-[#F0E6CC]'}`}>
                        <td className="py-2.5 px-2 text-xs text-[#8B7355] text-center">{c.startAge}~{c.endAge}세</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-lg font-bold text-[#2C1A0E]">{c.gan}</span>
                          {ganInfo && <span className="block text-[10px] text-[#8B7355]">{ganInfo.nature}</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-lg font-bold text-[#8B5A2B]">{c.ji}</span>
                          {jiInfo && <span className="block text-[10px] text-[#8B7355]">{jiInfo.element}·{jiInfo.nature}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[#B0A090] text-xs mt-2 text-center">결제 후 각 대운 기간의 개인화 해설을 확인할 수 있습니다</p>
          </section>
        )}

        <div className="h-px bg-[#D4B896]" />

        {/* AI 해석 미리보기 (블러 처리) */}
        <section>
          <SectionTitle>AI 이름·사주 전체 해석</SectionTitle>
          <div className="relative rounded-xl overflow-hidden border border-[#C4A882]">
            <div className="bg-[#FAF5EA] p-5 space-y-3 text-sm text-[#3D2B1F] leading-relaxed select-none blur-sm pointer-events-none" aria-hidden="true">
              <p className="font-bold text-base">✦ {inputName}의 한자 기운</p>
              {allSelectedHanja.length > 0 ? allSelectedHanja.map((h, i) => (
                <p key={i}><span className="font-bold">{h.character}({h.reading})</span> — 이 글자가 지닌 기운은 깊고 고요한 산처럼 내면의 중심을 잡아주며, 삶의 굴곡 속에서도 흔들리지 않는 본질적 힘을 부여합니다. 타고난 직관과 섬세한 감각이 어우러져 주변을 이끄는 자연스러운 카리스마가 깃들어 있습니다.</p>
              )) : (
                <p>이름의 기운이 깊고 고요한 산처럼 내면의 중심을 잡아주며, 삶의 굴곡 속에서도 흔들리지 않는 본질적 힘을 부여합니다.</p>
              )}
              <p className="font-bold mt-4">✦ 이름과 사주의 조화</p>
              <p>사주의 기운과 이름이 빚어내는 조화는 마치 봄비가 대지를 적시듯 자연스럽습니다. 일간의 기운이 이름 속 오행과 상생하며 삶의 방향을 밝혀주고 있습니다.</p>
              <p className="font-bold mt-4">✦ 올해의 운세</p>
              <p>올해는 이름 속 기운이 특히 강하게 작용하는 해입니다. 새로운 시작과 변화의 물결이 일어나며 중요한 선택의 기로에 서게 될 것입니다.</p>
            </div>
            {/* 블러 오버레이 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#F5EDD8]/20 via-[#F5EDD8]/70 to-[#F5EDD8]">
              <div className="text-center px-6 pb-4 pt-16">
                <p className="text-[#C4973A] text-sm font-medium mb-1">✦</p>
                <p className="text-[#3D2B1F] font-bold text-base mb-1">전체 해석은 결제 후 공개됩니다</p>
                <p className="text-[#8B7355] text-xs leading-relaxed">
                  한자 뜻풀이 · 이름×사주 조화 분석<br />올해 운세 · 재능·재물·인간관계 방향 · 총평
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 결제 CTA */}
        <div className="space-y-3 pt-2 pb-6">
          <PaymentButtonPreview
            inputName={inputName}
            hanjaIds={hanjaIds}
            extraHanja={extraHanja}
            birthDate={birth}
            gender={gender}
          />
          <p className="text-center text-[#B0A090] text-xs">
            결제 후 AI가 생성한 전체 해석을 바로 확인할 수 있습니다
          </p>
        </div>

      </div>
    </main>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[#3D2B1F] text-sm font-bold mb-2 tracking-wide flex items-center gap-2">
      <span className="text-[#C4973A]">◆</span>
      {children}
    </h2>
  )
}
