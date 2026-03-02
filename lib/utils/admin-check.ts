'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * 관리자 권한을 확인하고, 관리자가 아니면 /events로 리다이렉트
 * Server Component / Server Action에서만 사용 가능
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (!profile?.is_admin) {
    redirect('/events')
  }

  return { userId }
}
