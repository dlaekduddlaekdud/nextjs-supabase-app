'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteAnnouncement } from '@/lib/actions/announcement-actions'
import { getProfile } from '@/lib/utils/profile'

type Announcement = {
  id: string
  title: string
  body: string
  created_at: string
  profiles:
    | { id: string; full_name: string | null; avatar_url: string | null }
    | { id: string; full_name: string | null; avatar_url: string | null }[]
    | null
}

type AnnouncementListProps = {
  announcements: Announcement[]
  isManager: boolean
  eventId: string
}

function AnnouncementItem({
  ann,
  isManager,
  eventId,
}: {
  ann: Announcement
  isManager: boolean
  eventId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const profile = getProfile(ann.profiles)
  const authorName = profile?.full_name ?? '알 수 없음'

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAnnouncement(eventId, ann.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('공지가 삭제되었습니다.')
        setDeleteDialogOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        {/* 헤더: 토글 영역과 삭제 버튼을 분리해 button 중첩 방지 */}
        <div className="flex items-center gap-1 pr-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            <Avatar className="mt-0.5 h-8 w-8 shrink-0">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={authorName} />
              <AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-sm font-semibold leading-snug">{ann.title}</p>
              {!expanded && (
                <p className="line-clamp-1 text-xs text-muted-foreground">{ann.body}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {authorName} · {format(new Date(ann.created_at), 'PPP', { locale: ko })}
              </p>
            </div>
            {expanded ? (
              <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {isManager && (
            <Button
              variant="ghost"
              size="icon"
              className="h-[44px] w-[44px] shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {/* 펼쳐진 본문 영역 */}
        {expanded && (
          <>
            <Separator />
            <div className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              {ann.body}
            </div>
          </>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공지 삭제</DialogTitle>
            <DialogDescription>
              이 공지를 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function AnnouncementList({ announcements, isManager, eventId }: AnnouncementListProps) {
  if (announcements.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">등록된 공지가 없습니다.</p>
    )
  }

  return (
    <div className="space-y-2">
      {announcements.map((ann) => (
        <AnnouncementItem key={ann.id} ann={ann} isManager={isManager} eventId={eventId} />
      ))}
    </div>
  )
}
