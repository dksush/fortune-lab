import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { ShareActions } from '@/components/share/ShareActions'
import { FortuneResult } from '@/lib/fortune'

interface Props {
  params: Promise<{ uuid: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uuid } = await params
  const supabase = createServiceClient()
  const { data } = await supabase.from('fortunes').select('input_name').eq('id', uuid).single()
  return {
    title: data ? `${data.input_name}의 이름 풀이` : '이름 풀이',
    openGraph: {
      images: [`${process.env.NEXT_PUBLIC_BASE_URL}/api/og/${uuid}`],
    },
  }
}

const ELEMENT_STYLE: Record<string, { label: string; circle: string; border: string }> = {
  '木': { label: '목', circle: '#4A7C59', border: '#52B788' },
  '火': { label: '화', circle: '#B23A3A', border: '#E06C4B' },
  '土': { label: '토', circle: '#C4973A', border: '#D4AC0D' },
  '金': { label: '금', circle: '#9C8B7A', border: '#9E9E9E' },
  '水': { label: '수', circle: '#3D5A80', border: '#4A90D9' },
}

function readingToElement(reading: string): string {
  if (!reading) return '木'
  const code = reading.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '木'
  const idx = Math.floor((code - 0xac00) / (21 * 28))
  const map: Record<number, string> = {
    0: '木', 1: '木', 15: '木',
    2: '火', 3: '火', 4: '火', 5: '火', 16: '火',
    6: '土', 7: '土', 8: '土', 17: '土',
    9: '金', 10: '金', 12: '金', 13: '金', 14: '金',
    11: '水', 18: '水',
  }
  return map[idx] ?? '木'
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="w-1.5 h-6 bg-[#C4973A] shrink-0" />
      <h2 className="text-xl font-bold text-[#2C1A0E]">{title}</h2>
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

export default async function ResultPage({ params }: Props) {
  const { uuid } = await params
  const supabase = createServiceClient()

  const { data: fortune } = await supabase
    .from('fortunes')
    .select('*')
    .eq('id', uuid)
    .single()

  if (!fortune) notFound()

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

  let fortuneResult: FortuneResult | null = null
  if (fortune.result) {
    try {
      fortuneResult = JSON.parse(fortune.result) as FortuneResult
    } catch {
      // 구형 포맷 — fallback
    }
  }

  const syllables = fortune.input_name.split('')
  const elementSet = new Set(hanjaData.map(h => readingToElement(h.reading)))

  const narrativeMap: Record<number, string> = {}
  if (fortuneResult?.hanja) {
    fortuneResult.hanja.forEach((h, i) => {
      const pos = hanjaData[i]?.pos ?? i
      narrativeMap[pos] = h.narrative
    })
  }

  return (
    <main className="min-h-screen bg-[#F5EDD8]">
      <div className="max-w-[480px] mx-auto px-6 pt-10 pb-20 space-y-12">

        {/* 헤더 */}
        <section className="text-center">
          <div className="inline-block border border-[#D4B896] p-1">
            <div className="border border-[#D4B896] px-8 py-10 bg-[#FAF5EA]">
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
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-[#C4973A] to-transparent" />

        {/* 이름의 기운 (오행) */}
        {elementSet.size > 0 && (
          <section>
            <SectionHeader title="이름의 기운" />
            <Card>
              <div className="flex justify-between items-center max-w-xs mx-auto">
                {['木', '火', '土', '金', '水'].map(el => {
                  const active = elementSet.has(el)
                  const s = ELEMENT_STYLE[el]
                  return (
                    <div key={el} className="flex flex-col items-center gap-2">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${active ? 'shadow-md' : 'opacity-25'}`}
                        style={{ backgroundColor: active ? s.circle : '#B0A090', ...(active ? { outline: `2px solid ${s.border}`, outlineOffset: '2px' } : {}) }}
                      >
                        {el}
                      </div>
                      <span className={`text-xs font-medium ${active ? 'text-[#3D2B1F]' : 'text-[#B0A090]'}`}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
              {fortuneResult?.element_summary && (
                <p className="mt-6 text-sm text-[#3D2B1F] leading-relaxed text-center italic">
                  "{fortuneResult.element_summary}"
                </p>
              )}
            </Card>
          </section>
        )}

        {/* 이름 뜻풀이 */}
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
          </section>
        )}

        {/* 이름의 종합 기운 */}
        {fortuneResult?.combined && (
          <section>
            <SectionHeader title="이름의 종합 기운" />
            <div className="border-l-2 border-[#C4973A] pl-6 py-2">
              <p className="text-sm leading-loose text-[#3D2B1F]">{fortuneResult.combined}</p>
            </div>
          </section>
        )}

        {/* 이름과 사주 */}
        {fortuneResult?.saju && (
          <section>
            <SectionHeader title="이름과 사주" />
            <div className="space-y-4">
              <Card>
                <SubSection label="타고난 기운">
                  {fortuneResult.saju.innate}
                </SubSection>
              </Card>
              <Card>
                <SubSection label="이름과 사주의 조화">
                  {fortuneResult.saju.harmony}
                </SubSection>
              </Card>
              <Card>
                <SubSection label={`${new Date().getFullYear()}년 올해의 운세`}>
                  {fortuneResult.saju.this_year}
                </SubSection>
              </Card>
            </div>
          </section>
        )}

        {/* 인생의 방향 */}
        {fortuneResult?.life_direction && (
          <section>
            <SectionHeader title="인생의 방향" />
            <Card>
              <div className="space-y-5">
                <SubSection label="재능과 적성">
                  {fortuneResult.life_direction.talent}
                </SubSection>
                <div className="h-px bg-[#D4B896]" />
                <SubSection label="재물과 직업">
                  {fortuneResult.life_direction.wealth}
                </SubSection>
                <div className="h-px bg-[#D4B896]" />
                <SubSection label="인간관계">
                  {fortuneResult.life_direction.relationships}
                </SubSection>
              </div>
            </Card>
          </section>
        )}

        {/* 총평 */}
        {fortuneResult && (
          <section className="text-center">
            {fortuneResult.keywords?.length > 0 && (
              <div className="flex justify-center gap-2 flex-wrap mb-8">
                {fortuneResult.keywords.map((kw, i) => (
                  <span key={i} className="px-4 py-1 border border-[#D4B896] text-xs font-bold text-[#8B5A2B]">#{kw}</span>
                ))}
              </div>
            )}
            <div className="py-10 px-6 bg-[#FAF5EA] border-y border-[#D4B896]">
              {fortuneResult.overall && (
                <p className="text-base font-bold text-[#2C1A0E] mb-6 leading-relaxed">{fortuneResult.overall}</p>
              )}
              {fortuneResult.quote && (
                <p className="italic text-[#8B5A2B] text-sm">'{fortuneResult.quote}'</p>
              )}
            </div>
          </section>
        )}

        {/* fallback */}
        {!fortuneResult && (
          <section className="bg-[#FAF5EA] border border-[#D4B896] p-6 text-center">
            <p className="text-[#8B7355] text-sm">풀이를 불러오는 중입니다…</p>
          </section>
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-[#C4973A] to-transparent" />

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
