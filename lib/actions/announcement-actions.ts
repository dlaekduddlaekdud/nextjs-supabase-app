'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const announcementSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  body: z.string().min(1, '내용을 입력하세요'),
})

export type AnnouncementActionResult = {
  error?: string
}

export async function createAnnouncement(
  eventId: string,
  formData: FormData
): Promise<AnnouncementActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const parsed = announcementSchema.safeParse({
    title: formData.get('title'),
    body: formData.get('body'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('announcements').insert({
    event_id: eventId,
    author_id: userId,
    ...parsed.data,
  })

  if (error) {
    return { error: '공지 작성에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/announcements`)
  return {}
}

export async function deleteAnnouncement(
  eventId: string,
  announcementId: string
): Promise<AnnouncementActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const { error } = await supabase.from('announcements').delete().eq('id', announcementId)

  if (error) {
    return { error: '공지 삭제에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/announcements`)
  return {}
}
