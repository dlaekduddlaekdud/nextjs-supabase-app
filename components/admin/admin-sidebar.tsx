'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: '대시보드',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: '이벤트 관리',
    href: '/admin/events',
    icon: Calendar,
  },
  {
    label: '사용자 관리',
    href: '/admin/users',
    icon: Users,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        // 현재 경로와 메뉴 href가 일치하는지 확인
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
