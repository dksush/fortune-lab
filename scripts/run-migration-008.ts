import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // 1. short_id 컬럼 추가
  const { error: e1 } = await supabase.rpc('exec_sql' as never, {
    query: 'ALTER TABLE fortunes ADD COLUMN IF NOT EXISTS short_id TEXT'
  } as never)
  console.log('1. 컬럼 추가:', e1 ? '✗ ' + e1.message : '✓')

  // exec_sql RPC가 없을 경우 — Supabase SQL Editor에서 직접 실행 필요
  if (e1?.message?.includes('exec_sql')) {
    console.log('\n⚠️  exec_sql RPC가 없습니다.')
    console.log('Supabase Dashboard > SQL Editor에서 아래를 실행하세요:\n')
    console.log(`ALTER TABLE fortunes ADD COLUMN IF NOT EXISTS short_id TEXT;`)
    console.log(`CREATE UNIQUE INDEX IF NOT EXISTS fortunes_short_id_idx ON fortunes (short_id);`)
    console.log(`UPDATE fortunes SET short_id = SUBSTRING(id::text, 1, 8) WHERE short_id IS NULL AND id != 'a0000000-0000-0000-0000-000000000001';`)
    console.log(`UPDATE fortunes SET short_id = 'demo' WHERE id = 'a0000000-0000-0000-0000-000000000001';`)
    return
  }
}

main().catch(console.error)
