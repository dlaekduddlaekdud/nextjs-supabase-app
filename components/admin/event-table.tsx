'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deleteAdminEvent } from '@/lib/actions/admin-actions'
import type { AdminEventItem } from '@/lib/types/admin'

type EventTableProps = {
  data: AdminEventItem[]
  total: number
  page: number
  pageSize: number
}

// 상태값에 따른 Badge 스타일 반환
function getStatusBadge(status: AdminEventItem['status']) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">활성</Badge>
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">취소됨</Badge>
    case 'completed':
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">완료됨</Badge>
  }
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
      // 검색어 또는 필터 변경 시 page를 1로 리셋
      if ('search' in updates || 'status' in updates) {
        params.delete('page')
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )
}

export function EventTable({ data, total, page, pageSize }: EventTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const updateSearchParams = useUpdateSearchParams()

  const totalPages = Math.ceil(total / pageSize)
  const currentSearch = searchParams.get('search') ?? ''
  const currentStatus = searchParams.get('status') ?? 'all'

  // 이벤트 삭제 처리
  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 이벤트를 삭제하시겠습니까? 모든 관련 데이터가 함께 삭제됩니다.`))
      return

    const result = await deleteAdminEvent(id)
    if (result.error) {
      toast.error('삭제 실패: ' + result.error)
    } else {
      toast.success('이벤트가 삭제되었습니다.')
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <div className="flex gap-3">
        <Input
          placeholder="이벤트 제목 검색..."
          defaultValue={currentSearch}
          className="max-w-xs"
          onChange={(e) => updateSearchParams({ search: e.target.value })}
        />
        <Select
          value={currentStatus}
          onValueChange={(value) =>
            updateSearchParams({ status: value === 'all' ? undefined : value })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="상태 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="cancelled">취소됨</SelectItem>
            <SelectItem value="completed">완료됨</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 데이터 테이블 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>주최자</TableHead>
              <TableHead>시작일</TableHead>
              <TableHead>참여자 수</TableHead>
              <TableHead className="w-20">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  이벤트가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{row.host.full_name ?? '-'}</div>
                      <div className="text-muted-foreground">{row.host.email ?? '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(row.starts_at), 'yyyy.MM.dd', { locale: ko })}
                  </TableCell>
                  <TableCell>{row.member_count}명</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(row.id, row.title)}
                    >
                      삭제
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">총 {total.toLocaleString()}건</span>
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
