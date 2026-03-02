import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { CarpoolOfferCard } from '@/components/carpool/carpool-offer-card'
import { CarpoolOfferForm } from '@/components/carpool/carpool-offer-form'

interface CarpoolPageProps {
  params: Promise<{ eventId: string }>
}

export default async function CarpoolPage({ params }: CarpoolPageProps) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    redirect('/auth/login')
  }

  const userId = data.claims.sub

  // 카풀 기능 활성화 여부 확인
  const { data: event } = await supabase
    .from('events')
    .select('has_carpool')
    .eq('id', eventId)
    .single()

  if (!event?.has_carpool) {
    notFound()
  }

  const { data: offers } = await supabase
    .from('carpool_offers')
    .select(
      `
      id,
      departure,
      seats,
      note,
      created_at,
      profiles!driver_id (
        id,
        full_name,
        avatar_url
      ),
      carpool_passengers (
        id,
        status,
        profiles!user_id (
          id,
          full_name,
          avatar_url
        )
      )
    `
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">카풀 목록</h2>
        <CarpoolOfferForm eventId={eventId} />
      </div>

      {offers && offers.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">등록된 카풀이 없습니다.</p>
      ) : (
        <div className="divide-y overflow-hidden border">
          {(offers ?? []).map((offer) => (
            <CarpoolOfferCard
              key={offer.id}
              offer={offer}
              currentUserId={userId}
              eventId={eventId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
