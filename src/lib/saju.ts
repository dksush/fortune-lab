/**
 * 사주 팔자 계산 유틸리티
 * 년주/월주/일주 (천간+지지) 계산
 */

// 천간 (10개)
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const STEMS_KR = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const

// 지지 (12개)
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
const BRANCHES_KR = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const

export interface SajuPillar {
  stem: string     // 천간 한자 (e.g. "甲")
  branch: string   // 지지 한자 (e.g. "子")
  stemKr: string   // 천간 한글 (e.g. "갑")
  branchKr: string // 지지 한글 (e.g. "자")
}

export interface SajuResult {
  year: SajuPillar
  month: SajuPillar
  day: SajuPillar
}

/** 양력 날짜 → 율리우스 적일 수 */
function toJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

function makePillar(stemIndex: number, branchIndex: number): SajuPillar {
  const si = ((stemIndex % 10) + 10) % 10
  const bi = ((branchIndex % 12) + 12) % 12
  return {
    stem: STEMS[si],
    branch: BRANCHES[bi],
    stemKr: STEMS_KR[si],
    branchKr: BRANCHES_KR[bi],
  }
}

/**
 * 생년월일로 년주/월주/일주 계산
 * @param birthdate "YYYY-MM-DD" 형식
 */
export function calculateSaju(birthdate: string): SajuResult {
  const [year, month, day] = birthdate.split('-').map(Number)

  // 년주: 기준 1924년 = 甲子(stem=0, branch=0)
  const yearStemIndex = ((year - 1924) % 10 + 10) % 10
  const yearBranchIndex = ((year - 1924) % 12 + 12) % 12

  // 월주
  // 지지: 1월→丑(1), 2월→寅(2), ..., 11월→亥(11), 12월→子(0)
  const monthBranchIndex = month % 12
  // 寅月 시작 천간 = (연간 % 5 * 2 + 2) % 10 (五虎遁年法)
  const startStem = (((yearStemIndex % 5) * 2 + 2) % 10)
  // 寅月(branchIndex=2) 기준으로 각 월 천간 계산
  const monthStemIndex = ((startStem + monthBranchIndex - 2) % 10 + 10) % 10

  // 일주: JD 2451545 (2000-01-01) = 甲戌 (stem=0, branch=10)
  const jd = toJulianDay(year, month, day)
  const ref = 2451545
  const dayStemIndex = ((jd - ref) % 10 + 10) % 10
  const dayBranchIndex = ((jd - ref + 10) % 12 + 12) % 12

  return {
    year: makePillar(yearStemIndex, yearBranchIndex),
    month: makePillar(monthStemIndex, monthBranchIndex),
    day: makePillar(dayStemIndex, dayBranchIndex),
  }
}

/**
 * 한자 음독의 초성으로 오행 반환
 * 木: ㄱ ㅋ | 火: ㄴ ㄷ ㄸ ㄹ ㅌ | 土: ㅁ ㅂ ㅃ ㅍ | 金: ㅅ ㅆ ㅈ ㅉ ㅊ | 水: ㅇ ㅎ
 */
const INITIAL_TO_ELEMENT: Record<number, string> = {
  0: '木', 1: '木', 15: '木',              // ㄱ, ㄲ, ㅋ
  2: '火', 3: '火', 4: '火', 5: '火', 16: '火', // ㄴ, ㄷ, ㄸ, ㄹ, ㅌ
  6: '土', 7: '土', 8: '土', 17: '土',     // ㅁ, ㅂ, ㅃ, ㅍ
  9: '金', 10: '金', 12: '金', 13: '金', 14: '金', // ㅅ, ㅆ, ㅈ, ㅉ, ㅊ
  11: '水', 18: '水',                      // ㅇ, ㅎ
}

export function getElementFromReading(reading: string): string {
  if (!reading) return '木'
  const code = reading.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '木'
  const initialIndex = Math.floor((code - 0xac00) / (21 * 28))
  return INITIAL_TO_ELEMENT[initialIndex] ?? '木'
}
