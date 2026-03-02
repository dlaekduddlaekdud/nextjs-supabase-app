import { ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { calculateSettlements } from '@/lib/utils/expense'
import type { Profile } from '@/lib/types/event'

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
  amount: number
  profiles:
    | { id: string; full_name: string | null; avatar_url: string | null }
    | { id: string; full_name: string | null; avatar_url: string | null }[]
    | null
  expense_splits: Split[]
}

type SettlementTableProps = {
  expenses: Expense[]
}

function getProfile<T>(profiles: T | T[] | null): T | null {
  if (!profiles) return null
  return Array.isArray(profiles) ? profiles[0] : profiles
}

export function SettlementTable({ expenses }: SettlementTableProps) {
  // 정산 계산에 필요한 데이터 구성
  const userMap = new Map<string, Profile>()
  const paidMap = new Map<string, number>()

  for (const expense of expenses) {
    const payer = getProfile(expense.profiles)
    if (payer) {
      userMap.set(payer.id, payer as Profile)
      paidMap.set(payer.id, (paidMap.get(payer.id) ?? 0) + expense.amount)
    }
  }

  const splits = expenses.flatMap((expense) =>
    expense.expense_splits.map((split) => {
      const profile = getProfile(split.profiles)
      if (profile) {
        userMap.set(profile.id, profile as Profile)
      }
      return {
        user_id: profile?.id ?? '',
        amount: split.amount,
        paid_amount: paidMap.get(profile?.id ?? '') ?? 0,
        profile: (profile ?? {
          id: '',
          email: null,
          full_name: null,
          avatar_url: null,
          updated_at: '',
        }) as Profile,
      }
    })
  )

  const settlements = calculateSettlements(splits)

  if (settlements.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        정산이 필요 없거나 데이터가 부족합니다.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {settlements.map((s, i) => {
        const fromName = s.from.full_name ?? '알 수 없음'
        const toName = s.to.full_name ?? '알 수 없음'
        return (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={s.from.avatar_url ?? undefined} alt={fromName} />
              <AvatarFallback>{fromName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="max-w-[5rem] truncate text-sm font-medium">{fromName}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={s.to.avatar_url ?? undefined} alt={toName} />
              <AvatarFallback>{toName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="max-w-[5rem] truncate text-sm font-medium">{toName}</span>
            <span className="ml-auto font-bold text-primary">{s.amount.toLocaleString()}원</span>
          </div>
        )
      })}
    </div>
  )
}
