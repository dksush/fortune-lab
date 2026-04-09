import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateFortune } from '@/lib/fortune'

// 로컬 전용 — 프로덕션 배포 후 삭제 권장
export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({}))
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: fortunes, error } = await supabase
    .from('fortunes')
    .select('id, input_name, hanja_ids, reading_raw, extra_hanja, birth_date, gender')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!fortunes?.length) return NextResponse.json({ message: '재생성할 항목 없음', count: 0 })

  const results: { id: string; name: string; ok: boolean; error?: string }[] = []

  for (const f of fortunes) {
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
      results.push({ id: f.id, name: f.input_name, ok: true })
    } catch (e: any) {
      results.push({ id: f.id, name: f.input_name, ok: false, error: e.message })
    }
  }

  const success = results.filter(r => r.ok).length
  return NextResponse.json({ total: fortunes.length, success, failed: fortunes.length - success, results })
}
