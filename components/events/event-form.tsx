'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { createEvent, updateEvent } from '@/lib/actions/event-actions'

type EventFormProps = {
  eventId?: string
  defaultValues?: {
    title?: string
    description?: string | null
    location?: string | null
    starts_at?: string
    rsvp_due_at?: string | null
    has_expense?: boolean
    has_carpool?: boolean
  }
  onSuccess?: () => void
}

// datetime-local input에 맞는 포맷으로 변환
function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

export function EventForm({ eventId, defaultValues, onSuccess }: EventFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hasExpense, setHasExpense] = useState(defaultValues?.has_expense ?? false)
  const [hasCarpool, setHasCarpool] = useState(defaultValues?.has_carpool ?? false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('has_expense', String(hasExpense))
    formData.set('has_carpool', String(hasCarpool))

    startTransition(async () => {
      const result = eventId ? await updateEvent(eventId, formData) : await createEvent(formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(eventId ? '이벤트가 수정되었습니다.' : '이벤트가 생성되었습니다.')
      onSuccess?.()

      if (!eventId && result.eventId) {
        router.push(`/events/${result.eventId}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 기본 정보 그룹 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">
            이벤트 제목 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            placeholder="이벤트 이름을 입력하세요"
            defaultValue={defaultValues?.title ?? ''}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="이벤트에 대해 설명해주세요"
            rows={3}
            className="resize-none"
            defaultValue={defaultValues?.description ?? ''}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">장소</Label>
          <Input
            id="location"
            name="location"
            placeholder="장소를 입력하세요"
            defaultValue={defaultValues?.location ?? ''}
          />
        </div>
      </div>

      {/* 날짜/시간 그룹 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">
            날짜 및 시간 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            defaultValue={toDatetimeLocal(defaultValues?.starts_at)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rsvp_due_at">참석 응답 마감일</Label>
          <Input
            id="rsvp_due_at"
            name="rsvp_due_at"
            type="datetime-local"
            defaultValue={toDatetimeLocal(defaultValues?.rsvp_due_at)}
          />
        </div>
      </div>

      {/* 기능 토글 — 테두리 영역으로 시각적으로 구분 */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          선택 기능
        </p>
        <div className="space-y-0 divide-y">
          <div className="flex items-center justify-between py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">정산 기능</p>
              <p className="text-xs text-muted-foreground">비용 분담 및 정산 탭을 활성화합니다</p>
            </div>
            <Switch checked={hasExpense} onCheckedChange={setHasExpense} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">카풀 기능</p>
              <p className="text-xs text-muted-foreground">카풀 제안 및 신청 탭을 활성화합니다</p>
            </div>
            <Switch checked={hasCarpool} onCheckedChange={setHasCarpool} />
          </div>
        </div>
      </div>

      {/* 버튼 영역 — 저장은 full width, 취소는 고정 너비 */}
      <div className="flex gap-2 pt-1">
        {!eventId && (
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => router.back()}
          >
            취소
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? '저장 중...' : eventId ? '수정 완료' : '이벤트 만들기'}
        </Button>
      </div>
    </form>
  )
}
