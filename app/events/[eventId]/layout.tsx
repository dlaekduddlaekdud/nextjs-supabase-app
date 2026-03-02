import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventActionsMenu } from '@/components/events/event-actions-menu'
import { notFound } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

interface EventLayoutProps {
  children: React.ReactNode
  params: Promise<{ eventId: string }>
}

// cookies()를 사용하는 동적 부분을 Suspense 내부로 격리
async function EventLayoutBody({
  eventId,
  children,
}: {
  eventId: string
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const { data: event } = await supabase
    .from('events')
    .select(
      'id, title, description, location, starts_at, ends_at, rsvp_due_at, status, has_expense, has_carpool, host_id'
    )
    .eq('id', eventId)
    .single()

  if (!event) {
    notFound()
  }

  const { data: myMember } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  if (!myMember) {
    redirect('/events')
  }

  const isManager = myMember.role === 'host' || myMember.role === 'co_host'

  return (
    <>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link href="/events" className="text-sm text-muted-foreground hover:underline">
            ← 내 이벤트
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{event.title}</h1>
          {event.status !== 'active' && (
            <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {event.status === 'cancelled' ? '취소됨' : '완료됨'}
            </span>
          )}
        </div>
        {isManager && <EventActionsMenu eventId={eventId} status={event.status} event={event} />}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" asChild>
            <Link href={`/events/${eventId}`}>개요</Link>
          </TabsTrigger>
          <TabsTrigger value="members" asChild>
            <Link href={`/events/${eventId}/members`}>참여자</Link>
          </TabsTrigger>
          <TabsTrigger value="announcements" asChild>
            <Link href={`/events/${eventId}/announcements`}>공지</Link>
          </TabsTrigger>
          {event.has_expense && (
            <TabsTrigger value="expense" asChild>
              <Link href={`/events/${eventId}/expense`}>정산</Link>
            </TabsTrigger>
          )}
          {event.has_carpool && (
            <TabsTrigger value="carpool" asChild>
              <Link href={`/events/${eventId}/carpool`}>카풀</Link>
            </TabsTrigger>
          )}
        </TabsList>
        {children}
      </Tabs>
    </>
  )
}

function EventLayoutSkeleton() {
  return (
    <>
      <div className="mb-4 space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="mb-6 h-10 w-full" />
    </>
  )
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { eventId } = await params

  return (
    <div className="px-4 py-6">
      <Suspense fallback={<EventLayoutSkeleton />}>
        <EventLayoutBody eventId={eventId}>{children}</EventLayoutBody>
      </Suspense>
    </div>
  )
}
