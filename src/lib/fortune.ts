import Anthropic from '@anthropic-ai/sdk'
import { SupabaseClient } from '@supabase/supabase-js'

const client = new Anthropic()

export interface ExtraHanja {
  character: string
  reading: string
  meaning: string
}

interface GenerateFortuneParams {
  inputName: string
  hanjaIds: string[]
  readingRaw: string
  supabase: SupabaseClient
  extraHanja?: ExtraHanja[]  // DB에 없는 직접 입력 한자
}

export async function generateFortune({ inputName, hanjaIds, readingRaw, supabase, extraHanja }: GenerateFortuneParams): Promise<string> {
  let hanjaContext = ''

  if (hanjaIds.length > 0) {
    const { data } = await supabase
      .from('hanja')
      .select('character, reading, meaning')
      .in('id', hanjaIds)

    if (data?.length) {
      hanjaContext = data.map(h => `${h.character}(${h.meaning} ${h.reading})`).join(', ')
    }
  }

  // 직접 입력한 한자 추가
  if (extraHanja?.length) {
    const extras = extraHanja.map(h => `${h.character}(${h.meaning} ${h.reading})`).join(', ')
    hanjaContext = hanjaContext ? `${hanjaContext}, ${extras}` : extras
  }

  const nameDisplay = hanjaContext ? `${inputName} (${hanjaContext})` : inputName

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `당신은 40년 경력의 한국 전통 철학관 선생님입니다.
이름 "${nameDisplay}"에 대한 풀이를 해주세요.

다음 형식으로 작성해주세요:
1. **이름의 전체적인 기운** (2-3문장)
2. **한자별 의미와 오행** (각 글자당 2-3문장)
3. **음양 조화** (1-2문장)
4. **이 이름을 가진 사람의 성격과 운명** (3-4문장)
5. **행운의 방향과 색** (1-2문장)

철학관 특유의 진중하고 신비로운 어투로, 따뜻하면서도 통찰력 있게 풀이해주세요.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')
  return content.text
}
