import Link from 'next/link'

export default function PaymentFailPage() {
  return (
    <main className="ethereal-gradient min-h-screen flex items-center justify-center px-6 relative">
      {/* 배경 장식 블러 */}
      <div className="fixed top-[-10%] right-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(217,93,57,0.08)', filter: 'blur(120px)' }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[80%] h-[40%] rounded-full pointer-events-none"
        style={{ background: 'rgba(93,115,157,0.08)', filter: 'blur(120px)' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel rounded-3xl p-8 shadow-sm text-center space-y-6">

          {/* 아이콘 */}
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl"
            style={{ background: 'rgba(217,93,57,0.1)' }}>
            ✕
          </div>

          {/* 메시지 */}
          <div className="space-y-2">
            <h1 className="font-serif text-xl font-bold text-[#2D2926]">결제가 취소되었습니다</h1>
            <p className="text-sm text-[#6D6661] leading-relaxed">
              결제가 완료되지 않아 청구되지 않았습니다.<br />
              언제든지 다시 시도하실 수 있습니다.
            </p>
          </div>

          {/* 버튼 */}
          <Link
            href="/"
            className="block w-full py-5 rounded-full text-white font-bold text-base text-center transition-all active:scale-95"
            style={{
              background: 'linear-gradient(to right, #D95D39, #F28C6A)',
              boxShadow: '0 12px 40px rgba(217,93,57,0.35)',
            }}
          >
            처음으로 돌아가기
          </Link>

          <p className="text-xs text-[#6D6661] opacity-60">
            Your Destiny Is Written In The Stars
          </p>
        </div>
      </div>
    </main>
  )
}
