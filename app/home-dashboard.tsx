import { createClient } from '@/lib/supabase/server'
import { format, differenceInCalendarDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays, MapPin } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

type EventRow = {
  id: string
  title: string
  location: string | null
  starts_at: string
  status: 'active' | 'cancelled' | 'completed'
  role: 'host' | 'co_host' | 'member'
}

function DdayBadge({ startsAt }: { startsAt: string }) {
  const days = differenceInCalendarDays(new Date(startsAt), new Date())
  const label = days === 0 ? 'D-Day' : `D-${days}`
  return (
    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
      {label}
    </span>
  )
}

function EventItem({ event, trailing }: { event: EventRow; trailing?: React.ReactNode }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-accent/40"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold">{event.title}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>{format(new Date(event.starts_at), 'M월 d일(EEE) p', { locale: ko })}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>
      {trailing}
    </Link>
  )
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export async function HomeDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()

  const [{ data: profile }, { data: members }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', userId).single(),
    supabase
      .from('event_members')
      .select(
        `
        role,
        events (
          id,
          title,
          location,
          starts_at,
          status
        )
      `
      )
      .eq('user_id', userId)
      .order('joined_at', { ascending: false }),
  ])

  // Google OAuth 사용자는 full_name이 없을 수 있어 email 앞부분을 폴백으로 사용
  const rawName = profile?.full_name ?? profile?.email?.split('@')[0] ?? null
  const displayName = rawName ?? '사용자'

  type RawEventRow = {
    id: string
    title: string
    location: string | null
    starts_at: string
    status: string
  }

  const allEvents: EventRow[] = (members ?? []).flatMap((m) => {
    const ev = (Array.isArray(m.events) ? m.events[0] : m.events) as RawEventRow | null
    if (!ev) return []
    return [
      {
        id: ev.id,
        title: ev.title,
        location: ev.location,
        starts_at: ev.starts_at,
        status: ev.status as EventRow['status'],
        role: m.role as EventRow['role'],
      },
    ]
  })

  const now = new Date()

  // 오늘 이후 active 이벤트 — 날짜 오름차순, 최대 3개
  const upcomingEvents = allEvents
    .filter((e) => e.status === 'active' && new Date(e.starts_at) >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 3)

  // 종료/취소된 이벤트 — 날짜 내림차순, 최대 5개
  const endedEvents = allEvents
    .filter((e) => e.status === 'completed' || e.status === 'cancelled')
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-5 px-4 py-6">
      {/* 인사 영역 */}
      <div>
        <h1 className="text-xl font-bold">안녕하세요, {displayName}님</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">오늘도 좋은 모임 되세요</p>
      </div>

      {/* 다가오는 이벤트 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">다가오는 이벤트</h2>
        {upcomingEvents.length === 0 ? (
          <EmptySection message="다가오는 이벤트가 없습니다." />
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <EventItem
                key={event.id}
                event={event}
                trailing={<DdayBadge startsAt={event.starts_at} />}
              />
            ))}
          </div>
        )}
      </section>

      {/* 종료된 이벤트 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">지난 이벤트</h2>
        {endedEvents.length === 0 ? (
          <EmptySection message="지난 이벤트가 없습니다." />
        ) : (
          <div className="space-y-2">
            {endedEvents.map((event) => (
              <EventItem
                key={event.id}
                event={event}
                trailing={
                  <Badge
                    variant={event.status === 'cancelled' ? 'destructive' : 'secondary'}
                    className="shrink-0 text-[11px]"
                  >
                    {event.status === 'cancelled' ? '취소됨' : '종료'}
                  </Badge>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
