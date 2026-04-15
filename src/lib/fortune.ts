import Anthropic from '@anthropic-ai/sdk'
import { SupabaseClient } from '@supabase/supabase-js'
import { calculateSaju } from './saju'
import type { Gender } from '@gracefullight/saju'

const client = new Anthropic()

export interface ExtraHanja {
  character: string
  reading: string
  meaning: string
}

export interface DaeunCommentary {
  pillar: string
  age_range: string
  brief: string
}

export interface FortuneResult {
  hanja: {
    char: string
    reading: string
    narrative: string
  }[]
  combined: string
  element_summary: string
  saju: {
    innate: string
    harmony: string
    this_year: string
  }
  life_direction: {
    talent: string
    wealth: string
    relationships: string
  }
  keywords: string[]
  overall: string
  quote: string
  daeun_commentary?: DaeunCommentary[]
}

interface GenerateFortuneParams {
  inputName: string
  hanjaIds: string[]
  readingRaw: string
  supabase: SupabaseClient
  extraHanja?: ExtraHanja[]
  birthDate?: string
  gender?: string
}

export async function generateFortune({ inputName, hanjaIds, readingRaw, supabase, extraHanja, birthDate, gender }: GenerateFortuneParams): Promise<string> {
  let hanjaList: { character: string; reading: string; meaning: string }[] = []

  if (hanjaIds.length > 0) {
    const { data } = await supabase
      .from('hanja')
      .select('character, reading, meaning')
      .in('id', hanjaIds)
    if (data?.length) hanjaList = data
  }

  if (extraHanja?.length) {
    hanjaList = [...hanjaList, ...extraHanja.map(h => ({ character: h.character, reading: h.reading, meaning: h.meaning }))]
  }

  const hanjaDesc = hanjaList.map(h => `${h.character}(${h.meaning} ${h.reading})`).join(', ')
  const nameDisplay = hanjaDesc ? `${inputName} (${hanjaDesc})` : inputName
  const currentYear = new Date().getFullYear()

  // 사주 계산
  const genderKr = gender === 'female' ? '여성' : '남성'
  const sajuGender: Gender = gender === 'female' ? 'female' : 'male'

  let sajuSummary = '생년월일: 미입력'
  let daeunCycles: { startAge: number; endAge: number; pillar: string }[] = []
  if (birthDate) {
    try {
      const sajuData = await calculateSaju(birthDate, sajuGender)
      daeunCycles = sajuData.daeun.cycles.slice(0, 6)
      const daeunLine = daeunCycles.map(c => `${c.startAge}~${c.endAge}세(${c.pillar})`).join(', ')
      sajuSummary = `성별: ${genderKr}\n생년월일: ${birthDate}\n${sajuData.summaryForAI}\n대운 주기: ${daeunLine}`
    } catch {
      sajuSummary = `성별: ${genderKr}\n생년월일: ${birthDate}`
    }
  }

  const daeunSchema = daeunCycles.length > 0 ? `,
  "daeun_commentary": [
    {
      "pillar": "천간+지지 (예: 甲子)",
      "age_range": "시작세~끝세",
      "brief": "이 10년 대운이 이 사람에게 가져오는 기운을 1-2문장으로. 이름 한자(${hanjaDesc})와 연결지어 서술."
    }
  ]` : ''

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `당신은 40년 경력의 한국 전통 철학관 선생님입니다. 진중하고 신비로운 어투로, 단순한 사전 풀이가 아닌 그 사람의 삶과 운명에 미치는 영향을 중심으로 풀어주세요.

중요한 표기 규칙 (반드시 준수):

1. 천간(甲乙丙丁戊己庚辛壬癸)과 지지(子丑寅卯辰巳午未申酉戌亥) 한자 이름을 직접 쓰지 마세요.
   대신 그 기운의 질감과 이미지로 풀어쓰세요.
   예시:
   - 庚金(경금) → "서리처럼 차갑고 날카로운 금(金) 기운"
   - 壬水(임수) → "큰 강처럼 깊고 도도한 수(水) 기운"
   - 丙火(병화) → "태양처럼 강렬한 화(火) 기운"
   - 甲木(갑목) → "새싹처럼 솟구치는 목(木) 기운"
   - 午火(오화) → "한여름 태양의 불 기운"
   - 申金(신금) → "가을 서리 같은 금(金) 기운"

2. 오행은 木火土金水 기호 사용 가능하나, 반드시 한글을 앞에 쓰세요.
   예) "금(金) 기운", "수(水) 기운", "화(火) 기운"

3. 관계 용어도 쉽게 풀어쓰세요.
   예시:
   - "충(沖)" → "정면으로 부딪히는"
   - "합(合)" → "서로 어우러지는"
   - "신강(身强)" → "자신의 기운이 강한"
   - "용신(用神)" → "나에게 가장 도움이 되는 기운"

4. 목표 독자는 사주를 전혀 모르는 20-30대입니다. 전문 용어 없이도 뜻이 전달되어야 합니다.

이름: ${nameDisplay}
${sajuSummary}

아래 JSON 형식으로만 답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.

{
  "hanja": [
    {
      "char": "한자 한 글자",
      "reading": "음독 한 글자",
      "narrative": "이 한자가 이름에서 부여하는 기운과 성품을 철학관 어투로 2문장 이내(최대 60자). 핵심 기운 한 가지와 삶에 미치는 영향 한 가지만 간결하게."
    }
  ],
  "combined": "세 글자(혹은 전체 글자)가 합쳐졌을 때 만들어내는 전체 기운과 인상을 3-4문장으로. 각 글자의 기운이 어떻게 어우러지고 상승작용을 일으키는지 서술.",
  "element_summary": "이름 전체의 오행 기운을 한 문장으로 요약.",
  "saju": {
    "innate": "생년월일로 본 타고난 사주 기운과 성격적 본질을 4-5문장으로. 어떤 기운이 강하고 어떤 기운이 부족한지, 그것이 삶의 경향성·성격에 어떻게 나타나는지 구체적으로.",
    "harmony": "이 서비스의 핵심 섹션. 각 한자 글자(${hanjaDesc})를 직접 언급하며 사주와 어떻게 맞물리는지 5-6문장으로 상세히 서술. 예) '安의 고요한 기운이 사주의 급한 물결을 다스리고, 鉉의 金 기운이 부족한 결단력을 채워주며...' 식으로 각 글자가 사주의 어떤 부분을 보완하거나 강화하는지 구체적·유기적으로 연결. 이름과 사주가 상생하는 부분과 주의할 상극 관계도 언급.",
    "this_year": "${currentYear}년 올해 운세를 4-5문장으로. 올해의 천간지지와 이름 한자(${hanjaDesc})가 어떻게 맞물리는지 한자를 직접 언급하며 서술. 올해 특히 어떤 한자의 기운이 강하게 작용하는지, 기회와 주의할 점."
  },
  "life_direction": {
    "talent": "이름 한자(${hanjaDesc})와 사주가 암시하는 타고난 재능과 적성을 3-4문장으로. 어떤 한자의 어떤 기운이 어떤 분야의 재능을 강화하는지 한자를 직접 언급하며 서술.",
    "wealth": "재물운과 직업운을 3-4문장으로. 한자의 기운과 연결하여 돈과 일이 어떤 방식으로 따라오는지, 어떤 한자의 기운을 활용해야 하는지 구체적으로.",
    "relationships": "인간관계와 대인운을 3-4문장으로. 이름 한자의 기운이 대인관계에 어떻게 나타나는지, 어떤 기운을 가진 사람과 잘 맞는지 한자를 연결하여 서술."
  },
  "keywords": ["이 이름과 사주를 대표하는 키워드 3-5개"],
  "overall": "이름 전체를 아우르는 종합 총평을 3-4문장으로. 이 사람이 가진 가장 큰 강점과 인생의 방향성.",
  "quote": "이 이름을 가진 사람에게 건네는 철학관식 한 마디. 고사성어나 자연의 이치를 빌려 표현해도 좋음."${daeunSchema}
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  let text = content.text.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  }
  JSON.parse(text)
  return text
}
