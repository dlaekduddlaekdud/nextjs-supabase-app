import { requireAdmin } from '@/lib/utils/admin-check'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import Link from 'next/link'
import { Suspense } from 'react'

// cookies() 호출을 Suspense 내부로 격리
async function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  // 관리자 권한 체크 — 비관리자는 /events로 리다이렉트
  await requireAdmin()

  return (
    <div className="min-h-screen bg-background">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-6">
          <span className="text-lg font-bold tracking-tight">Gather Admin</span>
          <Link
            href="/events"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            서비스로 이동 →
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* 좌측 사이드바 (240px 고정) */}
        <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r bg-background">
          {/* usePathname 사용으로 Suspense 필요 */}
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">로딩 중...</div>}>
            <AdminSidebar />
          </Suspense>
        </aside>

        {/* 우측 메인 컨텐츠 */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}

// 외부 컴포넌트는 non-async — Suspense 경계로 cookies() 호출 격리
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  )
}
