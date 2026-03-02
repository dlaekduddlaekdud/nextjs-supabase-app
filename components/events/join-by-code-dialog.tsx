'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Hash } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { joinByInviteCode } from '@/lib/actions/member-actions'

export function JoinByCodeDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    startTransition(async () => {
      const result = await joinByInviteCode(code.trim())

      if (result.error) {
        toast.error(result.error)
      } else if (result.alreadyMember && result.eventId) {
        toast.info('이미 참여 중인 이벤트입니다.')
        setOpen(false)
        router.push(`/events/${result.eventId}`)
      } else if (result.eventId) {
        toast.success('이벤트에 참여했습니다!')
        setOpen(false)
        router.push(`/events/${result.eventId}`)
      }
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setCode('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Hash className="mr-1 h-3.5 w-3.5" />
          코드로 참여
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[320px]">
        <DialogHeader>
          <DialogTitle>초대 코드로 참여</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="초대 코드 입력 (예: ABC123)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="text-center font-mono text-lg uppercase tracking-widest"
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={isPending || !code.trim()}>
            {isPending ? '참여 중...' : '참여하기'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
