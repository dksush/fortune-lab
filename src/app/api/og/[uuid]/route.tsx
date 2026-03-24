import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params
  const supabase = createServiceClient()

  const { data: fortune } = await supabase
    .from('fortunes')
    .select('input_name, result, reading_raw')
    .eq('id', uuid)
    .single()

  const name = fortune?.input_name ?? '이름'
  const summary = fortune?.result
    ? fortune.result.split('\n').find((l: string) => l.trim().length > 10) ?? ''
    : ''
  const shortSummary = summary.replace(/\*\*/g, '').slice(0, 40)

  const fontData = await readFile(join(process.cwd(), 'public/fonts/Pretendard-Bold.ttf'))

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #2D1B69 0%, #1a0f3d 50%, #0d0720 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Pretendard',
          position: 'relative',
        }}
      >
        {/* 배경 장식 */}
        <div style={{
          position: 'absolute', top: '40px', right: '60px',
          fontSize: '120px', opacity: 0.08, color: '#C9A84C',
          display: 'flex',
        }}>
          ✦
        </div>

        {/* 서비스명 */}
        <div style={{
          fontSize: '22px', color: '#C9A84C', letterSpacing: '6px',
          marginBottom: '24px', display: 'flex',
        }}>
          이름 풀이
        </div>

        {/* 이름 */}
        <div style={{
          fontSize: '88px', color: '#ffffff', fontWeight: 700,
          letterSpacing: '12px', marginBottom: '32px', display: 'flex',
        }}>
          {name}
        </div>

        {/* 구분선 */}
        <div style={{
          width: '80px', height: '2px', background: '#C9A84C',
          marginBottom: '28px', display: 'flex',
        }} />

        {/* 요약 */}
        {shortSummary && (
          <div style={{
            fontSize: '26px', color: '#d4c5f0', textAlign: 'center',
            maxWidth: '800px', lineHeight: 1.6, display: 'flex',
          }}>
            {shortSummary}
          </div>
        )}

        {/* 하단 */}
        <div style={{
          position: 'absolute', bottom: '36px',
          fontSize: '18px', color: '#7c6b9e', letterSpacing: '2px',
          display: 'flex',
        }}>
          fortune-lab.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Pretendard', data: fontData, weight: 700 }],
    }
  )
}
