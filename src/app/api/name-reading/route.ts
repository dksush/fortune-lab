import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateNameReading } from '@/lib/name-reading'

export async function POST(req: NextRequest) {
  let body: { hanja?: unknown; birthdate?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 })
  }

  const { hanja, birthdate } = body

  if (!Array.isArray(hanja) || hanja.length === 0 || !hanja.every((h) => typeof h === 'string')) {
    return NextResponse.json({ error: 'hanja는 비어있지 않은 문자열 배열이어야 합니다' }, { status: 400 })
  }

  const hanjaList = hanja as string[]
  const birthdateStr = typeof birthdate === 'string' ? birthdate : undefined

  // birthdate 형식 검증 (YYYY-MM-DD)
  if (birthdateStr && !/^\d{4}-\d{2}-\d{2}$/.test(birthdateStr)) {
    return NextResponse.json({ error: 'birthdate는 YYYY-MM-DD 형식이어야 합니다' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 캐시 키: 정렬된 한자 배열 + 생년월일의 sha256 앞 32자
  const keyData = JSON.stringify({ hanja: [...hanjaList].sort(), birthdate: birthdateStr ?? '' })
  const inputKey = createHash('sha256').update(keyData).digest('hex').slice(0, 32)

  // 캐시 확인
  const { data: cached } = await supabase
    .from('name_readings')
    .select('result')
    .eq('input_key', inputKey)
    .single()

  if (cached) {
    return NextResponse.json(cached.result)
  }

  // AI 생성
  let result
  try {
    result = await generateNameReading({ hanja: hanjaList, birthdate: birthdateStr, supabase })
  } catch (err) {
    console.error('[name-reading] generateNameReading 오류:', err)
    return NextResponse.json({ error: '해석 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }

  // 캐시 저장
  await supabase.from('name_readings').insert({
    input_key: inputKey,
    hanja_input: hanjaList,
    birthdate: birthdateStr ?? null,
    result,
  })

  return NextResponse.json(result)
}
