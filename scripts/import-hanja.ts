/**
 * 인명용 한자 데이터 import 스크립트
 * 출처: https://github.com/rutopio/Korean-Name-Hanja-Charset (MIT License)
 *
 * 사용법:
 *   npx tsx scripts/import-hanja.ts
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

  // rutopio/Korean-Name-Hanja-Charset 의 JSON 데이터 사용
  const res = await fetch(
    'https://raw.githubusercontent.com/rutopio/Korean-Name-Hanja-Charset/main/data-gov.json'
  )

  if (!res.ok) {
    console.error('데이터 다운로드 실패:', res.status)
    process.exit(1)
  }

  // 실제 데이터 구조: { cd: "04f3d", ineum: "가", in: "가 : 절(가)", stroke: 0 }
  const raw: Array<{ cd: string; ineum: string; in: string; stroke: number }> = await res.json()
  console.log(`총 ${raw.length}개 항목 로드됨`)

  // 중복 제거 (같은 character+reading 조합)
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
      // "가 : 절(가)" → meaning = "절"
      const parts = item.in?.split(' : ')
      const meaning = parts?.[1]?.split('(')[0]?.trim() ?? ''
      return {
        character: String.fromCodePoint(parseInt(item.cd, 16)),
        reading: item.ineum,
        meaning,
        stroke: item.stroke ?? 0,
      }
    })

  console.log(`중복 제거 후 ${records.length}개`)

  // 500개씩 배치 insert
  const batchSize = 500
  let inserted = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error } = await supabase.from('hanja').insert(batch)
    if (error) console.error(`배치 ${i / batchSize + 1} 오류:`, error.message)
    else inserted += batch.length
    process.stdout.write(`\r${inserted}/${records.length} import 완료`)
  }

  console.log('\n✓ 한자 데이터 import 완료')
}

main().catch(console.error)
