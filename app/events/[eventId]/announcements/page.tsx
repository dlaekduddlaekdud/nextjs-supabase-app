import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnnouncementList } from '@/components/announcements/announcement-list'
import { AnnouncementForm } from '@/components/announcements/announcement-form'

interface AnnouncementsPageProps {
  params: Promise<{ eventId: string }>
}

export default async function AnnouncementsPage({ params }: AnnouncementsPageProps) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const { data: announcements } = await supabase
    .from('announcements')
    .select(
      `
      id,
      title,
      body,
      created_at,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  const { data: myMember } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  const isManager = myMember?.role === 'host' || myMember?.role === 'co_host'

  return (
    <div className="space-y-6">
      {isManager && (
        <div className="flex justify-end">
          <AnnouncementForm eventId={eventId} />
        </div>
      )}
      <AnnouncementList
        announcements={announcements ?? []}
        isManager={isManager ?? false}
        eventId={eventId}
      />
    </div>
  )
}
