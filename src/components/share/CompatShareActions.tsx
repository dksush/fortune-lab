'use client'

import { useState } from 'react'

interface Props {
  uuid: string
  myName: string
  partnerName: string
  relationType?: string
}

function getConnector(relationType?: string): string {
  if (relationType === 'lover') return '♥'
  if (relationType === 'family') return '∞'
  return '✦'
}

declare global {
  interface Window { Kakao: any }
}

export function CompatShareActions({ uuid, myName, partnerName, relationType }: Props) {
  const connector = getConnector(relationType)
  const [copied, setCopied] = useState(false)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://fortune-lab-rho.vercel.app'
  const resultUrl = `${baseUrl}/compat/result/${uuid}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resultUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKakao = () => {
    if (!window.Kakao?.isInitialized()) return
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `${myName} ${connector} ${partnerName} 궁합 풀이`,
        description: '두 사람의 이름에 담긴 기운의 조화를 확인해보세요',
        imageUrl: `${baseUrl}/api/og/compat/${uuid}`,
        link: { mobileWebUrl: resultUrl, webUrl: resultUrl },
      },
      buttons: [
        { title: '궁합 보기', link: { mobileWebUrl: resultUrl, webUrl: resultUrl } },
        { title: '나도 해보기', link: { mobileWebUrl: `${baseUrl}/compat`, webUrl: `${baseUrl}/compat` } },
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
