import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CONNECTOR = (relationType?: string) => {
  if (relationType === 'lover') return '♥'
  if (relationType === 'family') return '∞'
  return '✦'
}

const RELATION_LABEL: Record<string, string> = {
  lover: '연인 궁합', friend: '친구 궁합', family: '가족 궁합',
}

const SCORE_COLOR = (score: number) => {
  if (score >= 85) return '#3D8C5F'
  if (score >= 70) return '#5D739D'
  if (score >= 55) return '#B8832A'
  return '#D95D39'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params
  const supabase = createServiceClient()

  const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)
  const { data } = await (isUuidFormat
    ? supabase.from('compat_fortunes').select('my_name, partner_name, result, relation_type').eq('id', uuid).single()
    : supabase.from('compat_fortunes').select('my_name, partner_name, result, relation_type').eq('short_id', uuid).single())

  const myName = data?.my_name ?? '?'
  const partnerName = data?.partner_name ?? '?'

  let score = 0
  let scoreLabel = ''
  let summary = ''
  if (data?.result) {
    try {
      const parsed = JSON.parse(data.result)
      score = parsed.score ?? 0
      scoreLabel = parsed.score_label ?? ''
      summary = (parsed.summary ?? '').slice(0, 50)
    } catch { /* ignore */ }
  }

  const scoreColor = SCORE_COLOR(score)
  const connector = CONNECTOR(data?.relation_type)
  const relationLabel = RELATION_LABEL[data?.relation_type ?? 'lover'] ?? '궁합'
  const fontData = await readFile(join(process.cwd(), 'public/fonts/Pretendard-Bold.ttf'))

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #2D1507 0%, #3D1A08 40%, #1A0A04 100%)',
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
          position: 'absolute', top: '30px', right: '60px',
          fontSize: '140px', opacity: 0.07, color: '#D95D39',
          display: 'flex',
        }}>
          ♥
        </div>
        <div style={{
          position: 'absolute', bottom: '60px', left: '60px',
          fontSize: '100px', opacity: 0.05, color: '#D95D39',
          display: 'flex',
        }}>
          ✦
        </div>

        {/* 서비스명 + 관계유형 */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '8px', marginBottom: '32px',
        }}>
          <div style={{ fontSize: '18px', color: '#6a4a30', letterSpacing: '4px', display: 'flex' }}>
            이름 궁합 분석
          </div>
          <div style={{ fontSize: '22px', color: '#C4956A', letterSpacing: '6px', fontWeight: 700, display: 'flex' }}>
            {relationLabel}
          </div>
        </div>

        {/* 두 이름 + 하트 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          marginBottom: '28px',
        }}>
          <div style={{
            fontSize: myName.length > 3 ? '64px' : '80px',
            color: '#ffffff', fontWeight: 700,
            letterSpacing: '8px', display: 'flex',
          }}>
            {myName}
          </div>
          <div style={{
            fontSize: '48px', color: '#D95D39',
            display: 'flex', alignItems: 'center',
          }}>
            {connector}
          </div>
          <div style={{
            fontSize: partnerName.length > 3 ? '64px' : '80px',
            color: '#ffffff', fontWeight: 700,
            letterSpacing: '8px', display: 'flex',
          }}>
            {partnerName}
          </div>
        </div>

        {/* 구분선 */}
        <div style={{
          width: '80px', height: '2px',
          background: 'linear-gradient(to right, #D95D39, #F28C6A)',
          marginBottom: '24px', display: 'flex',
        }} />

        {/* 점수 + 라벨 */}
        {score > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '72px', fontWeight: 700, color: scoreColor,
              display: 'flex', lineHeight: 1,
            }}>
              {score}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '28px', color: scoreColor, fontWeight: 700, display: 'flex' }}>
                {scoreLabel}
              </div>
              <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                / 100점
              </div>
            </div>
          </div>
        )}

        {/* 요약 */}
        {summary && (
          <div style={{
            fontSize: '22px', color: 'rgba(255,255,255,0.55)', textAlign: 'center',
            maxWidth: '860px', lineHeight: 1.6, display: 'flex',
          }}>
            {summary}
          </div>
        )}

        {/* 하단 */}
        <div style={{
          position: 'absolute', bottom: '36px',
          fontSize: '18px', color: '#6a4a30', letterSpacing: '2px',
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
