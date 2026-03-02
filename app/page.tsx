import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CalendarDays, Link2, Users } from 'lucide-react'
import { GoogleLoginButton } from '@/components/google-login-button'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { BottomNav } from '@/components/bottom-nav'
import Link from 'next/link'
import { HomeDashboard } from './home-dashboard'

const FEATURES = [
  {
    icon: CalendarDays,
    title: '간편한 이벤트 생성',
    description: '제목, 날짜, 장소만 입력하면 즉시 이벤트 생성',
  },
  {
    icon: Link2,
    title: '원클릭 초대 시스템',
    description: '자동 생성된 초대 링크를 카카오톡으로 간편 공유',
  },
  {
    icon: Users,
    title: '실시간 참여자 관리',
    description: '참여자 목록 자동 업데이트로 현황 파악',
  },
]

function LandingPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-background shadow-sm">
        <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
          {/* 히어로 섹션 */}
          <div className="space-y-3 text-center">
            <h1 className="text-5xl font-bold tracking-tight">Gather</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              초대 링크 하나로 모든 것을 해결하는
              <br />
              소모임 이벤트 관리 플랫폼
            </p>
          </div>

          {/* 기능 카드 3개 */}
          <div className="w-full space-y-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold leading-snug">{title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA 버튼 */}
          <div className="w-full space-y-3">
            <GoogleLoginButton />
            <p className="text-center text-xs text-muted-foreground">
              5-30명 규모의 소규모 이벤트에 최적화된 플랫폼
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

function AppShell({ userId }: { userId: string }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-background shadow-sm">
        <header className="sticky top-0 z-50 shrink-0 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Gather
            </Link>
            <ThemeSwitcher />
          </div>
        </header>
        <main className="flex-1 pb-14">
          <HomeDashboard userId={userId} />
        </main>
        <Suspense fallback={<div className="h-14 border-t bg-background" />}>
          <BottomNav />
        </Suspense>
      </div>
    </div>
  )
}

// cookies()를 호출하는 async 로직을 Suspense 내부로 격리
async function HomeContent() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    return <LandingPage />
  }

  return <AppShell userId={data.claims.sub} />
}

// 외부 컴포넌트는 non-async — Suspense 경계로 cookies() 호출을 격리
export default function Home() {
  return (
    <Suspense fallback={<LandingPage />}>
      <HomeContent />
    </Suspense>
  )
}
