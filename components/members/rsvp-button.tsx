'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { updateRsvp } from '@/lib/actions/member-actions'

type RsvpButtonProps = {
  eventId: string
  currentRsvp: 'pending' | 'attending' | 'declined'
}

export function RsvpButton({ eventId, currentRsvp }: RsvpButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleChange(rsvp: 'attending' | 'declined') {
    startTransition(async () => {
      const result = await updateRsvp(eventId, rsvp)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(
          rsvp === 'attending' ? '참석으로 변경되었습니다.' : '불참으로 변경되었습니다.'
        )
        router.refresh()
      }
    })
  }

  return (
    <div className="flex w-full gap-2">
      <Button
        className="min-h-[44px] flex-1"
        variant={currentRsvp === 'attending' ? 'default' : 'outline'}
        onClick={() => handleChange('attending')}
        disabled={isPending || currentRsvp === 'attending'}
      >
        참석
      </Button>
      <Button
        className="min-h-[44px] flex-1"
        variant={currentRsvp === 'declined' ? 'destructive' : 'outline'}
        onClick={() => handleChange('declined')}
        disabled={isPending || currentRsvp === 'declined'}
      >
        불참
      </Button>
    </div>
  )
}
