'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { createCarpoolOffer } from '@/lib/actions/carpool-actions'

type CarpoolOfferFormProps = {
  eventId: string
}

export function CarpoolOfferForm({ eventId }: CarpoolOfferFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [seats, setSeats] = useState('4')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('seats', seats)

    startTransition(async () => {
      const result = await createCarpoolOffer(eventId, formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('카풀 제안이 등록되었습니다.')
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Car className="mr-2 h-4 w-4" />
          카풀 등록
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>카풀 제안 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="departure">출발지 *</Label>
            <Input id="departure" name="departure" placeholder="예: 강남역 2번 출구" required />
          </div>
          <div className="space-y-1.5">
            <Label>좌석 수 *</Label>
            <Select value={seats} onValueChange={setSeats}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}석
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">메모</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="출발 시간, 경유지 등 추가 안내사항을 입력하세요"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '등록 중...' : '카풀 등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
