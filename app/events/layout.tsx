import { Suspense } from 'react'
import { AuthButton } from '@/components/auth-button'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { BottomNav } from '@/components/bottom-nav'
import Link from 'next/link'

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    // 데스크톱에서 모바일 크기(430px)로 중앙 배치
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-background shadow-sm">
        <header className="sticky top-0 z-50 shrink-0 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/events" className="text-lg font-bold tracking-tight">
              Gather
            </Link>
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <Suspense fallback={<div className="w-20" />}>
                <AuthButton />
              </Suspense>
            </div>
          </div>
        </header>
        {/* 하단 네비게이션 높이(56px)만큼 패딩 추가 */}
        <main className="flex-1 pb-14">{children}</main>
        {/* usePathname은 navigation hook이므로 Suspense 필요 */}
        <Suspense fallback={<div className="h-14 border-t bg-background" />}>
          <BottomNav />
        </Suspense>
      </div>
    </div>
  )
}
