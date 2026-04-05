import { DateTime } from 'luxon'
import { createLuxonAdapter } from '@gracefullight/saju/adapters/luxon'
import { getSaju, countElements, STANDARD_PRESET } from '@gracefullight/saju'
import type { Gender, LuckPillar } from '@gracefullight/saju'

export interface PillarInfo {
  gan: string    // 천간 한자
  ji: string     // 지지 한자
  full: string   // 예) 壬申
}

export interface ElementCount {
  木: number
  火: number
  土: number
  金: number
  水: number
}

export interface DaeunCycle {
  startAge: number
  endAge: number
  pillar: string
  gan: string
  ji: string
}

export interface SajuData {
  pillars: {
    year: PillarInfo
    month: PillarInfo
    day: PillarInfo
    hour: PillarInfo | null
  }
  elements: ElementCount
  strengthLabel: string   // 예) "신약", "신강"
  yongsin: string         // 예) "水"
  gisin: string           // 예) "金"
  yongsinLabel: string    // 예) "수(水)"
  gisinLabel: string      // 예) "금(金)"
  daeun: {
    startAge: number
    cycles: DaeunCycle[]
  }
  dayMaster: string
  summaryForAI: string
}

const ELEMENT_KEY_MAP: Record<string, keyof ElementCount> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
}

const ELEMENT_LABEL: Record<string, string> = {
  木: '목(木)', 火: '화(火)', 土: '토(土)', 金: '금(金)', 水: '수(水)',
}

const STRENGTH_KR: Record<string, string> = {
  extremelyStrong: '극신강', veryStrong: '신강', strong: '중강',
  balanced: '중화', weak: '중약', veryWeak: '신약', extremelyWeak: '극신약',
}

function splitPillar(pillar: string): PillarInfo {
  return { gan: pillar[0] ?? '', ji: pillar[1] ?? '', full: pillar }
}

function parseBirthDate(birthDate: string) {
  const dateMatch = birthDate.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/)
  if (!dateMatch) throw new Error(`Invalid birthDate: ${birthDate}`)

  const year = parseInt(dateMatch[1])
  const month = parseInt(dateMatch[2])
  const day = parseInt(dateMatch[3])

  const timeMatch = birthDate.match(/(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/)
  if (timeMatch) {
    let hour = parseInt(timeMatch[2])
    const minute = timeMatch[3] ? parseInt(timeMatch[3]) : 0
    if (timeMatch[1] === '오후' && hour < 12) hour += 12
    if (timeMatch[1] === '오전' && hour === 12) hour = 0
    return { year, month, day, hour, minute, hasTime: true }
  }

  return { year, month, day, hour: 12, minute: 0, hasTime: false }
}

