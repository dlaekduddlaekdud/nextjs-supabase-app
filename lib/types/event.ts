import type { Tables } from '@/lib/supabase/database.types'

export type Profile = Tables<'profiles'>
export type Event = Tables<'events'>
export type EventMember = Tables<'event_members'>
export type Invitation = Tables<'invitations'>
export type Announcement = Tables<'announcements'>
export type Expense = Tables<'expenses'>
export type ExpenseSplit = Tables<'expense_splits'>
export type CarpoolOffer = Tables<'carpool_offers'>
export type CarpoolPassenger = Tables<'carpool_passengers'>

// 이벤트 목록 카드에 필요한 뷰 모델
export type EventWithMeta = Event & {
  member_count: number
  my_rsvp: 'pending' | 'attending' | 'declined'
  my_role: 'host' | 'co_host' | 'member'
}

// 참여자 목록 + 프로필 조인
export type MemberWithProfile = EventMember & {
  profile: Profile
}

// 공지 + 작성자 프로필
export type AnnouncementWithAuthor = Announcement & {
  author: Profile
}

// 비용 + 결제자 프로필
export type ExpenseWithPayer = Expense & {
  payer: Profile
  splits: (ExpenseSplit & { profile: Profile })[]
}

// 카풀 제안 + 운전자 + 탑승자
export type CarpoolOfferWithDetails = CarpoolOffer & {
  driver: Profile
  passengers: (CarpoolPassenger & { profile: Profile })[]
  available_seats: number
}

// 정산 결과 (calculateSettlements 반환값)
export type Settlement = {
  from: Profile
  to: Profile
  amount: number
}
