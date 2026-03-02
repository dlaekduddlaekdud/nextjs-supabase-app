import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogoutButton } from '@/components/logout-button'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims) {
    redirect('/auth/login')
  }

  const userId = claimsData.claims.sub

  // 프로필 + 가입일(auth user)을 병렬 조회
  const [{ data: profile }, { data: authUser }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, avatar_url').eq('id', userId).single(),
    supabase.auth.getUser(),
  ])

  if (!profile) {
    redirect('/auth/login')
  }

  // 이벤트 통계 병렬 조회
  const [{ data: hostedMembers }, { data: joinedMembers }] = await Promise.all([
    supabase
      .from('event_members')
      .select('id')
      .eq('user_id', userId)
      .in('role', ['host', 'co_host']),
    supabase.from('event_members').select('id').eq('user_id', userId).eq('role', 'member'),
  ])

  const hostedCount = hostedMembers?.length ?? 0
  const joinedCount = joinedMembers?.length ?? 0
  const displayName = profile.full_name ?? profile.email ?? '사용자'
  const createdAt = authUser?.user?.created_at

  return (
    <div className="space-y-5 px-4 py-6">
      <h1 className="text-xl font-bold">프로필</h1>

      {/* 사용자 정보 카드 — Avatar + 이름 + 이메일 수평 배치 */}
      <div className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm">
        <Avatar className="h-16 w-16 shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={displayName} />
          {/* 이름 앞 두 글자로 폴백 이니셜 표시 */}
          <AvatarFallback className="text-base font-semibold">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-base font-semibold leading-tight">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      {/* 통계 카드 2개 — 동일 너비 grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* 만든 이벤트 */}
        <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-card px-4 py-5 shadow-sm">
          <CalendarDays className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-3xl font-bold tabular-nums leading-none">{hostedCount}</p>
          <p className="text-xs text-muted-foreground">만든 이벤트</p>
        </div>
        {/* 참여한 이벤트 */}
        <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-card px-4 py-5 shadow-sm">
          <Users className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-3xl font-bold tabular-nums leading-none">{joinedCount}</p>
          <p className="text-xs text-muted-foreground">참여한 이벤트</p>
        </div>
      </div>

      {/* 계정 정보 — divide-y로 항목 구분 */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {createdAt && (
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-muted-foreground">가입일</span>
            <span className="text-sm font-medium">
              {format(new Date(createdAt), 'PPP', { locale: ko })}
            </span>
          </div>
        )}
        {/* createdAt이 있을 때만 구분선 추가 */}
        {createdAt && <div className="border-t" />}
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-sm text-muted-foreground">이메일</span>
          <span className="max-w-[180px] truncate text-sm font-medium">{profile.email}</span>
        </div>
      </div>

      {/* 로그아웃 버튼 — 하단 전체 너비 */}
      <div className="pt-1">
        <LogoutButton />
      </div>
    </div>
  )
}
