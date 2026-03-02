import { MemberList } from '@/components/members/member-list'
import { InviteForm } from '@/components/members/invite-form'
import { requireEventRole } from '@/lib/utils/auth-check'
import { createClient } from '@/lib/supabase/server'

interface MembersPageProps {
  params: Promise<{ eventId: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { eventId } = await params
  const { userId, role } = await requireEventRole(eventId)

  const supabase = await createClient()
  const { data: members } = await supabase
    .from('event_members')
    .select(
      `
      id,
      role,
      rsvp,
      joined_at,
      profiles (
        id,
        full_name,
        email,
        avatar_url
      )
    `
    )
    .eq('event_id', eventId)
    .order('joined_at', { ascending: true })

  const isManager = role === 'host' || role === 'co_host'
  const memberCount = (members ?? []).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">참여자 {memberCount}명</p>
        {isManager && <InviteForm eventId={eventId} />}
      </div>
      <MemberList
        members={members ?? []}
        currentUserId={userId}
        isManager={isManager}
        eventId={eventId}
      />
    </div>
  )
}
