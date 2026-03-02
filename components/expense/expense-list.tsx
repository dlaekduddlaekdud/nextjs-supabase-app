'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { deleteExpense, toggleSettled } from '@/lib/actions/expense-actions'
import { getProfile } from '@/lib/utils/profile'

type Split = {
  id: string
  amount: number
  is_settled: boolean
  profiles:
    | { id: string; full_name: string | null; avatar_url: string | null }
    | { id: string; full_name: string | null; avatar_url: string | null }[]
    | null
}

type Expense = {
  id: string
  title: string
  amount: number
  created_at: string
  profiles:
    | { id: string; full_name: string | null; avatar_url: string | null }
    | { id: string; full_name: string | null; avatar_url: string | null }[]
    | null
  expense_splits: Split[]
}

type ExpenseListProps = {
  expenses: Expense[]
  eventId: string
  isManager: boolean
}

function ExpenseItem({
  expense,
  eventId,
  isManager,
}: {
  expense: Expense
  eventId: string
  isManager: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const payer = getProfile(expense.profiles)
  const payerName = payer?.full_name ?? '알 수 없음'
  const totalAmount = expense.amount.toLocaleString()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpense(eventId, expense.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('비용이 삭제되었습니다.')
        router.refresh()
      }
    })
  }

  function handleSettle(splitId: string, currentValue: boolean) {
    startTransition(async () => {
      const result = await toggleSettled(eventId, splitId, currentValue)
      if (result.error) {
        toast.error(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {/* 비용 헤더: 결제자 + 항목명 + 금액 */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={payer?.avatar_url ?? undefined} alt={payerName} />
          <AvatarFallback>{payerName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-semibold">{expense.title}</p>
          <p className="text-xs text-muted-foreground">{payerName} 결제</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-sm font-bold tabular-nums">{totalAmount}원</span>
          {isManager && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 분할 내역 목록 */}
      {expense.expense_splits.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1.5 bg-muted/30 px-4 py-3">
            {expense.expense_splits.map((split) => {
              const splitProfile = getProfile(split.profiles)
              const splitName = splitProfile?.full_name ?? '알 수 없음'
              return (
                <div key={split.id} className="flex items-center gap-2.5 text-xs">
                  <Checkbox
                    checked={split.is_settled}
                    onCheckedChange={() => handleSettle(split.id, split.is_settled)}
                    disabled={isPending}
                  />
                  <span
                    className={
                      split.is_settled ? 'flex-1 text-muted-foreground line-through' : 'flex-1'
                    }
                  >
                    {splitName}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {split.amount.toLocaleString()}원
                  </span>
                  {split.is_settled && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      정산완료
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function ExpenseList({ expenses, eventId, isManager }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">등록된 비용이 없습니다.</p>
    )
  }

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <ExpenseItem key={expense.id} expense={expense} eventId={eventId} isManager={isManager} />
      ))}
      {/* 총 지출 합계 */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 text-sm">
        <span className="font-semibold">총 지출</span>
        <span className="font-bold tabular-nums">{totalAmount.toLocaleString()}원</span>
      </div>
    </div>
  )
}
