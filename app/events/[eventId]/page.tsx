import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays, MapPin, Users, Clock, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RsvpButton } from '@/components/members/rsvp-button'
import { InviteCodeCopyButton } from '@/components/events/invite-code-copy-button'
import { getProfile } from '@/lib/utils/profile'

type HostProfile = { id: string; full_name: string | null; avatar_url: string | null }

interface EventPageProps {
  params: Promise<{ eventId: string }>
}

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const { data: eventData } = await supabase
    .from('events')
    .select('*, profiles!host_id (id, full_name, avatar_url)')
    .eq('id', eventId)
    .single()

  const event = eventData as unknown as typeof eventData & {
    profiles: HostProfile | HostProfile[] | null
  }

  if (!event) {
    notFound()
  }

  const hostProfile = getProfile(event.profiles)

  const { data: myMember } = await supabase
    .from('event_members')
    .select('rsvp, role')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  const { data: memberCount } = await supabase
    .from('event_members')
    .select('id', { count: 'exact' })
    .eq('event_id', eventId)

  const totalCount = memberCount?.length ?? 0
  const attendingCount =
    (
      await supabase
        .from('event_members')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)
        .eq('rsvp', 'attending')
    ).data?.length ?? 0

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="space-y-4">
            {/* 이벤트 설명 */}
            {event.description && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            )}

            <Separator />

            {/* 이벤트 주요 정보 그리드 */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{format(new Date(event.starts_at), 'PPP EEE p', { locale: ko })}</span>
              </div>

              {event.ends_at && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>~ {format(new Date(event.ends_at), 'PPP EEE p', { locale: ko })}</span>
                </div>
              )}

              {event.location && (
                <div className="flex items-center gap-2.5 text-sm">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-sm">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  {attendingCount}명 참석 / {totalCount}명 초대
                </span>
              </div>

              {hostProfile && (
                <div className="flex items-center gap-2.5 text-sm">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage
                        src={hostProfile.avatar_url ?? undefined}
                        alt={hostProfile.full_name ?? ''}
                      />
                      <AvatarFallback className="text-[10px]">
                        {(hostProfile.full_name ?? '??').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{hostProfile.full_name ?? '알 수 없음'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* RSVP 마감일 강조 배너 */}
            {event.rsvp_due_at && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2.5 text-sm">
                <span className="font-semibold">신청 마감</span>
                <span className="text-muted-foreground">
                  {format(new Date(event.rsvp_due_at), 'PPP EEE p', { locale: ko })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 내 참석 여부 RSVP 영역 */}
      {myMember && event.status === 'active' && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <span className="text-sm font-medium">내 참석 여부</span>
          <RsvpButton
            eventId={eventId}
            currentRsvp={myMember.rsvp as 'pending' | 'attending' | 'declined'}
          />
        </div>
      )}

      {/* 초대 코드 — 이미 참여 중인 멤버에게만 표시 */}
      {myMember && (
        <div className="space-y-1.5 px-1">
          <p className="text-xs font-medium text-muted-foreground">초대 코드</p>
          <InviteCodeCopyButton code={event.invite_code} />
        </div>
      )}
    </div>
  )
}