export async function calculateSaju(
  birthDate: string,
  gender: Gender = 'male'
): Promise<SajuData> {
  const { year, month, day, hour, minute, hasTime } = parseBirthDate(birthDate)

  const adapter = await createLuxonAdapter()
  const dt = DateTime.fromObject({ year, month, day, hour, minute }, { zone: 'Asia/Seoul' })

  const result = getSaju(dt, {
    adapter,
    gender,
    preset: STANDARD_PRESET,
    yearlyLuckRange: { from: new Date().getFullYear(), to: new Date().getFullYear() + 3 },
  })

  // 천간지지 파싱
  const yearP = splitPillar(result.pillars.year)
  const monthP = splitPillar(result.pillars.month)
  const dayP = splitPillar(result.pillars.day)
  const hourP = hasTime ? splitPillar(result.pillars.hour) : null

  // 오행 분포 (장간 포함)
  const elements: ElementCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  if (result.tenGods) {
    const raw = countElements(result.tenGods)
    for (const [key, val] of Object.entries(raw)) {
      const el = ELEMENT_KEY_MAP[key]
      if (el) elements[el] = val as number
    }
  }

  // 신강/신약
  const strengthLabel = STRENGTH_KR[result.strength?.level?.key ?? ''] ?? '중화'

  // 용신/기신
  const yongsinKey = result.yongShen?.primary?.key ?? ''
  const yongsin = ELEMENT_KEY_MAP[yongsinKey] ?? yongsinKey
  const gisinEntry = result.yongShen?.allElements
    ? Object.entries(result.yongShen.allElements).find(([, v]) => (v as any).isKiShen)
    : null
  const gisin = gisinEntry ? (ELEMENT_KEY_MAP[gisinEntry[0]] ?? gisinEntry[0]) : '?'

  // 대운표
  const cycles: DaeunCycle[] = (result.majorLuck?.pillars ?? [])
    .slice(0, 8)
    .map((p: LuckPillar) => ({
      startAge: p.startAge,
      endAge: p.endAge,
      pillar: p.pillar,
      gan: p.stem,
      ji: p.branch,
    }))

  const startAge = result.majorLuck?.startAge ?? 0

  // AI 프롬프트용 요약
  const pillarStr = [
    `연주 ${result.pillars.year}`,
    `월주 ${result.pillars.month}`,
    `일주 ${result.pillars.day}`,
    hasTime ? `시주 ${result.pillars.hour}` : '시주 미입력',
  ].join(' / ')

  const elemStr = Object.entries(elements)
    .map(([el, cnt]) => `${el} ${cnt}개`)
    .join(', ')

  const summaryForAI = `사주 팔자: ${pillarStr}
오행 분포: ${elemStr}
일간(日干): ${dayP.gan} (이 사람의 본질을 대표하는 천간)
신강/신약: ${strengthLabel}
용신: ${ELEMENT_LABEL[yongsin] ?? yongsin} (이 오행이 도움이 됨)
기신: ${ELEMENT_LABEL[gisin] ?? gisin} (이 오행이 해가 됨)
대운 시작: ${startAge}세부터 10년 주기`

  return {
    pillars: { year: yearP, month: monthP, day: dayP, hour: hourP },
    elements,
    strengthLabel,
    yongsin,
    gisin,
    yongsinLabel: ELEMENT_LABEL[yongsin] ?? yongsin,
    gisinLabel: ELEMENT_LABEL[gisin] ?? gisin,
    daeun: { startAge, cycles },
    dayMaster: dayP.gan,
    summaryForAI,
  }
}

/** 천간·지지 → 오행/속성 (대운표 레이블용) */
export const GANJIBRANCH: Record<string, { element: string; nature: string }> = {
  // 천간 (Heavenly Stems)
  甲: { element: '木', nature: '양목' }, 乙: { element: '木', nature: '음목' },
  丙: { element: '火', nature: '양화' }, 丁: { element: '火', nature: '음화' },
  戊: { element: '土', nature: '양토' }, 己: { element: '土', nature: '음토' },
  庚: { element: '金', nature: '양금' }, 辛: { element: '金', nature: '음금' },
  壬: { element: '水', nature: '양수' }, 癸: { element: '水', nature: '음수' },
  // 지지 (Earthly Branches)
  子: { element: '水', nature: '쥐' },  丑: { element: '土', nature: '소' },
  寅: { element: '木', nature: '호랑이' }, 卯: { element: '木', nature: '토끼' },
  辰: { element: '土', nature: '용' },  巳: { element: '火', nature: '뱀' },
  午: { element: '火', nature: '말' },  未: { element: '土', nature: '양' },
  申: { element: '金', nature: '원숭이' }, 酉: { element: '金', nature: '닭' },
  戌: { element: '土', nature: '개' },  亥: { element: '水', nature: '돼지' },
}

/** 한자 음독 초성 → 오행 (이름 오행 계산용) */
const INITIAL_TO_ELEMENT: Record<number, keyof ElementCount> = {
  0: '木', 1: '木', 15: '木',
  2: '火', 3: '火', 4: '火', 5: '火', 16: '火',
  6: '土', 7: '土', 8: '土', 17: '土',
  9: '金', 10: '金', 12: '金', 13: '金', 14: '金',
  11: '水', 18: '水',
}

export function getElementFromReading(reading: string): keyof ElementCount {
  if (!reading) return '木'
  const code = reading.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '木'
  const idx = Math.floor((code - 0xac00) / (21 * 28))
  return INITIAL_TO_ELEMENT[idx] ?? '木'
}
