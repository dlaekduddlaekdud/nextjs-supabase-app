'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const carpoolOfferSchema = z.object({
  departure: z.string().min(1, '출발지를 입력하세요'),
  seats: z.number().int().min(1).max(8, '좌석은 1~8석 사이여야 합니다'),
  note: z.string().optional(),
})

export type CarpoolActionResult = {
  error?: string
}

export async function createCarpoolOffer(
  eventId: string,
  formData: FormData
): Promise<CarpoolActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const parsed = carpoolOfferSchema.safeParse({
    departure: formData.get('departure'),
    seats: Number(formData.get('seats')),
    note: formData.get('note') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('carpool_offers').insert({
    event_id: eventId,
    driver_id: userId,
    ...parsed.data,
  })

  if (error) {
    return { error: '카풀 제안 등록에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/carpool`)
  return {}
}

export async function joinCarpool(eventId: string, offerId: string): Promise<CarpoolActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  // 잔여 좌석 확인
  const { data: offer } = await supabase
    .from('carpool_offers')
    .select('seats')
    .eq('id', offerId)
    .single()

  if (!offer) {
    return { error: '카풀 정보를 찾을 수 없습니다.' }
  }

  const { data: passengers } = await supabase
    .from('carpool_passengers')
    .select('id')
    .eq('offer_id', offerId)
    .in('status', ['pending', 'confirmed'])

  const confirmedCount = passengers?.length ?? 0
  if (confirmedCount >= offer.seats) {
    return { error: '잔여 좌석이 없습니다.' }
  }

  const { error } = await supabase.from('carpool_passengers').insert({
    offer_id: offerId,
    user_id: userId,
    status: 'pending',
  })

  if (error) {
    return { error: '탑승 신청에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/carpool`)
  return {}
}

export async function leaveCarpool(eventId: string, offerId: string): Promise<CarpoolActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const { error } = await supabase
    .from('carpool_passengers')
    .delete()
    .eq('offer_id', offerId)
    .eq('user_id', userId)

  if (error) {
    return { error: '탑승 취소에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/carpool`)
  return {}
}

export async function confirmPassenger(
  eventId: string,
  passengerId: string
): Promise<CarpoolActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const { error } = await supabase
    .from('carpool_passengers')
    .update({ status: 'confirmed' })
    .eq('id', passengerId)

  if (error) {
    return { error: '탑승 확인에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/carpool`)
  return {}
}

export async function rejectPassenger(
  eventId: string,
  passengerId: string
): Promise<CarpoolActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const { error } = await supabase
    .from('carpool_passengers')
    .update({ status: 'rejected' })
    .eq('id', passengerId)

  if (error) {
    return { error: '탑승 거절에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/carpool`)
  return {}
}
