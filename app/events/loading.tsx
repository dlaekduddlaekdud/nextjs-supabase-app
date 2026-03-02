import { Skeleton } from '@/components/ui/skeleton'

export default function EventsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* 헤더 영역: 제목 + 버튼 */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* 이벤트 카드 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border bg-card p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
