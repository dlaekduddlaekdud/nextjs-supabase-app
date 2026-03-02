import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export type EventCardData = {
  id: string
  title: string
  location: string | null
  starts_at: string
  status: 'active' | 'cancelled' | 'completed'
  my_role: 'host' | 'co_host' | 'member'
  my_rsvp: 'pending' | 'attending' | 'declined'
  cover_image_url?: string | null
  host_name?: string | null
  host_avatar_url?: string | null
  member_count?: number
}

type StatusConfig = { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }

function getStatusConfig(event: EventCardData): StatusConfig {
  if (event.status === 'cancelled') return { label: '취소됨', variant: 'destructive' }
  if (event.status === 'completed') return { label: '종료', variant: 'secondary' }
  // active: 날짜가 오늘 이전이면 '진행 중', 이후면 '예정'
  const isPast = new Date(event.starts_at) < new Date()
  return isPast ? { label: '진행 중', variant: 'default' } : { label: '예정', variant: 'outline' }
}

// 커버 이미지 없을 때 제목 기반 색상 플레이스홀더
const COVER_COLORS = [
  'bg-violet-100 text-violet-600',
  'bg-blue-100 text-blue-600',
  'bg-emerald-100 text-emerald-600',
  'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
]

function getCoverColor(id: string) {
  const idx = id.charCodeAt(0) % COVER_COLORS.length
  return COVER_COLORS[idx]
}

export function EventCard({ event }: { event: EventCardData }) {
  const { label, variant } = getStatusConfig(event)
  const coverColor = getCoverColor(event.id)
  const titleInitial = event.title.slice(0, 1)
  const hostInitials = (event.host_name ?? '?').slice(0, 2).toUpperCase()

  return (
    <Link href={`/events/${event.id}`} className="block">
      <div className="group rounded-xl border bg-card transition-colors hover:border-border/80 hover:bg-accent/40">
        {/* 메인 영역 */}
        <div className="flex items-start gap-3 px-4 pt-4">
          {/* 커버 이미지 or 플레이스홀더 */}
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-xl font-bold ${coverColor}`}
          >
            {event.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              titleInitial
            )}
          </div>

          {/* 이벤트 정보 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold leading-snug">{event.title}</p>
              <Badge variant={variant} className="shrink-0 text-[11px] leading-none">
                {label}
              </Badge>
            </div>
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {format(new Date(event.starts_at), 'PPP EEE p', { locale: ko })}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 — 주최자 + 참가자 수 */}
        <div className="mt-3 flex items-center justify-between border-t px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={event.host_avatar_url ?? undefined} alt={event.host_name ?? ''} />
              <AvatarFallback className="text-[10px]">{hostInitials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{event.host_name ?? '알 수 없음'}</span>
          </div>
          {event.member_count !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{event.member_count}명</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
