import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EventForm } from '@/components/events/event-form'

export default async function NewEventPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">이벤트 만들기</h1>
      <EventForm />
    </div>
  )
}
