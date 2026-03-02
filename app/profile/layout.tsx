import { Suspense } from 'react'
import Link from 'next/link'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { BottomNav } from '@/components/bottom-nav'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-background shadow-sm">
        <header className="sticky top-0 z-50 shrink-0 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/events" className="text-lg font-bold tracking-tight">
              Gather
            </Link>
            <ThemeSwitcher />
          </div>
        </header>
        <main className="flex-1 pb-14">{children}</main>
        <Suspense fallback={<div className="h-14 border-t bg-background" />}>
          <BottomNav />
        </Suspense>
      </div>
    </div>
  )
}
