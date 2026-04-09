/**
 * 기존 fortune 결과를 새 AI 프롬프트로 전체 재생성
 * 사용법: npx tsx scripts/regenerate-fortunes.ts
 *
 * - status가 completed인 것만 재생성
 * - 에러 발생 시 해당 항목 스킵하고 계속 진행
 */

import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { generateFortune } from '../src/lib/fortune'

loadEnvConfig(process.cwd())

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: fortunes, error } = await supabase
    .from('fortunes')
    .select('id, input_name, hanja_ids, reading_raw, extra_hanja, birth_date, gender')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (error) { console.error('조회 실패:', error.message); process.exit(1) }
  if (!fortunes?.length) { console.log('재생성할 항목 없음'); return }

  console.log(`총 ${fortunes.length}개 재생성 시작\n`)

  let success = 0, failed = 0

  for (const f of fortunes) {
    process.stdout.write(`[${success + failed + 1}/${fortunes.length}] ${f.input_name} (${f.id.slice(0, 8)})… `)
    try {
      const result = await generateFortune({
        inputName: f.input_name,
        hanjaIds: f.hanja_ids ?? [],
        readingRaw: f.reading_raw ?? f.input_name,
        supabase,
        extraHanja: f.extra_hanja ?? [],
        birthDate: f.birth_date ?? undefined,
        gender: f.gender ?? 'male',
      })
      await supabase.from('fortunes').update({ result }).eq('id', f.id)
      console.log('✓')
      success++
    } catch (e: any) {
      console.log(`✗ ${e.message}`)
      failed++
    }
    // API rate limit 방지
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n완료 — 성공: ${success}, 실패: ${failed}`)
}

main().catch(console.error)
