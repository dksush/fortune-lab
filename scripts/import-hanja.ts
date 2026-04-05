/**
 * 인명용 한자 데이터 import 스크립트
 * 출처: https://github.com/rutopio/Korean-Name-Hanja-Charset (MIT License)
 *
 * 사용법:
 *   npm run import-hanja
 *
 * 사전 조건:
 *   supabase/migrations/006_gender.sql 실행 후 사용
 *   (hanja_char_reading_idx unique index 필요)
 */

import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('한자 데이터 다운로드 중...')

  const res = await fetch(
    'https://raw.githubusercontent.com/rutopio/Korean-Name-Hanja-Charset/main/data-gov.json'
  )

  if (!res.ok) {
    console.error('데이터 다운로드 실패:', res.status)
    process.exit(1)
  }

  const raw: Array<{ cd: string; ineum: string; in: string; stroke: number }> = await res.json()
  console.log(`총 ${raw.length}개 항목 로드됨`)

  const seen = new Set<string>()
  const records = raw
    .filter(item => {
      if (!item.cd || !item.ineum) return false
      const key = `${item.cd}:${item.ineum}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(item => {
      const parts = item.in?.split(' : ')
      const meaning = parts?.[1]?.split('(')[0]?.trim() ?? ''
      return {
        character: String.fromCodePoint(parseInt(item.cd, 16)),
        reading: item.ineum,
        meaning,
        stroke: item.stroke ?? 0,
        usage_count: 0,
      }
    })
    .filter(r => r.character && r.reading) // 유효한 데이터만

  console.log(`중복 제거 후 ${records.length}개`)

  // 500개씩 배치 upsert (character+reading 기준 충돌 무시)
  const batchSize = 500
  let upserted = 0
  let skipped = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error, count } = await supabase
      .from('hanja')
      .upsert(batch, {
        onConflict: 'character,reading',
        ignoreDuplicates: true,
        count: 'exact',
      })

    if (error) {
      console.error(`\n배치 ${Math.floor(i / batchSize) + 1} 오류:`, error.message)
      skipped += batch.length
    } else {
      upserted += count ?? batch.length
    }
    process.stdout.write(`\r처리: ${i + batch.length}/${records.length} (추가: ${upserted}, 건너뜀: ${skipped})`)
  }

  console.log('\n✓ 한자 데이터 import 완료')
}

main().catch(console.error)
