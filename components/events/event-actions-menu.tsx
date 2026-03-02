'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreVertical, Pencil, Ban, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EventForm } from '@/components/events/event-form'
import { cancelEvent, completeEvent, deleteEvent } from '@/lib/actions/event-actions'
import type { Event } from '@/lib/types/event'

type EventActionsMenuProps = {
  eventId: string
  status: 'active' | 'cancelled' | 'completed'
  event?: Partial<Event>
}

type ConfirmActionType = 'cancel' | 'complete' | 'delete'

const ACTION_CONFIG: Record<
  ConfirmActionType,
  { fn: (id: string) => Promise<{ error?: string }>; label: string; navigate: boolean }
> = {
  cancel: { fn: cancelEvent, label: '이벤트가 취소되었습니다.', navigate: false },
  complete: { fn: completeEvent, label: '이벤트가 완료 처리되었습니다.', navigate: false },
  delete: { fn: deleteEvent, label: '이벤트가 삭제되었습니다.', navigate: true },
}

export function EventActionsMenu({ eventId, status, event }: EventActionsMenuProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(null)

  function handleConfirm() {
    if (!confirmAction) return
    const { fn, label, navigate } = ACTION_CONFIG[confirmAction]
    startTransition(async () => {
      const result = await fn(eventId)
      if (result.error) {
        toast.error(result.error)
        setConfirmAction(null)
        return
      }
      toast.success(label)
      if (navigate) {
        router.push('/events')
      } else {
        router.refresh()
        setConfirmAction(null)
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === 'active' && (
            <>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                이벤트 수정
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmAction('complete')}
                className="text-primary focus:text-primary"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                완료 처리
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmAction('cancel')}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="mr-2 h-4 w-4" />
                이벤트 취소
              </DropdownMenuItem>
            </>
          )}
          {(status === 'completed' || status === 'cancelled') && (
            <DropdownMenuItem
              onClick={() => setConfirmAction('delete')}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              이벤트 삭제
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 이벤트 수정 다이얼로그 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>이벤트 수정</DialogTitle>
          </DialogHeader>
          <EventForm
            eventId={eventId}
            defaultValues={event}
            onSuccess={() => {
              setEditOpen(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 취소/완료 확인 다이얼로그 */}
      <Dialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'cancel'
                ? '이벤트 취소'
                : confirmAction === 'complete'
                  ? '이벤트 완료 처리'
                  : '이벤트 삭제'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'cancel'
                ? '이 이벤트를 취소하시겠습니까? 취소 후에는 되돌릴 수 없습니다.'
                : confirmAction === 'complete'
                  ? '이 이벤트를 완료 처리하시겠습니까?'
                  : '이 이벤트를 영구 삭제하시겠습니까? 모든 데이터가 함께 삭제됩니다.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              취소
            </Button>
            <Button
              variant={confirmAction === 'complete' ? 'default' : 'destructive'}
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? '처리 중...' : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
