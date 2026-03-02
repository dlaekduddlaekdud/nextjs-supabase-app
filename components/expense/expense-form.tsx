'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { createExpense } from '@/lib/actions/expense-actions'

type ExpenseFormProps = {
  eventId: string
}

export function ExpenseForm({ eventId }: ExpenseFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createExpense(eventId, formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('비용이 추가되었습니다.')
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          비용 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>비용 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="expense-title">항목명 *</Label>
            <Input id="expense-title" name="title" placeholder="예: 장소 대여비, 식비" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-amount">금액 (원) *</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-muted-foreground">
                ₩
              </span>
              <Input
                id="expense-amount"
                name="amount"
                type="number"
                min={1}
                placeholder="0"
                className="pl-7"
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            * 결제자는 본인으로 자동 설정되며, 참석 멤버에게 n등분됩니다.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '추가 중...' : '비용 추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
