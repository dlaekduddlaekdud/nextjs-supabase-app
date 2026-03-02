'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const expenseSchema = z.object({
  title: z.string().min(1, '항목명을 입력하세요'),
  amount: z.number().int().positive('금액은 양수여야 합니다'),
})

export type ExpenseActionResult = {
  error?: string
}

export async function createExpense(
  eventId: string,
  formData: FormData
): Promise<ExpenseActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  const parsed = expenseSchema.safeParse({
    title: formData.get('title'),
    amount: Number(formData.get('amount')),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // 참석 멤버 목록 조회 (n등분 대상)
  const { data: members } = await supabase
    .from('event_members')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('rsvp', 'attending')

  if (!members || members.length === 0) {
    return { error: '참석 멤버가 없습니다.' }
  }

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      event_id: eventId,
      paid_by: userId,
      ...parsed.data,
    })
    .select('id')
    .single()

  if (expenseError || !expense) {
    return { error: '비용 추가에 실패했습니다.' }
  }

  // n등분 계산 후 expense_splits 생성
  const splitAmount = Math.floor(parsed.data.amount / members.length)
  const remainder = parsed.data.amount - splitAmount * members.length

  const splits = members.map((m, idx) => ({
    expense_id: expense.id,
    user_id: m.user_id,
    // 나머지 금액은 첫 번째 사람에게 배분
    amount: idx === 0 ? splitAmount + remainder : splitAmount,
  }))

  await supabase.from('expense_splits').insert(splits)

  revalidatePath(`/events/${eventId}/expense`)
  return {}
}

export async function toggleSettled(
  eventId: string,
  splitId: string,
  currentValue: boolean
): Promise<ExpenseActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const { error } = await supabase
    .from('expense_splits')
    .update({ is_settled: !currentValue })
    .eq('id', splitId)

  if (error) {
    return { error: '정산 처리에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/expense`)
  return {}
}

export async function deleteExpense(
  eventId: string,
  expenseId: string
): Promise<ExpenseActionResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)

  if (error) {
    return { error: '비용 삭제에 실패했습니다.' }
  }

  revalidatePath(`/events/${eventId}/expense`)
  return {}
}
