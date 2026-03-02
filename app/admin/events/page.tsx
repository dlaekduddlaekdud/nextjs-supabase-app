import { getAdminEventList } from '@/lib/actions/admin-actions'
import { EventTable } from '@/components/admin/event-table'

type SearchParams = Promise<{
  search?: string
  status?: string
  page?: string
  sortBy?: string
  sortOrder?: string
}>

export default async function AdminEventsPage({ searchParams }: { searchParams: SearchParams }) {
  // Next.js 16: searchParams는 Promise
  const sp = await searchParams

  const result = await getAdminEventList({
    search: sp.search,
    status: sp.status as 'active' | 'cancelled' | 'completed' | undefined,
    page: sp.page ? Number(sp.page) : 1,
    sortBy: sp.sortBy as 'created_at' | 'starts_at' | 'title' | undefined,
    sortOrder: sp.sortOrder as 'asc' | 'desc' | undefined,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">이벤트 관리</h1>
      <EventTable
        data={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
      />
    </div>
  )
}
