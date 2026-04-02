'use client'

import { useState } from 'react'

interface Props {
  uuid: string
  inputName: string
}

declare global {
  interface Window { Kakao: any }
}

export function ShareActions({ uuid, inputName }: Props) {
  const [copied, setCopied] = useState(false)
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/result/${uuid}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKakao = () => {
    if (!window.Kakao?.isInitialized()) return
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `${inputName}의 이름 풀이`,
        description: 'AI가 분석한 나의 이름 기운을 확인해보세요',
        imageUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/og/${uuid}`,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [
        { title: '풀이 보기', link: { mobileWebUrl: url, webUrl: url } },
        { title: '나도 받기', link: { mobileWebUrl: process.env.NEXT_PUBLIC_BASE_URL, webUrl: process.env.NEXT_PUBLIC_BASE_URL } },
      ],
    })
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleKakao}
        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FEE500] hover:bg-[#F5DB00] text-[#3C1E1E] font-semibold rounded-xl transition-colors text-sm"
      >
        <span>💬</span> 카카오 공유
      </button>
      <button
        onClick={handleCopy}
        className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#C4973A] hover:bg-[#FAF5EA] text-[#3D2B1F] font-semibold rounded-xl transition-colors text-sm"
      >
        {copied ? '✓ 복사됨' : '🔗 링크 복사'}
      </button>
    </div>
  )
}
