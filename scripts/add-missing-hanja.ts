/**
 * 정부 인명용 한자 목록에 없으나 실제 사용되는 한자 수동 추가
 * 사용법: npx tsx scripts/add-missing-hanja.ts
 */

import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MISSING_HANJA = [
  { character: '沼', reading: '소', meaning: '못', stroke: 8 },
]

async function main() {
  const records = MISSING_HANJA.map(h => ({
    ...h,
    usage_count: 50,
    is_name_hanja: true,
  }))

  const { error, data } = await supabase
    .from('hanja')
    .upsert(records, { onConflict: 'character,reading' })
    .select('character, reading, meaning')

  if (error) {
    console.error('오류:', error.message)
    process.exit(1)
  }

  console.log('추가/업데이트 완료:')
  data?.forEach(r => console.log(`  ${r.character}(${r.reading}) — ${r.meaning}`))
}

main().catch(console.error)
