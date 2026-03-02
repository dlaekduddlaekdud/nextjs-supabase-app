import { getAdminStats } from '@/lib/actions/admin-actions'
import { KpiCards } from '@/components/admin/kpi-cards'

export default async function DashboardPage() {
  const stats = await getAdminStats()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>
      <KpiCards stats={stats} />
    </div>
  )
}
