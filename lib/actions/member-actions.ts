'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type MemberActionResult = {
  error?: string
}

export async function inviteMember(eventId: string, email: string): Promise<MemberActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  // 이미 초대된 이메일인지 확인
  const { data: existing } = await supabase
    .from('invitations')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('email', email)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return { error: '이미 초대 중인 이메일입니다.' }
  }

  // 이미 참여 중인 멤버인지 확인 (프로필 이메일 기준)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from('event_members')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', existingProfile.id)
      .single()

    if (existingMember) {
      return { error: '이미 참여 중인 멤버입니다.' }
    }
  }

  const { error } = await supabase.from('invitations').insert({
    event_id: eventId,
    invited_by: userId,
    email,
  })

  if (error) {
    return { error: '초대 생성에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/members`)
  return {}
}

export async function acceptInvitation(
  token: string
): Promise<{ eventId?: string; error?: string }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  // 초대 토큰 조회
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (inviteError || !invitation) {
    return { error: '유효하지 않은 초대 링크입니다.' }
  }

  if (invitation.status !== 'pending') {
    return { error: '이미 처리된 초대입니다.' }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await supabase.from('invitations').update({ status: 'expired' }).eq('id', invitation.id)
    return { error: '만료된 초대 링크입니다.' }
  }

  // 이미 멤버인지 확인
  const { data: existingMember } = await supabase
    .from('event_members')
    .select('id')
    .eq('event_id', invitation.event_id)
    .eq('user_id', userId)
    .single()

  if (!existingMember) {
    // 멤버로 추가
    const { error: insertError } = await supabase.from('event_members').insert({
      event_id: invitation.event_id,
      user_id: userId,
      role: 'member',
      rsvp: 'attending',
    })

    if (insertError) {
      return { error: '이벤트 참여 처리에 실패했습니다.' }
    }
  }

  // 초대 상태 업데이트
  await supabase.from('invitations').update({ status: 'accepted' }).eq('id', invitation.id)

  revalidatePath(`/events/${invitation.event_id}/members`)
  return { eventId: invitation.event_id }
}

export async function declineInvitation(token: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userEmail = data.claims.email

  // 초대 조회 및 소유권 확인
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, email')
    .eq('token', token)
    .single()

  if (!invitation || invitation.email !== userEmail) {
    return { error: '본인에게 발송된 초대만 거절할 수 있습니다.' }
  }

  const { error } = await supabase
    .from('invitations')
    .update({ status: 'declined' })
    .eq('token', token)

  if (error) {
    return { error: '거절 처리에 실패했습니다.' }
  }

  return {}
}

export async function updateRsvp(
  eventId: string,
  rsvp: 'attending' | 'declined'
): Promise<MemberActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const { error } = await supabase
    .from('event_members')
    .update({ rsvp })
    .eq('event_id', eventId)
    .eq('user_id', userId)

  if (error) {
    return { error: 'RSVP 업데이트에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/members`)
  return {}
}

export type JoinByCodeResult = {
  error?: string
  eventId?: string
  alreadyMember?: boolean
}

export async function joinByInviteCode(code: string): Promise<JoinByCodeResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  // RLS 우회용 SECURITY DEFINER 함수로 초대 코드 조회
  const { data: results } = await supabase.rpc('get_event_by_invite_code', {
    p_code: code.toUpperCase().trim(),
  })

  const result = results?.[0]

  if (!result) {
    return { error: '유효하지 않은 초대 코드입니다.' }
  }

  if (result.status !== 'active') {
    return { error: '활성 상태의 이벤트가 아닙니다.' }
  }

  const eventId = result.id

  // 이미 멤버인지 확인
  const { data: existingMember } = await supabase
    .from('event_members')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  if (existingMember) {
    return { eventId, alreadyMember: true }
  }

  const { error: insertError } = await supabase.from('event_members').insert({
    event_id: eventId,
    user_id: userId,
    role: 'member',
    rsvp: 'pending',
  })

  if (insertError) {
    return { error: '이벤트 참여에 실패했습니다.' }
  }

  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return { eventId }
}

export async function changeRole(
  eventId: string,
  targetUserId: string,
  newRole: 'co_host' | 'member'
): Promise<MemberActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const callerId = data.claims.sub

  // Application 레벨 권한 검증 (RLS만으로는 부족)
  const { data: callerMember } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('user_id', callerId)
    .single()

  if (!callerMember || (callerMember.role !== 'host' && callerMember.role !== 'co_host')) {
    return { error: '역할 변경 권한이 없습니다.' }
  }

  const { error } = await supabase
    .from('event_members')
    .update({ role: newRole })
    .eq('event_id', eventId)
    .eq('user_id', targetUserId)

  if (error) {
    return { error: '역할 변경에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/members`)
  return {}
}
