import { redirect } from 'next/navigation'

// 가안 공유용 고정 미리보기 페이지
// https://fortune-lab-rho.vercel.app/preview/demo

const DEMO_HANJA = [
  { pos: 0, character: '安', reading: '안', meaning: '편안할' },
  { pos: 1, character: '鉉', reading: '현', meaning: '솥귀' },
  { pos: 2, character: '昊', reading: '호', meaning: '넓은 하늘' },
]

export default function PreviewDemoPage() {
  const hanja = Buffer.from(JSON.stringify(DEMO_HANJA)).toString('base64')
  const extra = Buffer.from(JSON.stringify([])).toString('base64')

  const params = new URLSearchParams({
    name: '안현호',
    birth: '1992.08.28',
    hanja,
    ids: '',
    extra,
    gender: 'male',
  })

  redirect(`/preview?${params.toString()}`)
}
