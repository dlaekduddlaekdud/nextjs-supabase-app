'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { MapPin, Users, CheckCircle, XCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  joinCarpool,
  leaveCarpool,
  confirmPassenger,
  rejectPassenger,
} from '@/lib/actions/carpool-actions'
import { getProfile } from '@/lib/utils/profile'

type Passenger = {
  id: string
  status: 'pending' | 'confirmed' | 'rejected'
  profiles:
    | { id: string; full_name: string | null; avatar_url: string | null }
    | { id: string; full_name: string | null; avatar_url: string | null }[]
    | null
}

type Offer = {
  id: string
  departure: string
  seats: number
  note: string | null
  created_at: string
  profiles:
    | { id: string; full_name: string | null; avatar_url: string | null }
    | { id: string; full_name: string | null; avatar_url: string | null }[]
    | null
  carpool_passengers: Passenger[]
}

type CarpoolOfferCardProps = {
  offer: Offer
  currentUserId: string
  eventId: string
}

export function CarpoolOfferCard({ offer, currentUserId, eventId }: CarpoolOfferCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const driver = getProfile(offer.profiles)
  const driverName = driver?.full_name ?? '알 수 없음'
  const isDriver = driver?.id === currentUserId

  const activePassengers = offer.carpool_passengers.filter(
    (p) => p.status === 'pending' || p.status === 'confirmed'
  )
  const availableSeats = offer.seats - activePassengers.length

  const myPassenger = offer.carpool_passengers.find((p) => {
    const profile = getProfile(p.profiles)
    return profile?.id === currentUserId
  })

  function handleJoin() {
    startTransition(async () => {
      const result = await joinCarpool(eventId, offer.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('탑승 신청이 완료되었습니다.')
        router.refresh()
      }
    })
  }

  function handleLeave() {
    startTransition(async () => {
      const result = await leaveCarpool(eventId, offer.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('탑승 신청이 취소되었습니다.')
        router.refresh()
      }
    })
  }

  function handleConfirm(passengerId: string) {
    startTransition(async () => {
      const result = await confirmPassenger(eventId, passengerId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('탑승이 확정되었습니다.')
        router.refresh()
      }
    })
  }

  function handleReject(passengerId: string) {
    startTransition(async () => {
      const result = await rejectPassenger(eventId, passengerId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('탑승이 거절되었습니다.')
        router.refresh()
      }
    })
  }

  return (
    <Card className="overflow-hidden rounded-none shadow-none">
      {/* 카드 헤더: 드라이버 정보 + 좌석 배지 */}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={driver?.avatar_url ?? undefined} alt={driverName} />
            <AvatarFallback>{driverName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-semibold">{driverName}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <MapPin className="h-3 w-3" />
                {offer.departure}
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Users className="h-3 w-3" />
                {availableSeats > 0 ? `${availableSeats}석 남음` : '만석'}
              </span>
            </div>
          </div>
          <Badge
            variant={availableSeats > 0 ? 'secondary' : 'destructive'}
            className="shrink-0 text-xs"
          >
            {offer.seats}석
          </Badge>
        </div>
      </CardHeader>

      {/* 메모 */}
      {offer.note && (
        <CardContent className="pb-3 pt-0">
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {offer.note}
          </p>
        </CardContent>
      )}

      {/* 확정된 탑승자 — 모든 멤버에게 공개 */}
      {offer.carpool_passengers.some((p) => p.status === 'confirmed') && (
        <CardContent className="pb-3 pt-0">
          <Separator className="mb-3" />
          <p className="mb-2 text-xs font-semibold text-foreground">탑승 확정</p>
          <div className="space-y-1.5">
            {offer.carpool_passengers
              .filter((p) => p.status === 'confirmed')
              .map((p) => {
                const pProfile = getProfile(p.profiles)
                const pName = pProfile?.full_name ?? '알 수 없음'
                return (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={pProfile?.avatar_url ?? undefined} alt={pName} />
                      <AvatarFallback>{pName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate">{pName}</span>
                  </div>
                )
              })}
          </div>
        </CardContent>
      )}

      {/* 드라이버 전용: 대기 중 탑승 신청자 + 확정/거절 버튼 */}
      {isDriver && offer.carpool_passengers.some((p) => p.status === 'pending') && (
        <CardContent className="pb-3 pt-0">
          <Separator className="mb-3" />
          <p className="mb-2 text-xs font-semibold text-foreground">탑승 신청자</p>
          <div className="space-y-2">
            {offer.carpool_passengers
              .filter((p) => p.status === 'pending')
              .map((p) => {
                const pProfile = getProfile(p.profiles)
                const pName = pProfile?.full_name ?? '알 수 없음'
                return (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={pProfile?.avatar_url ?? undefined} alt={pName} />
                      <AvatarFallback>{pName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate">{pName}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-green-600 hover:bg-green-50 hover:text-green-700"
                        onClick={() => handleConfirm(p.id)}
                        disabled={isPending}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleReject(p.id)}
                        disabled={isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      )}

      {/* 드라이버가 아닌 경우: 신청 상태 + 신청/취소 버튼 */}
      {!isDriver && (
        <CardContent className="border-t bg-muted/30 pt-3">
          {myPassenger ? (
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-xs">
                {myPassenger.status === 'pending'
                  ? '대기 중'
                  : myPassenger.status === 'confirmed'
                    ? '탑승 확정'
                    : '거절됨'}
              </Badge>
              {myPassenger.status !== 'confirmed' && (
                <Button variant="outline" size="sm" onClick={handleLeave} disabled={isPending}>
                  신청 취소
                </Button>
              )}
            </div>
          ) : (
            <Button
              className="w-full"
              size="sm"
              onClick={handleJoin}
              disabled={isPending || availableSeats === 0}
            >
              {availableSeats === 0 ? '만석' : '탑승 신청'}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}
