import Link from 'next/link'

export default function PaymentFailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="text-4xl">✕</div>
        <h1 className="text-white font-semibold text-xl">결제가 취소되었습니다</h1>
        <p className="text-purple-400 text-sm">결제가 완료되지 않아 청구되지 않았습니다.</p>
        <Link
          href="/"
          className="block w-full py-4 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-2xl transition-colors"
        >
          처음으로 돌아가기
        </Link>
      </div>
    </main>
  )
}
