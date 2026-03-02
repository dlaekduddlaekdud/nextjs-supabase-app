import { getAdminUserList } from '@/lib/actions/admin-actions'
import { UserTable } from '@/components/admin/user-table'

type SearchParams = Promise<{
  search?: string
  page?: string
}>

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  // Next.js 16: searchParams는 Promise
  const sp = await searchParams

  const result = await getAdminUserList({
    search: sp.search,
    page: sp.page ? Number(sp.page) : 1,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">사용자 관리</h1>
      <UserTable
        data={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
      />
    </div>
  )
}
