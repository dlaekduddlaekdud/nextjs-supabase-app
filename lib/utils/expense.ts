import type { Profile, Settlement } from '@/lib/types/event'

type Balance = {
  profile: Profile
  amount: number // 양수: 받을 돈, 음수: 낼 돈
}

/**
 * 비용 분담 데이터로 최소 이체 횟수 정산 결과를 계산한다.
 * 순수 함수 - DB 호출 없음
 */
export function calculateSettlements(
  splits: { user_id: string; amount: number; paid_amount: number; profile: Profile }[]
): Settlement[] {
  // 각 사용자별 순 잔액 계산 (낸 돈 - 내야 할 돈)
  const balances: Balance[] = splits.map((s) => ({
    profile: s.profile,
    amount: s.paid_amount - s.amount,
  }))

  // 잔액이 0인 사람 제거
  const creditors = balances.filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount)
  const debtors = balances.filter((b) => b.amount < 0).sort((a, b) => a.amount - b.amount)

  const settlements: Settlement[] = []
  let i = 0
  let j = 0

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i]
    const debt = debtors[j]
    const transferAmount = Math.min(credit.amount, -debt.amount)

    settlements.push({
      from: debt.profile,
      to: credit.profile,
      amount: transferAmount,
    })

    credit.amount -= transferAmount
    debt.amount += transferAmount

    if (credit.amount === 0) i++
    if (debt.amount === 0) j++
  }

  return settlements
}
