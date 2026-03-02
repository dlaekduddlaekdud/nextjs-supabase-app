import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, TrendingUp, UserCheck } from 'lucide-react'
import type { AdminStats } from '@/lib/types/admin'

type KpiCardsProps = {
  stats: AdminStats
}

export function KpiCards({ stats }: KpiCardsProps) {
  const cards = [
    {
      title: '총 이벤트 수',
      value: stats.totalEvents,
      icon: Calendar,
    },
    {
      title: '총 사용자 수',
      value: stats.totalUsers,
      icon: Users,
    },
    {
      title: '활성 이벤트',
      value: stats.activeEvents,
      icon: TrendingUp,
    },
    {
      title: '총 참여자 수',
      value: stats.totalMembers,
      icon: UserCheck,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
