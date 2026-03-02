import { Skeleton } from '@/components/ui/skeleton'

export default function EventDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* 헤더: 뒤로가기 + 제목 */}
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        {/* 액션 메뉴 자리 */}
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-16 rounded-md" />
        ))}
      </div>

      {/* 개요 탭 콘텐츠 - Card 영역 */}
      <div className="space-y-4 rounded-lg border bg-card p-6">
        {/* 설명 */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />

        <div className="border-t pt-4" />

        {/* 일정·장소·참석 정보 그리드 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* RSVP 버튼 영역 */}
      <div className="mt-6 flex items-center gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
    </div>
  )
}
