import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { EventCard } from '@/components/events/event-card'
import type { EventCardData } from '@/components/events/event-card'
import { JoinByCodeDialog } from '@/components/events/join-by-code-dialog'
import { Plus } from 'lucide-react'
import { getProfile } from '@/lib/utils/profile'

type HostProfile = { full_name: string | null; avatar_url: string | null }

type EventWithHost = {
  id: string
  title: string
  location: string | null
  starts_at: string
  status: string
  profiles: HostProfile | HostProfile[] | null
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {/* 카운트 뱃지 — 0개일 때도 표시 */}
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  )
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export default async function EventsPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const { data: members } = await supabase
    .from('event_members')
    .select(
      `
      role,
      rsvp,
      events (
        id,
        title,
        location,
        starts_at,
        status,
        profiles!host_id (
          full_name,
          avatar_url
        )
      )
    `
    )
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })

  // 이벤트 ID 목록 수집 → 참가자 수 일괄 조회
  const rawEvents = (members ?? []).flatMap((m) => {
    const ev = (Array.isArray(m.events) ? m.events[0] : m.events) as EventWithHost | null
    return ev ? [ev] : []
  })

  const eventIds = rawEvents.map((e) => e.id)
  const memberCountMap: Record<string, number> = {}

  if (eventIds.length > 0) {
    const { data: allMembers } = await supabase
      .from('event_members')
      .select('event_id')
      .in('event_id', eventIds)

    for (const m of allMembers ?? []) {
      memberCountMap[m.event_id] = (memberCountMap[m.event_id] ?? 0) + 1
    }
  }

  const events: EventCardData[] = (members ?? []).flatMap((m) => {
    const ev = (Array.isArray(m.events) ? m.events[0] : m.events) as EventWithHost | null
    if (!ev) return []

    const hostProfile = getProfile(ev.profiles)

    return [
      {
        id: ev.id,
        title: ev.title,
        location: ev.location,
        starts_at: ev.starts_at,
        status: ev.status as EventCardData['status'],
        my_role: m.role as EventCardData['my_role'],
        my_rsvp: m.rsvp as EventCardData['my_rsvp'],
        host_name: hostProfile?.full_name ?? null,
        host_avatar_url: hostProfile?.avatar_url ?? null,
        member_count: memberCountMap[ev.id] ?? 0,
      },
    ]
  })

  const hostedEvents = events.filter((e) => e.my_role === 'host' || e.my_role === 'co_host')
  const joinedEvents = events.filter((e) => e.my_role === 'member')

  return (
    <div className="space-y-6 px-4 py-6">
      {/* 페이지 헤더 — 제목+설명 / 만들기 버튼 */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold leading-tight">내 이벤트</h1>
          <p className="text-xs text-muted-foreground">참여하거나 호스팅하는 이벤트를 관리하세요</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <JoinByCodeDialog />
          <Button asChild size="sm" className="shrink-0">
            <Link href="/events/new">
              <Plus className="mr-1 h-3.5 w-3.5" />
              만들기
            </Link>
          </Button>
        </div>
      </div>

      {/* 내가 만든 이벤트 */}
      <section className="space-y-3">
        <SectionHeader title="내가 만든 이벤트" count={hostedEvents.length} />
        {hostedEvents.length === 0 ? (
          <EmptySection message="아직 만든 이벤트가 없습니다." />
        ) : (
          <div className="space-y-2">
            {hostedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* 내가 참여한 이벤트 */}
      <section className="space-y-3">
        <SectionHeader title="내가 참여한 이벤트" count={joinedEvents.length} />
        {joinedEvents.length === 0 ? (
          <EmptySection message="아직 참여한 이벤트가 없습니다." />
        ) : (
          <div className="space-y-2">
            {joinedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
