import type { ElementCount } from './saju'

interface ScoreInput {
  nameOhaeng: { element: keyof ElementCount }[]
  yongsin: string       // 사주 용신 오행 (예: '水')
  gisin: string         // 사주 기신 오행
  meanings: string[]    // 이름 한자 뜻 목록
}

interface ScoreDetail {
  yongsinScore: number   // 0~40
  balanceScore: number   // 0~30
  meaningScore: number   // 0~30
  total: number          // 0~100
}

// 긍정적인 뜻 키워드
const POSITIVE_KEYWORDS = [
  '밝', '빛', '맑', '깨끗', '맑을', '빛날', '빛나', '밝을', '맑을',
  '편안', '안', '복', '길', '좋', '귀', '아름', '지혜', '강', '굳',
  '성', '이룰', '이룸', '이루', '번창', '번영', '풍요', '넉넉',
  '슬기', '슬기롭', '어질', '어짊', '덕', '의', '예', '충', '효',
  '높', '고귀', '수려', '우아', '화평', '화목', '화창', '화사',
  '상서', '상서로', '복될', '복스', '길상', '경사', '영광',
  '빛날', '영화', '영특', '총명', '재능', '재주', '뛰어', '탁월',
  '건강', '건강할', '강건', '활기', '활발', '생기', '생동',
  '봄', '햇살', '꽃', '향기', '솔', '하늘', '달', '별',
]

export function calcNameScore({ nameOhaeng, yongsin, gisin, meanings }: ScoreInput): ScoreDetail {
  // ── 1. 용신 일치도 (0~40) ───────────────────────────────────────
  let yongsinScore = 20  // 사주 없으면 기본 20점
  if (yongsin && yongsin !== '?') {
    const total = nameOhaeng.length
    if (total > 0) {
      const matches = nameOhaeng.filter(h => h.element === yongsin).length
      const mismatches = nameOhaeng.filter(h => h.element === gisin).length
      const ratio = (matches - mismatches * 0.5) / total
      yongsinScore = Math.round(Math.max(0, Math.min(40, 20 + ratio * 20)))
    }
  }

  // ── 2. 오행 균형 (0~30) ─────────────────────────────────────────
  // 이름 글자들의 오행이 다양할수록 고점
  const elementSet = new Set(nameOhaeng.map(h => h.element))
  const diversity = elementSet.size  // 1~5
  const totalChars = nameOhaeng.length
  let balanceScore: number
  if (totalChars === 0) {
    balanceScore = 15
  } else if (totalChars === 1) {
    balanceScore = 20
  } else {
    // 다양성 비율 (다를수록 좋음)
    const diversityRatio = (diversity - 1) / Math.min(totalChars - 1, 4)
    balanceScore = Math.round(15 + diversityRatio * 15)
  }

  // ── 3. 한자 뜻 긍정성 (0~30) ────────────────────────────────────
  let meaningScore = 15  // 기본값 (한자 없을 때)
  if (meanings.length > 0) {
    const hits = meanings.filter(m =>
      POSITIVE_KEYWORDS.some(kw => m.includes(kw))
    ).length
    const ratio = hits / meanings.length
    meaningScore = Math.round(10 + ratio * 20)
  }

  const total = yongsinScore + balanceScore + meaningScore

  return { yongsinScore, balanceScore, meaningScore, total }
}

/** 점수 → 상위 % 텍스트 */
export function scoreToPercentile(total: number): string {
  if (total >= 90) return '상위 5%'
  if (total >= 80) return '상위 15%'
  if (total >= 70) return '상위 30%'
  if (total >= 60) return '상위 50%'
  return '상위 70%'
}
