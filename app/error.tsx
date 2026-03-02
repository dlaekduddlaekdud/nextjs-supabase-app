'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 에러 로깅 (필요 시 외부 서비스 연동)
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">문제가 발생했습니다</h2>
        <p className="text-muted-foreground">
          예기치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </div>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  )
}
