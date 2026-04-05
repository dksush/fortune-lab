import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const SELECT_FIELDS = 'id, character, reading, meaning, stroke'
const DEFAULT_LIMIT = 12

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reading = searchParams.get('reading')?.trim()
  const query = searchParams.get('query')?.trim()

  if (!reading && !query) {
    return NextResponse.json({ error: 'reading or query required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── 음독 단독 검색 (e.g. "안") ────────────────────────────────────────────
  if (reading) {
    const { data, error } = await supabase
      .from('hanja')
      .select(SELECT_FIELDS)
      .eq('reading', reading)
      .neq('meaning', '')
      .order('usage_count', { ascending: false })
      .order('stroke', { ascending: true })
      .limit(DEFAULT_LIMIT)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  // ── query 검색 ────────────────────────────────────────────────────────────
  const q = query!

  // 1) CJK 한자 직접 입력 (e.g. "安") → character 검색
  if (/[\u3400-\u9FFF\uF900-\uFAFF]/.test(q)) {
    const { data } = await supabase
      .from('hanja')
      .select(SELECT_FIELDS)
      .eq('character', q.trim())
      .limit(DEFAULT_LIMIT)
    return NextResponse.json(data ?? [])
  }

  const hasSpace = q.includes(' ')

  if (hasSpace) {
    // 2) "훈 음" 형태 (e.g. "편안할 안") → meaning + reading 동시 검색
    const parts = q.split(/\s+/)
    const meaningPart = parts.slice(0, -1).join(' ')
    const readingPart = parts[parts.length - 1]

    const { data: exact } = await supabase
      .from('hanja')
      .select(SELECT_FIELDS)
      .ilike('meaning', `%${meaningPart}%`)
      .ilike('reading', readingPart)
      .order('usage_count', { ascending: false })
      .limit(DEFAULT_LIMIT)

    if (exact && exact.length > 0) return NextResponse.json(exact)

    // 폴백: 음독만으로 재검색
    const { data: fallback } = await supabase
      .from('hanja')
      .select(SELECT_FIELDS)
      .eq('reading', readingPart)
      .neq('meaning', '')
      .order('usage_count', { ascending: false })
      .limit(DEFAULT_LIMIT)

    return NextResponse.json(fallback ?? [])
  }

  // 3) 단일 한글 글자 (e.g. "안") → reading 검색 (이미 위에서 처리되지만 query 경로도 대응)
  if (q.length === 1 && /[가-힣]/.test(q)) {
    const { data } = await supabase
      .from('hanja')
      .select(SELECT_FIELDS)
      .eq('reading', q)
      .neq('meaning', '')
      .order('usage_count', { ascending: false })
      .order('stroke', { ascending: true })
      .limit(DEFAULT_LIMIT)
    return NextResponse.json(data ?? [])
  }

  // 4) 훈만 입력 (e.g. "편안할" 또는 "밝을") → meaning 검색
  const { data: byMeaning } = await supabase
    .from('hanja')
    .select(SELECT_FIELDS)
    .ilike('meaning', `%${q}%`)
    .neq('meaning', '')
    .order('usage_count', { ascending: false })
    .limit(DEFAULT_LIMIT)

  if (byMeaning && byMeaning.length > 0) return NextResponse.json(byMeaning)

  // 5) 마지막 폴백: 마지막 글자를 reading으로, 나머지를 meaning으로 분리 시도
  if (q.length > 1) {
    const lastChar = q.slice(-1)
    const restMeaning = q.slice(0, -1)
    const { data: split } = await supabase
      .from('hanja')
      .select(SELECT_FIELDS)
      .ilike('meaning', `%${restMeaning}%`)
      .eq('reading', lastChar)
      .limit(DEFAULT_LIMIT)
    return NextResponse.json(split ?? [])
  }

  return NextResponse.json([])
}
