'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const eventSchema = z.object({
  title: z.string().min(1, '이벤트 제목을 입력하세요').max(100),
  description: z.string().optional(),
  location: z.string().optional(),
  starts_at: z.string().min(1, '시작 시간을 입력하세요'),
  ends_at: z.string().optional(),
  rsvp_due_at: z.string().optional(),
  has_expense: z.boolean().default(false),
  has_carpool: z.boolean().default(false),
})

export type EventActionResult = {
  error?: string
  eventId?: string
}

function parseEventFormData(formData: FormData) {
  return eventSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    location: formData.get('location') || undefined,
    starts_at: formData.get('starts_at'),
    ends_at: formData.get('ends_at') || undefined,
    rsvp_due_at: formData.get('rsvp_due_at') || undefined,
    has_expense: formData.get('has_expense') === 'true',
    has_carpool: formData.get('has_carpool') === 'true',
  })
}

export async function createEvent(formData: FormData): Promise<EventActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const parsed = parseEventFormData(formData)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      ...parsed.data,
      host_id: userId,
    })
    .select('id')
    .single()

  if (error || !event) {
    return { error: '이벤트 생성에 실패했습니다.' }
  }

  // 호스트를 멤버로 자동 등록
  await supabase.from('event_members').insert({
    event_id: event.id,
    user_id: userId,
    role: 'host',
    rsvp: 'attending',
  })

  revalidatePath('/events')
  return { eventId: event.id }
}

export async function updateEvent(eventId: string, formData: FormData): Promise<EventActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const parsed = parseEventFormData(formData)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('events').update(parsed.data).eq('id', eventId)

  if (error) {
    return { error: '이벤트 수정에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/events')
  return {}
}

export async function cancelEvent(eventId: string): Promise<EventActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const { error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', eventId)

  if (error) {
    return { error: '이벤트 취소에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/events')
  return {}
}

export async function completeEvent(eventId: string): Promise<EventActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const { error } = await supabase.from('events').update({ status: 'completed' }).eq('id', eventId)

  if (error) {
    return { error: '이벤트 완료 처리에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath('/events')
  return {}
}

export async function deleteEvent(eventId: string): Promise<EventActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const { error } = await supabase.from('events').delete().eq('id', eventId)

  if (error) {
    return { error: '이벤트 삭제에 실패했습니다.' }
  }

  revalidatePath('/events')
  return {}
}
