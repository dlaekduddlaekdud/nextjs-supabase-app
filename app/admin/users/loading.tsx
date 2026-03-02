import { Skeleton } from '@/components/ui/skeleton'

export default function AdminUsersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-36" />
      {/* 검색 영역 스켈레톤 */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
      </div>
      {/* 테이블 스켈레톤 */}
      <div className="rounded-md border">
        <div className="border-b p-3">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b p-3 last:border-0">
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* 페이지네이션 스켈레톤 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  )
}
