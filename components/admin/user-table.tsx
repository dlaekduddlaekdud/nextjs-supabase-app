'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AdminUserItem } from '@/lib/types/admin'

type UserTableProps = {
  data: AdminUserItem[]
  total: number
  page: number
  pageSize: number
}

// URL searchParams 업데이트 헬퍼 훅
function useUpdateSearchParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      // 검색어 변경 시 page를 1로 리셋
      if ('search' in updates) {
        params.delete('page')
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )
}

export function UserTable({ data, total, page, pageSize }: UserTableProps) {
  const searchParams = useSearchParams()
  const updateSearchParams = useUpdateSearchParams()

  const totalPages = Math.ceil(total / pageSize)
  const currentSearch = searchParams.get('search') ?? ''

  return (
    <div className="space-y-4">
      {/* 검색 영역 */}
      <div className="flex gap-3">
        <Input
          placeholder="이름 또는 이메일 검색..."
          defaultValue={currentSearch}
          className="max-w-xs"
          onChange={(e) => updateSearchParams({ search: e.target.value })}
        />
      </div>

      {/* 데이터 테이블 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>관리자 여부</TableHead>
              <TableHead>생성 이벤트 수</TableHead>
              <TableHead>마지막 업데이트</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  사용자가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.full_name ?? '-'}</TableCell>
                  <TableCell>{row.email ?? '-'}</TableCell>
                  <TableCell>
                    {row.is_admin ? (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">관리자</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">일반</Badge>
                    )}
                  </TableCell>
                  <TableCell>{row.event_count}개</TableCell>
                  <TableCell>{format(new Date(row.updated_at), 'yyyy.MM.dd')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">총 {total.toLocaleString()}명</span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateSearchParams({ page: String(page - 1) })}
          >
            이전
          </Button>
          <span className="text-sm">
            {page} / {totalPages || 1} 페이지
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updateSearchParams({ page: String(page + 1) })}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  )
}
