import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays, Users, Mail, Clock, Shield } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LogoutButton } from '@/components/logout-button'

export async function ProfileContent() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const [{ data: profile }, { data: authUser }, { data: members }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, avatar_url, is_admin')
      .eq('id', userId)
      .single(),
    supabase.auth.getUser(),
    supabase.from('event_members').select('role').eq('user_id', userId),
  ])

  // profiles 테이블의 is_admin 컬럼으로 관리자 여부 판단
  const isAdmin = profile?.is_admin === true

  const displayName = profile?.full_name ?? profile?.email ?? '사용자'
  const email = profile?.email ?? (data.claims.email as string | undefined) ?? ''
  const initials = displayName.slice(0, 2).toUpperCase()

  const hostedCount = (members ?? []).filter(
    (m) => m.role === 'host' || m.role === 'co_host'
  ).length
  const joinedCount = (members ?? []).filter((m) => m.role === 'member').length

  const createdAt = authUser?.user?.created_at
    ? format(new Date(authUser.user.created_at), 'yyyy년 M월 d일', { locale: ko })
    : null

  return (
    <div className="space-y-4 p-4">
      {/* 프로필 카드 — 아바타 중앙 상단 배치 */}
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-5 py-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
          <AvatarFallback className="text-2xl font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          {/* 이름 + 관리자 배지 가로 정렬 */}
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-base font-bold">{displayName}</p>
            {isAdmin && (
              <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-xs">
                <Shield className="h-3 w-3" />
                관리자
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>
        </div>
        {/* 관리자일 때만 관리자 페이지 이동 버튼 표시 */}
        {isAdmin && (
          <Link
            href="/admin"
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Shield className="h-4 w-4" />
            관리자 페이지
          </Link>
        )}
      </div>

      {/* 이벤트 통계 */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/events"
          className="flex flex-col items-center gap-1.5 rounded-xl border bg-card px-4 py-5 transition-colors hover:bg-muted/50"
        >
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-bold">{hostedCount}</span>
          <span className="text-xs text-muted-foreground">만든 이벤트</span>
        </Link>
        <Link
          href="/events"
          className="flex flex-col items-center gap-1.5 rounded-xl border bg-card px-4 py-5 transition-colors hover:bg-muted/50"
        >
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-bold">{joinedCount}</span>
          <span className="text-xs text-muted-foreground">참여한 이벤트</span>
        </Link>
      </div>

      {/* 계정 정보 */}
      <div className="space-y-3 rounded-xl border bg-card px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          계정 정보
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{email}</span>
          </div>
          {createdAt && (
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">가입일</span>
              <span className="ml-auto">{createdAt}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* 로그아웃 */}
      <div className="flex justify-center pt-1">
        <LogoutButton />
      </div>
    </div>
  )
}
