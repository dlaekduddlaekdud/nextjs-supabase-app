import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { ExpenseList } from '@/components/expense/expense-list'
import { ExpenseForm } from '@/components/expense/expense-form'
import { SettlementTable } from '@/components/expense/settlement-table'

interface ExpensePageProps {
  params: Promise<{ eventId: string }>
}

export default async function ExpensePage({ params }: ExpensePageProps) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  // 정산 기능 활성화 여부 확인
  const { data: event } = await supabase
    .from('events')
    .select('has_expense')
    .eq('id', eventId)
    .single()

  if (!event?.has_expense) {
    notFound()
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select(
      `
      id,
      title,
      amount,
      created_at,
      profiles!paid_by (
        id,
        full_name,
        avatar_url
      ),
      expense_splits (
        id,
        amount,
        is_settled,
        profiles!user_id (
          id,
          full_name,
          avatar_url
        )
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
    <div className="space-y-8">
      {/* 비용 내역 섹션 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">비용 내역</h2>
          <ExpenseForm eventId={eventId} />
        </div>
        <ExpenseList expenses={expenses ?? []} eventId={eventId} isManager={isManager ?? false} />
      </section>

      {/* 정산 결과 섹션 */}
      <section className="space-y-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold">정산 결과</h2>
          <p className="text-sm text-muted-foreground">
            각자 얼마를 누구에게 보내야 하는지 요약한 결과입니다.
          </p>
        </div>
        <SettlementTable expenses={expenses ?? []} />
      </section>
    </div>
  )
}
