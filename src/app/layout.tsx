import type { Metadata } from 'next'
import { KakaoInit } from '@/components/KakaoInit'
import './globals.css'

export const metadata: Metadata = {
  title: '이름 풀이 | 내 이름의 기운을 알아보세요',
  description: 'AI가 분석하는 나만의 이름 풀이. 한자의 의미, 음양오행, 이름이 담은 기운을 확인하세요.',
  openGraph: {
    title: '이름 풀이',
    description: 'AI가 분석하는 나만의 이름 풀이',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-[#F5EDD8] text-[#2C1A0E] min-h-screen antialiased">
        {children}
        <KakaoInit />
      </body>
    </html>
  )
}
