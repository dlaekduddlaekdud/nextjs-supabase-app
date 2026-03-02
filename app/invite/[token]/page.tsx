import { createClient } from '@/lib/supabase/server'
import { acceptInvitation, declineInvitation } from '@/lib/actions/member-actions'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()

  // 비인증 사용자는 로그인 후 재진입
  if (!authData?.claims) {
    redirect(`/auth/login?next=/invite/${token}`)
  }

  // 초대 정보 조회
  const { data: invitation } = await supabase
    .from('invitations')
    .select(
      `
      id,
      email,
      status,
      expires_at,
      events (
        id,
        title,
        description,
        location,
        starts_at
      )
    `
    )
    .eq('token', token)
    .single()

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>유효하지 않은 초대</CardTitle>
            <CardDescription>초대 링크가 올바르지 않습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // events 조인 결과 정규화 (배열 또는 단일 객체 처리)
  const eventData = Array.isArray(invitation.events) ? invitation.events[0] : invitation.events

  if (invitation.status !== 'pending') {
    const statusText =
      invitation.status === 'accepted'
        ? '이미 수락한 초대입니다.'
        : invitation.status === 'declined'
          ? '이미 거절한 초대입니다.'
          : '만료된 초대입니다.'

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>초대 처리 완료</CardTitle>
            <CardDescription>{statusText}</CardDescription>
          </CardHeader>
          {invitation.status === 'accepted' && eventData && (
            <CardContent>
              <Button asChild className="w-full">
                <a href={`/events/${eventData.id}`}>이벤트로 이동</a>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>만료된 초대</CardTitle>
            <CardDescription>초대 기간이 만료되었습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const event = eventData as {
    id: string
    title: string
    description: string | null
    location: string | null
    starts_at: string
  } | null

  async function handleAccept() {
    'use server'
    const result = await acceptInvitation(token)
    if (result.eventId) {
      redirect(`/events/${result.eventId}`)
    }
  }

  async function handleDecline() {
    'use server'
    await declineInvitation(token)
    redirect('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>이벤트 초대</CardTitle>
          <CardDescription>{invitation.email}로 초대가 왔습니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {event && (
            <div className="space-y-2 rounded-lg border p-4">
              <h3 className="text-lg font-semibold">{event.title}</h3>
              {event.description && (
                <p className="text-sm text-muted-foreground">{event.description}</p>
              )}
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">일시:</span>{' '}
                  {format(new Date(event.starts_at), 'PPP EEE p', { locale: ko })}
                </p>
                {event.location && (
                  <p>
                    <span className="font-medium">장소:</span> {event.location}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <form action={handleAccept} className="flex-1">
              <Button type="submit" className="w-full">
                수락
              </Button>
            </form>
            <form action={handleDecline} className="flex-1">
              <Button type="submit" variant="outline" className="w-full">
                거절
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
