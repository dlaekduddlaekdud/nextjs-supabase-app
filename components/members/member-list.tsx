'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { changeRole } from '@/lib/actions/member-actions'

type Member = {
  id: string
  role: 'host' | 'co_host' | 'member'
  rsvp: 'pending' | 'attending' | 'declined'
  joined_at: string
  profiles:
    | {
        id: string
        full_name: string | null
        email: string | null
        avatar_url: string | null
      }
    | {
        id: string
        full_name: string | null
        email: string | null
        avatar_url: string | null
      }[]
    | null
}

type MemberListProps = {
  members: Member[]
  currentUserId: string
  isManager: boolean
  eventId: string
}

const roleLabel: Record<string, string> = {
  host: '주최자',
  co_host: '공동주최',
  member: '참여자',
}

const rsvpLabel: Record<string, string> = {
  pending: '미정',
  attending: '참석',
  declined: '불참',
}

const rsvpVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  attending: 'default',
  declined: 'destructive',
}

function getProfile(profiles: Member['profiles']) {
  if (!profiles) return null
  return Array.isArray(profiles) ? profiles[0] : profiles
}

function MemberRow({
  member,
  currentUserId,
  isManager,
  eventId,
}: {
  member: Member
  currentUserId: string
  isManager: boolean
  eventId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const profile = getProfile(member.profiles)
  const displayName = profile?.full_name ?? profile?.email ?? '알 수 없음'
  const initials = displayName.slice(0, 2).toUpperCase()

  function handleRoleChange(newRole: string) {
    if (!profile?.id) {
      toast.error('프로필 정보를 불러올 수 없습니다.')
      return
    }
    startTransition(async () => {
      const result = await changeRole(eventId, profile.id, newRole as 'co_host' | 'member')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('역할이 변경되었습니다.')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {displayName}
          {profile?.id === currentUserId && (
            <span className="ml-1 text-xs text-muted-foreground">(나)</span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={rsvpVariant[member.rsvp]} className="text-xs">
          {rsvpLabel[member.rsvp]}
        </Badge>
        {/* 역할 변경: 매니저이고 host가 아닌 경우만 */}
        {isManager && member.role !== 'host' ? (
          <Select value={member.role} onValueChange={handleRoleChange} disabled={isPending}>
            <SelectTrigger className="min-h-[44px] min-w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="co_host">공동주최</SelectItem>
              <SelectItem value="member">참여자</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary" className="text-xs">
            {roleLabel[member.role]}
          </Badge>
        )}
      </div>
    </div>
  )
}

export function MemberList({ members, currentUserId, isManager, eventId }: MemberListProps) {
  if (members.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">참여자가 없습니다.</p>
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          currentUserId={currentUserId}
          isManager={isManager}
          eventId={eventId}
        />
      ))}
    </div>
  )
}
