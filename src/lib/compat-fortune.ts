import Anthropic from '@anthropic-ai/sdk'
import { calculateSaju, getElementFromReading, GANJIBRANCH } from './saju'
import type { Gender } from '@gracefullight/saju'

const client = new Anthropic()

const ELEMENT_LABEL: Record<string, string> = {
  木: '목(木)', 火: '화(火)', 土: '토(土)', 金: '금(金)', 水: '수(水)',
}

export interface CompatHanja {
  character: string
  reading: string
  meaning: string
}

export interface CompatFortuneResult {
  score: number
  score_label: string
  summary: string
  element_compat: {
    my_dominant: string
    partner_dominant: string
    relation: string
    description: string
  }
  name_cross: string
  strengths: string
  cautions: string
  this_year: string
  quote: string
}

interface GenerateCompatParams {
  myName: string
  myHanja: CompatHanja[]
  myBirth: string
  myGender: Gender
  partnerName: string
  partnerHanja: CompatHanja[]
  partnerBirth: string
  partnerGender: Gender
  relationType: string
}

function buildSajuSummary(birth: string, gender: Gender, name: string): string {
  if (!birth) return `이름: ${name}\n생년월일: 미입력`
  try {
    // calculateSaju는 summaryForAI를 반환
    // 여기서는 간단히 생년월일만 전달
    return `이름: ${name}\n성별: ${gender === 'female' ? '여성' : '남성'}\n생년월일: ${birth}`
  } catch {
    return `이름: ${name}\n생년월일: ${birth}`
  }
}

export async function generateCompatFortune(params: GenerateCompatParams): Promise<string> {
  const {
    myName, myHanja, myBirth, myGender,
    partnerName, partnerHanja, partnerBirth, partnerGender,
    relationType,
  } = params

  const myHanjaDesc = myHanja.length > 0
    ? myHanja.map(h => `${h.character}(${h.meaning} ${h.reading})`).join(', ')
    : myName

  const partnerHanjaDesc = partnerHanja.length > 0
    ? partnerHanja.map(h => `${h.character}(${h.meaning} ${h.reading})`).join(', ')
    : partnerName

  const relationLabel = relationType === 'lover' ? '연인/썸'
    : relationType === 'friend' ? '친구'
    : '가족'

  const mySaju = buildSajuSummary(myBirth, myGender, myName)
  const partnerSaju = buildSajuSummary(partnerBirth, partnerGender, partnerName)
  const currentYear = new Date().getFullYear()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `당신은 40년 경력의 한국 전통 철학관 선생님입니다. 두 사람의 이름과 사주를 바탕으로 진중하고 신비로운 어투로 궁합을 풀어주세요.

표기 규칙:
1. 천간·지지 한자 이름 대신 기운의 질감과 이미지로 풀어쓰세요.
2. 오행은 반드시 한글 먼저: "목(木) 기운", "금(金) 기운"
3. 전문 용어 없이 20-30대가 이해할 수 있게 서술
4. 두 사람의 한자 이름(${myHanjaDesc}, ${partnerHanjaDesc})을 반드시 직접 언급

관계 유형: ${relationLabel}

[A — ${myName}]
${mySaju}
이름 한자: ${myHanjaDesc}

[B — ${partnerName}]
${partnerSaju}
이름 한자: ${partnerHanjaDesc}

아래 JSON 형식으로만 답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.

{
  "score": 75,
  "score_label": "좋은 인연",
  "summary": "두 사람의 전반적인 궁합을 2-3문장으로. 각자의 이름 한자를 언급하며 어떤 기운이 만나는지 서술.",
  "element_compat": {
    "my_dominant": "${myName}의 이름에서 가장 강한 오행 한 글자 (예: 목(木))",
    "partner_dominant": "${partnerName}의 이름에서 가장 강한 오행 한 글자 (예: 화(火))",
    "relation": "상생 | 상극 | 중립",
    "description": "두 오행이 어떻게 만나는지 2문장으로. 구체적인 삶의 장면으로 표현."
  },
  "name_cross": "각 한자(${myHanjaDesc}, ${partnerHanjaDesc})가 서로의 기운에 어떤 영향을 주는지 4-5문장으로 상세히. 한자를 직접 언급하며.",
  "strengths": "함께할 때 시너지가 나는 부분을 3-4문장으로. 구체적인 상황이나 장면으로.",
  "cautions": "주의해야 할 충돌 지점을 2-3문장으로. 해소 방법도 함께.",
  "this_year": "${currentYear}년 두 사람의 흐름을 3-4문장으로. 올해 특히 어떤 기운이 작용하는지, 함께 잘 해나갈 수 있는 부분.",
  "quote": "두 사람의 인연에 건네는 철학관식 한 마디. 자연의 이치나 고사성어를 빌려도 좋음."
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
