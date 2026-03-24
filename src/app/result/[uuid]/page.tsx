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

export default async function ResultPage({ params }: Props) {
  const { uuid } = await params
  const supabase = createServiceClient()

  const { data: fortune } = await supabase
    .from('fortunes')
    .select('*')
    .eq('id', uuid)
    .single()

  if (!fortune) notFound()

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* 이름 헤더 */}
        <div className="text-center">
          <div className="text-yellow-400 text-sm tracking-widest mb-2">✦ 이름 풀이 ✦</div>
          <h1 className="text-5xl font-bold tracking-widest text-white" data-testid="fortune-name">
            {fortune.input_name}
          </h1>
        </div>

        {/* 풀이 본문 */}
        <div
          data-testid="fortune-content"
          className="bg-purple-950/40 border border-purple-800 rounded-2xl p-6 space-y-4"
        >
          {fortune.result
            ? fortune.result.split('\n').map((line: string, i: number) => (
                <p key={i} className={`text-sm leading-relaxed ${line.startsWith('**') ? 'text-yellow-400 font-semibold text-base' : 'text-purple-100'}`}>
                  {line.replace(/\*\*/g, '')}
                </p>
              ))
            : <p className="text-purple-400 text-sm">풀이를 불러오는 중입니다...</p>
          }
        </div>

        {/* 공유 */}
        <div className="space-y-3">
          <p className="text-center text-purple-400 text-xs">친구에게 공유해보세요</p>
          <ShareActions uuid={uuid} inputName={fortune.input_name} />
        </div>

        {/* 나도 하기 CTA */}
        <Link
          href="/"
          className="block w-full py-4 text-center bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-purple-950 font-bold rounded-2xl transition-all shadow-lg shadow-yellow-500/20"
        >
          나도 하기 →
        </Link>
      </div>
    </main>
  )
}
