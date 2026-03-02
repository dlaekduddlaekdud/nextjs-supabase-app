'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type InviteCodeCopyButtonProps = {
  code: string
}

export function InviteCodeCopyButton({ code }: InviteCodeCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('초대 코드가 복사되었습니다.')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
      <span className="flex-1 text-center font-mono text-lg font-bold tracking-widest">{code}</span>
      <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 shrink-0">
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}
