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
    <div className="space-y-3">
      <button
        onClick={handleKakao}
        className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-semibold rounded-xl transition-colors"
      >
        <span>💬</span> 카카오톡 공유
      </button>
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 py-3 bg-purple-800 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
      >
        {copied ? '✓ 복사됨!' : '🔗 링크 복사'}
      </button>
    </div>
  )
}
