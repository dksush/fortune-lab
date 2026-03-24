'use client'

import Script from 'next/script'

export function KakaoInit() {
  return (
    <Script
      src="https://developers.kakao.com/sdk/js/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY)
        }
      }}
    />
  )
}
