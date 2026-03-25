/**
 * 이름 한자 뜻풀이 + 사주 연계 해석
 * Claude API (tool_use)로 구조화된 JSON 반환
 */

import Anthropic from '@anthropic-ai/sdk'
import { SupabaseClient } from '@supabase/supabase-js'
import { calculateSaju, getElementFromReading } from './saju'
import type { NameReadingResult } from '@/types'

const client = new Anthropic()

interface GenerateNameReadingParams {
  hanja: string[]        // 한자 문자 배열 (e.g. ["敏", "俊"])
  birthdate?: string     // "YYYY-MM-DD" (선택)
  supabase: SupabaseClient
}

export async function generateNameReading({
  hanja,
  birthdate,
  supabase,
}: GenerateNameReadingParams): Promise<NameReadingResult> {
  // 1. DB에서 한자 데이터 조회 (character 컬럼 기준)
  const { data: hanjaData } = await supabase
    .from('hanja')
    .select('character, reading, meaning')
    .in('character', hanja)

  // 각 한자에 대해 sound, meaning, element 매핑
  const characters = hanja.map((char) => {
    const found = hanjaData?.find((h: { character: string; reading: string; meaning: string }) => h.character === char)
    const sound = found?.reading ?? ''
    const meaning = found?.meaning ?? ''
    const element = getElementFromReading(sound)
    return { char, sound, meaning, element }
  })

  // 2. 사주 계산 (birthdate 있을 때만)
  const sajuResult = birthdate ? calculateSaju(birthdate) : null

  // 3. 컨텍스트 구성
  const nameDisplay = characters
    .map((c) => `${c.char}(${c.meaning} ${c.sound}, 오행: ${c.element})`)
    .join(', ')

  let context = `이름 한자: ${nameDisplay}\n`

  if (sajuResult) {
    context += `사주 정보:\n`
    context += `- 년주: ${sajuResult.year.stem}${sajuResult.year.branch} (${sajuResult.year.stemKr}${sajuResult.year.branchKr})\n`
    context += `- 월주: ${sajuResult.month.stem}${sajuResult.month.branch} (${sajuResult.month.stemKr}${sajuResult.month.branchKr})\n`
    context += `- 일주: ${sajuResult.day.stem}${sajuResult.day.branch} (${sajuResult.day.stemKr}${sajuResult.day.branchKr})\n`
  }

  // 4. Claude API 호출 (tool_use로 구조화된 JSON 반환 강제)
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    tools: [
      {
        name: 'return_name_reading',
        description: '이름풀이와 사주 연계 해석 결과를 JSON으로 반환합니다',
        input_schema: {
          type: 'object' as const,
          properties: {
            name_meaning: {
              type: 'string',
              description: '이름 한자의 종합적 의미와 기운. 각 글자의 뜻이 어우러져 만드는 이름의 전체 뉘앙스를 2-3문장으로.',
            },
            combined_reading: {
              type: 'string',
              description: birthdate
                ? '이름 오행과 사주 천간지지를 연계한 종합 해석. 이름의 기운이 사주와 어떻게 조화를 이루는지 3-4문장으로.'
                : '이름 오행을 중심으로 한 종합 해석. 이 이름을 가진 사람의 성격과 운명적 흐름을 3-4문장으로.',
            },
            fortune_summary: {
              type: 'string',
              description: '이름에서 읽히는 운세의 핵심을 1-2문장으로 간결하게.',
            },
          },
          required: ['name_meaning', 'combined_reading', 'fortune_summary'],
        },
      },
    ],
    tool_choice: { type: 'tool' as const, name: 'return_name_reading' },
    messages: [
      {
        role: 'user',
        content: `당신은 40년 경력의 한국 전통 명리학 전문가입니다.
아래 정보를 바탕으로 이름풀이와 운세 해석을 해주세요.

${context}
철학관 특유의 진중하고 신비로운 어투로, 따뜻하면서도 통찰력 있게 풀이해주세요.`,
      },
    ],
  })

  // tool_use 블록에서 결과 추출
  const toolUse = response.content.find((c) => c.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('AI 응답 형식 오류: tool_use 블록 없음')
  }

  const aiResult = toolUse.input as {
    name_meaning: string
    combined_reading: string
    fortune_summary: string
  }

  return {
    characters,
    name_meaning: aiResult.name_meaning,
    saju_elements: sajuResult,
    combined_reading: aiResult.combined_reading,
    fortune_summary: aiResult.fortune_summary,
  }
}
