'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/utils/admin-check'
import type { AdminStats, AdminEventItem, AdminUserItem, AdminListResult } from '@/lib/types/admin'

// ---- getAdminStats ----

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin()

  const supabase = await createClient()

  const [
    { count: totalEvents },
    { count: totalUsers },
    { count: activeEvents },
    { count: totalMembers },
  ] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    // role = 'member'인 참여자만 집계 (host, co_host 제외)
    supabase.from('event_members').select('*', { count: 'exact', head: true }).eq('role', 'member'),
  ])

  return {
    totalEvents: totalEvents ?? 0,
    totalUsers: totalUsers ?? 0,
    activeEvents: activeEvents ?? 0,
    totalMembers: totalMembers ?? 0,
  }
}

// ---- getAdminEventList ----

type GetAdminEventListParams = {
  search?: string
  status?: 'active' | 'cancelled' | 'completed'
  page?: number
  pageSize?: number
  sortBy?: 'created_at' | 'starts_at' | 'title'
  sortOrder?: 'asc' | 'desc'
}

// Supabase JOIN 결과의 host 필드는 배열이거나 단일 객체일 수 있다
type RawEventRow = {
  id: string
  title: string
  status: 'active' | 'cancelled' | 'completed'
  starts_at: string
  created_at: string
  host:
    | { email: string | null; full_name: string | null }
    | { email: string | null; full_name: string | null }[]
    | null
  event_members: { count: number }[]
}

export async function getAdminEventList(
  params: GetAdminEventListParams = {}
): Promise<AdminListResult<AdminEventItem>> {
  await requireAdmin()

  const supabase = await createClient()

  const {
    search,
    status,
    page = 1,
    pageSize = 20,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('events')
    .select(
      `
      id,
      title,
      status,
      starts_at,
      created_at,
      host:profiles!events_host_id_fkey(email, full_name),
      event_members(count)
    `,
      { count: 'exact' }
    )
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, count, error } = await query

  if (error) {
    return { data: [], total: 0, page, pageSize }
  }

  const items: AdminEventItem[] = (data as RawEventRow[]).map((row) => {
    // JOIN 결과가 배열로 올 수 있으므로 첫 번째 요소 사용
    const hostRaw = Array.isArray(row.host) ? row.host[0] : row.host
    const memberCountRaw = row.event_members?.[0]?.count ?? 0

    return {
      id: row.id,
      title: row.title,
      status: row.status,
      starts_at: row.starts_at,
      created_at: row.created_at,
      host: {
        email: hostRaw?.email ?? null,
        full_name: hostRaw?.full_name ?? null,
      },
      member_count: memberCountRaw,
    }
  })

  return {
    data: items,
    total: count ?? 0,
    page,
    pageSize,
  }
}

// ---- getAdminUserList ----

type GetAdminUserListParams = {
  search?: string
  page?: number
  pageSize?: number
}

// profiles 테이블에 is_admin 컬럼이 추가되어 있으나 database.types.ts에 미반영 상태이므로 직접 타입 선언
type RawProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  updated_at: string
  events: { count: number }[]
}

export async function getAdminUserList(
  params: GetAdminUserListParams = {}
): Promise<AdminListResult<AdminUserItem>> {
  await requireAdmin()

  const supabase = await createClient()

  const { search, page = 1, pageSize = 20 } = params

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // host_id 기준 이벤트 수를 events(count) subquery로 집계
  let query = supabase
    .from('profiles')
    .select(
      `
      id,
      email,
      full_name,
      avatar_url,
      is_admin,
      updated_at,
      events(count)
    `,
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (search) {
    // email 또는 full_name 검색
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  const { data, count, error } = await query

  if (error) {
    return { data: [], total: 0, page, pageSize }
  }

  const items: AdminUserItem[] = (data as RawProfileRow[]).map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    is_admin: row.is_admin,
    updated_at: row.updated_at,
    event_count: row.events?.[0]?.count ?? 0,
  }))

  return {
    data: items,
    total: count ?? 0,
    page,
    pageSize,
  }
}

// ---- deleteAdminEvent ----

export async function deleteAdminEvent(eventId: string): Promise<{ error?: string }> {
  await requireAdmin()

  const supabase = await createClient()

  const { error } = await supabase.from('events').delete().eq('id', eventId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/events')

  return {}
}
