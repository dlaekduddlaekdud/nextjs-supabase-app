'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { createAnnouncement } from '@/lib/actions/announcement-actions'

type AnnouncementFormProps = {
  eventId: string
}

export function AnnouncementForm({ eventId }: AnnouncementFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createAnnouncement(eventId, formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('공지가 등록되었습니다.')
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Megaphone className="mr-2 h-4 w-4" />
          공지 작성
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>공지 작성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">제목 *</Label>
            <Input id="ann-title" name="title" placeholder="공지 제목을 입력하세요" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-body">내용 *</Label>
            <Textarea
              id="ann-body"
              name="body"
              placeholder="공지 내용을 입력하세요"
              rows={5}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '등록 중...' : '공지 등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
