'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, PlusCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/',
    label: '홈',
    icon: Home,
    isActive: (pathname: string) => pathname === '/',
  },
  {
    href: '/events',
    label: '이벤트',
    icon: Calendar,
    // /events/new는 제외하고 나머지 /events/* 경로에서 활성화
    isActive: (pathname: string) => pathname.startsWith('/events') && pathname !== '/events/new',
  },
  {
    href: '/events/new',
    label: '새 이벤트',
    icon: PlusCircle,
    isActive: (pathname: string) => pathname.startsWith('/events/new'),
  },
  {
    href: '/profile',
    label: '프로필',
    icon: User,
    isActive: (pathname: string) => pathname.startsWith('/profile'),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="sticky bottom-0 z-50 shrink-0 border-t bg-background/95 backdrop-blur"
      aria-label="하단 네비게이션"
    >
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                // 터치 영역 최소 44px 이상 확보
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')}
                aria-hidden="true"
              />
              <span className={cn('font-medium', active ? 'text-primary' : '')}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
