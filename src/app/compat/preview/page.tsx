import { calculateSaju, getElementFromReading } from '@/lib/saju'
import type { Gender } from '@gracefullight/saju'
import { PaymentButtonCompat } from '@/components/payment/PaymentButtonCompat'

interface CompatHanja {
  pos: number
  character: string
  reading: string
  meaning: string
}

function decodeB64(str: string): CompatHanja[] {
  try {
    return JSON.parse(Buffer.from(str, 'base64').toString('utf-8'))
  } catch {
    return []
  }
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

const RELATION_LABEL: Record<string, string> = {
  lover: '연인 · 썸',
  friend: '친구',
  family: '가족',
}

function getConnector(relationType: string): string {
  if (relationType === 'lover') return '♥'
  if (relationType === 'family') return '∞'
  return '✦'
}

function getElementBars(birth: string, gender: Gender, hanja: CompatHanja[]) {
  const nameOhaeng = hanja.map(h => getElementFromReading(h.reading))
  return { nameOhaeng }
}

export default async function CompatPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    myName?: string; myBirth?: string; myGender?: string; myHanja?: string
    partnerName?: string; partnerBirth?: string; partnerGender?: string; partnerHanja?: string
    relationType?: string
  }>
}) {
  const params = await searchParams

  const myName = params.myName ?? ''
  const myBirth = params.myBirth ?? ''
  const myGender: Gender = params.myGender === 'female' ? 'female' : 'male'
  const myHanja = params.myHanja ? decodeB64(decodeURIComponent(params.myHanja)) : []

  const partnerName = params.partnerName ?? ''
  const partnerBirth = params.partnerBirth ?? ''
  const partnerGender: Gender = params.partnerGender === 'female' ? 'female' : 'male'
  const partnerHanja = params.partnerHanja ? decodeB64(decodeURIComponent(params.partnerHanja)) : []

  const relationType = params.relationType ?? 'lover'

  const [mySaju, partnerSaju] = await Promise.all([
    myBirth ? calculateSaju(myBirth, myGender).catch(() => null) : null,
    partnerBirth ? calculateSaju(partnerBirth, partnerGender).catch(() => null) : null,
  ])

  const myElements = mySaju ? (mySaju.elements as unknown as Record<string, number>) : null
  const partnerElements = partnerSaju ? (partnerSaju.elements as unknown as Record<string, number>) : null
  const myTotal = myElements ? OHAENG_ELEMENTS.reduce((s, el) => s + (myElements[el] ?? 0), 0) : 0
  const partnerTotal = partnerElements ? OHAENG_ELEMENTS.reduce((s, el) => s + (partnerElements[el] ?? 0), 0) : 0

  // 이름 오행
  const myNameOhaeng = myHanja.map(h => getElementFromReading(h.reading))
  const partnerNameOhaeng = partnerHanja.map(h => getElementFromReading(h.reading))

  const currentYear = new Date().getFullYear()

  return (
    <main className="ethereal-gradient min-h-screen">
      {/* 배경 블러 장식 */}
      <div className="fixed top-[-10%] right-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(120px)' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(93,115,157,0.08)', filter: 'blur(120px)' }} />

      <div className="relative z-10 max-w-[480px] mx-auto px-4 pt-6 pb-44 space-y-3">

        {/* ── 관계 유형 뱃지 ── */}
        <div className="flex justify-center">
          <span
            className="text-xs font-bold tracking-[0.15em] px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(217,93,57,0.1)', color: '#D95D39' }}
          >
            ✦ {RELATION_LABEL[relationType] ?? relationType} 궁합
          </span>
        </div>

        {/* ── 두 사람 히어로 카드 ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* 나 */}
          <PersonCard
            name={myName}
            hanja={myHanja}
            birth={myBirth}
            gender={myGender}
            elements={myElements}
            total={myTotal}
            nameOhaeng={myNameOhaeng}
            label="나"
          />
          {/* 상대방 */}
          <PersonCard
            name={partnerName}
            hanja={partnerHanja}
            birth={partnerBirth}
            gender={partnerGender}
            elements={partnerElements}
            total={partnerTotal}
            nameOhaeng={partnerNameOhaeng}
            label="상대방"
          />
        </div>

        {/* ── 관계 연결 기호 ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(217,93,57,0.2)' }} />
          <span className="text-lg" style={{ color: '#D95D39' }}>{getConnector(relationType)}</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(217,93,57,0.2)' }} />
        </div>

        {/* ── 오행 비교 (공개) ── */}
        {myElements && partnerElements && (
          <GlassCard>
            <SectionHeader>오행 기운 비교</SectionHeader>
            <div className="space-y-2">
              {OHAENG_ELEMENTS.map(el => {
                const myPct = myTotal > 0 ? Math.round(((myElements[el] ?? 0) / myTotal) * 100) : 20
                const ptPct = partnerTotal > 0 ? Math.round(((partnerElements[el] ?? 0) / partnerTotal) * 100) : 20
                return (
                  <div key={el} className="flex items-center gap-2">
                    <span className="text-[10px] text-[#6D6661] w-8 shrink-0 text-center">{ELEMENT_ICON[el]}</span>
                    {/* 나 (왼쪽 → 오른쪽) */}
                    <div className="flex-1 flex justify-end">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.max(myPct, 4)}%`, background: ELEMENT_COLOR[el] }} />
                    </div>
                    <span className="text-[10px] text-[#9D9690] w-6 text-center shrink-0">{el}</span>
                    {/* 상대방 (왼쪽 → 오른쪽) */}
                    <div className="flex-1">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.max(ptPct, 4)}%`, background: ELEMENT_COLOR[el], opacity: 0.6 }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-[#9D9690] mt-3 pt-2"
              style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <span>← {myName}</span>
              <span>{partnerName} →</span>
            </div>
          </GlassCard>
        )}

        {/* ── 궁합 점수 (블러) ── */}
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
            <SectionHeader>궁합 점수</SectionHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(217,93,57,0.1)', border: '3px solid rgba(217,93,57,0.3)' }}>
                <span className="text-3xl font-black" style={{ color: '#D95D39' }}>78</span>
              </div>
              <div>
                <div className="text-base font-bold text-[#2D2926]">좋은 인연</div>
                <div className="text-xs text-[#6D6661]">상위 22%의 궁합</div>
              </div>
            </div>
            <p className="text-sm text-[#2D2926] leading-relaxed">
              두 사람의 이름에 담긴 기운이 서로를 보완하며 아름다운 조화를 이룹니다.
              함께할수록 더욱 빛나는 인연입니다.
            </p>
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
            <div className="text-sm font-semibold text-[#2D2926]">궁합 전체 풀이 열람하기</div>
            <div className="text-xs text-[#6D6661] text-center leading-relaxed">
              결제 후 즉시 공개
            </div>
          </div>
        </div>

        {/* ── 포함 내용 리스트 ── */}
        <GlassCard>
          <SectionHeader>전체 풀이에 포함된 내용</SectionHeader>
          <ul className="space-y-2.5">
            {[
              { icon: '💯', label: '궁합 점수 & 등급', desc: '100점 만점의 상세 수치' },
              { icon: '☯️', label: '오행 상생·상극 분석', desc: '두 기운이 만나는 방식' },
              { icon: '🔤', label: '이름 한자 교차 분석', desc: '각 한자가 상대에게 주는 영향' },
              { icon: '✨', label: '함께할 때 강점', desc: '시너지가 나는 구체적 장면' },
              { icon: '⚠️', label: '주의할 갈등 포인트', desc: '충돌 지점과 해소 방법' },
              { icon: '📅', label: `${currentYear}년 두 사람의 흐름`, desc: '올해 함께하면 좋은 것들' },
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

        {/* ── 개인화 배너 ── */}
        <div className="rounded-2xl p-3 border border-white/40 text-center text-xs text-[#6D6661] leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          이 분석은 <strong className="text-[#2D2926]">{myName}</strong>님과 <strong className="text-[#2D2926]">{partnerName}</strong>님만을 위해 생성된 결과입니다
        </div>

      </div>

      {/* ── Sticky 하단 결제 CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #FCF9F7 55%, transparent)' }}>
        <div className="max-w-[480px] mx-auto px-4 pb-6 pt-8 pointer-events-auto">
          <PaymentButtonCompat
            myName={myName}
            myBirth={myBirth}
            myGender={myGender}
            myHanja={myHanja}
            partnerName={partnerName}
            partnerBirth={partnerBirth}
            partnerGender={partnerGender}
            partnerHanja={partnerHanja}
            relationType={relationType}
          />
        </div>
      </div>
    </main>
  )
}

function PersonCard({
  name, hanja, birth, gender, elements, total, nameOhaeng, label,
}: {
  name: string
  hanja: CompatHanja[]
  birth: string
  gender: Gender
  elements: Record<string, number> | null
  total: number
  nameOhaeng: string[]
  label: string
}) {
  const birthShort = birth ? birth.split(' ')[0] : null

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #1E1A18 0%, #3D2010 60%, #1E1A18 100%)' }}
    >
      <div className="absolute top-[-20px] right-[-20px] w-20 h-20 rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.1)' }} />

      <div className="relative">
        <div className="text-[9px] tracking-[1.5px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          ✦ {label}
        </div>
        <div className="text-2xl font-black text-white tracking-[-0.5px] mb-0.5">{name}</div>
        {hanja.length > 0 && (
          <div className="text-sm font-light tracking-[2px] mb-1" style={{ color: '#D95D39' }}>
            {hanja.map(h => h.character).join('')}
          </div>
        )}
        {birthShort && (
          <div className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{birthShort}</div>
        )}

        {/* 오행 미니바 */}
        {elements && (
          <div className="flex gap-0.5">
            {OHAENG_ELEMENTS.map(el => {
              const pct = total > 0 ? Math.round(((elements[el] ?? 0) / total) * 100) : 20
              return (
                <div key={el} className="flex-1 rounded-sm overflow-hidden" style={{ height: 3, background: 'rgba(0,0,0,0.2)' }}>
                  <div className="h-full rounded-sm" style={{ width: `${Math.max(pct, 4)}%`, background: ELEMENT_COLOR[el] }} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
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
