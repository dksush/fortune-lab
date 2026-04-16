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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://fortune-lab-rho.vercel.app'
    const resultUrl = `${baseUrl}/result/${uuid}`
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `${inputName}의 이름 풀이`,
        description: '내 이름에 담긴 기운과 운명의 흐름을 확인해보세요',
        imageUrl: `${baseUrl}/api/og/${uuid}`,
        link: { mobileWebUrl: resultUrl, webUrl: resultUrl },
      },
      buttons: [
        { title: '풀이 보기', link: { mobileWebUrl: resultUrl, webUrl: resultUrl } },
        { title: '나도 받기', link: { mobileWebUrl: baseUrl, webUrl: baseUrl } },
      ],
    })
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleKakao}
        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FEE500] hover:bg-[#F5DB00] text-[#3C1E1E] font-semibold rounded-2xl transition-colors text-sm"
      >
        <span>💬</span> 카카오 공유
      </button>
      <button
        onClick={handleCopy}
        className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#2D2926]/20 hover:bg-[#2D2926]/5 text-[#2D2926] font-semibold rounded-2xl transition-colors text-sm"
      >
        {copied ? '✓ 복사됨' : '🔗 링크 복사'}
      </button>
    </div>
  )
}
