export type AdminStats = {
  totalEvents: number
  totalUsers: number
  activeEvents: number
  totalMembers: number
}

export type AdminEventItem = {
  id: string
  title: string
  status: 'active' | 'cancelled' | 'completed'
  starts_at: string
  created_at: string
  host: {
    email: string | null
    full_name: string | null
  }
  member_count: number
}

export type AdminUserItem = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  updated_at: string
  event_count: number
}

export type AdminListResult<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}
