import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type EventRole = 'host' | 'co_host' | 'member'

/**
 * 이벤트 내 사용자 역할을 확인하고, 요구 역할이 없으면 리다이렉트한다.
 * Server Component / Server Action에서만 사용 가능
 */
export async function requireEventRole(
  eventId: string,
  requiredRoles: EventRole[] = ['host', 'co_host', 'member']
): Promise<{ userId: string; role: EventRole }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const { data: member, error } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  if (error || !member) {
    redirect('/events')
  }

  const role = member.role as EventRole

  if (!requiredRoles.includes(role)) {
    redirect(`/events/${eventId}`)
  }

  return { userId, role }
}
