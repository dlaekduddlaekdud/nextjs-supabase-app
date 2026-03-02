'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function GoogleLoginButton() {
  async function handleClick() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <Button size="lg" className="w-full max-w-xs" onClick={handleClick}>
      Google로 시작하기
    </Button>
  )
}
