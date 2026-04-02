import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reading = searchParams.get('reading')?.trim()
  const query = searchParams.get('query')?.trim()

  if (!reading && !query) {
    return NextResponse.json({ error: 'reading or query required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // "맑을 호" / "맑을호" 형태 파싱 — 공백 유무 무관하게 마지막 글자를 reading으로 처리
  if (query) {
    const normalized = query.replace(/\s+/g, '')
    const parts = query.trim().split(/\s+/)
    const meaning = parts.length > 1 ? parts.slice(0, -1).join(' ') : normalized.slice(0, -1)
    const readingPart = parts.length > 1 ? parts[parts.length - 1] : normalized.slice(-1)

    const { data, error } = await supabase
      .from('hanja')
      .select('id, character, reading, meaning, stroke')
      .ilike('meaning', `%${meaning}%`)
      .ilike('reading', readingPart)
      .limit(10)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // 음독으로 검색 — usage_count 내림차순, 빈 meaning 제외
  const { data, error } = await supabase
    .from('hanja')
    .select('id, character, reading, meaning, stroke')
    .eq('reading', reading)
    .neq('meaning', '')
    .order('usage_count', { ascending: false })
    .order('stroke', { ascending: true })
    .limit(12)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
