import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h2>
        <p className="text-muted-foreground">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      </div>
      <Button asChild>
        <Link href="/">홈으로 이동</Link>
      </Button>
    </div>
  )
}
