import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { ShareActions } from '@/components/share/ShareActions'

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

/** fortune.result 텍스트를 섹션 배열로 파싱 */
function parseSections(text: string): { title: string; body: string }[] {
  const sections: { title: string; body: string }[] = []
  const lines = text.split('\n')
  let current: { title: string; lines: string[] } | null = null

  for (const line of lines) {
    const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*(.*)$/)
    if (match) {
      if (current) sections.push({ title: current.title, body: current.lines.join('\n').trim() })
      current = { title: match[1], lines: match[2] ? [match[2]] : [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) sections.push({ title: current.title, body: current.lines.join('\n').trim() })
  return sections.filter(s => s.body)
}

const ELEMENT_STYLE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  '木': { label: '목木', bg: '#D4EDDA', text: '#2D6A4F', border: '#52B788' },
  '火': { label: '화火', bg: '#FCE4D6', text: '#922B21', border: '#E06C4B' },
  '土': { label: '토土', bg: '#FFF3CD', text: '#7D6608', border: '#D4AC0D' },
  '金': { label: '금金', bg: '#E8E8E8', text: '#4A4A4A', border: '#9E9E9E' },
  '水': { label: '수水', bg: '#D6EAF8', text: '#1A5276', border: '#4A90D9' },
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

  // 선택된 한자 데이터: extra_hanja(위치 포함 전체) 우선, 없으면 DB 조회 fallback
  type HanjaDisplay = { pos: number; character: string; reading: string; meaning: string }
  let hanjaData: HanjaDisplay[] = []

  if (Array.isArray(fortune.extra_hanja) && fortune.extra_hanja.length > 0) {
    // 신규 저장 방식: 위치 정보 포함
    hanjaData = (fortune.extra_hanja as HanjaDisplay[]).sort((a, b) => a.pos - b.pos)
  } else if (fortune.hanja_ids?.length > 0) {
    // 구 방식 fallback: DB에서 조회
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

  const syllables = fortune.input_name.split('')
  const sections = fortune.result ? parseSections(fortune.result) : []

  // 한자별 오행
  const elementSet = new Set(hanjaData.map(h => {
    const code = h.reading?.charCodeAt(0) ?? 0
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
  }))

  return (
    <main className="min-h-screen bg-[#F5EDD8]">
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">

        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="text-[#C4973A] text-xs tracking-[0.35em]">✦ 이름풀이 ✦</div>
          <h1 className="text-4xl font-bold text-[#2C1A0E] tracking-[0.2em]" data-testid="fortune-name">
            {syllables.join(' ')}
          </h1>
          {hanjaData.length > 0 && (
            <div className="flex justify-center gap-3">
              {hanjaData.map((h, i) => (
                <span key={i} className="text-[#8B5A2B] text-lg tracking-wide">{h.character}</span>
              ))}
            </div>
          )}
          <div className="mt-3 h-px bg-gradient-to-r from-transparent via-[#C4973A] to-transparent" />
        </div>

        {/* 한자 카드 */}
        {hanjaData.length > 0 && (
          <section className="bg-white/60 rounded-xl border border-[#D4B896] p-4">
            <h2 className="text-[#3D2B1F] text-sm font-semibold mb-3 flex items-center gap-1">
              <span className="text-[#C4973A]">✦</span> 이름 풀이
            </h2>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${hanjaData.length}, 1fr)` }}>
              {hanjaData.map((h) => (
                <div
                  key={h.pos}
                  className="flex flex-col items-center py-3 px-2 bg-[#FAF5EA] border border-[#D4B896] rounded-lg"
                >
                  <span className="text-3xl text-[#2C1A0E] font-bold leading-none mb-1">{h.character}</span>
                  <span className="text-base text-[#3D2B1F] font-medium">{syllables[h.pos] ?? h.reading}</span>
                  <span className="text-[10px] text-[#8B7355] text-center leading-tight mt-1">{h.meaning} {h.reading}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 이름의 기운 (오행) */}
        {elementSet.size > 0 && (
          <section className="bg-white/60 rounded-xl border border-[#D4B896] p-4">
            <h2 className="text-[#3D2B1F] text-sm font-semibold mb-3 flex items-center gap-1">
              <span className="text-[#C4973A]">✦</span> 이름의 기운
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {['木', '火', '土', '金', '水'].map(el => {
                const active = elementSet.has(el)
                const s = ELEMENT_STYLE[el]
                return (
                  <div
                    key={el}
                    className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all ${
                      active
                        ? 'opacity-100 shadow-sm'
                        : 'opacity-30'
                    }`}
                    style={active ? { background: s.bg, borderColor: s.border, color: s.text } : { background: '#F0EBE0', borderColor: '#D4B896', color: '#B0A090' }}
                  >
                    <span className="text-base font-bold">{el}</span>
                    <span className="text-[10px] mt-0.5">{s.label.slice(1)}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* AI 풀이 섹션들 */}
        {sections.length > 0 ? (
          sections.map((sec, i) => (
            <section key={i} className="bg-white/60 rounded-xl border border-[#D4B896] p-4">
              <h2 className="text-[#3D2B1F] text-sm font-semibold mb-3 flex items-center gap-1">
                <span className="text-[#C4973A]">✦</span> {sec.title}
              </h2>
              <div className="border-l-2 border-[#D4B896] pl-3">
                {sec.body.split('\n').filter(l => l.trim()).map((line, j) => (
                  <p key={j} className="text-[#3D2B1F] text-sm leading-relaxed mb-2 last:mb-0">
                    {line.replace(/\*\*/g, '')}
                  </p>
                ))}
              </div>
            </section>
          ))
        ) : fortune.result ? (
          <section className="bg-white/60 rounded-xl border border-[#D4B896] p-4" data-testid="fortune-content">
            <div className="border-l-2 border-[#D4B896] pl-3 space-y-2">
              {fortune.result.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => (
                <p key={i} className="text-[#3D2B1F] text-sm leading-relaxed">
                  {line.replace(/\*\*/g, '')}
                </p>
              ))}
            </div>
          </section>
        ) : (
          <section className="bg-white/60 rounded-xl border border-[#D4B896] p-4">
            <p className="text-[#8B7355] text-sm text-center">풀이를 불러오는 중입니다…</p>
          </section>
        )}

        {/* 구분선 */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#C4973A] to-transparent" />

        {/* 공유 */}
        <div className="space-y-3">
          <p className="text-center text-[#8B7355] text-xs tracking-wide">이 풀이를 친구에게 공유해보세요</p>
          <ShareActions uuid={uuid} inputName={fortune.input_name} />
        </div>

        {/* 나도 하기 CTA */}
        <Link
          href="/"
          className="block w-full py-4 text-center bg-[#3D2B1F] hover:bg-[#2C1A0E] text-[#FAF5EA] font-semibold rounded-xl transition-colors tracking-wide"
        >
          나도 내 이름의 기운을 알고 싶다
        </Link>

      </div>
    </main>
  )
}
