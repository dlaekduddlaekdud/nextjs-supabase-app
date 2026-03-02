/**
 * 테스트용 참여자 시드 스크립트
 *
 * 사용법: npx tsx scripts/seed-test-members.ts <EVENT_ID>
 *
 * 필요 환경변수 (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (admin API용)
 */

import { createClient } from '@supabase/supabase-js'

const EVENT_ID = process.argv[2]

if (!EVENT_ID) {
  console.error('사용법: npx tsx scripts/seed-test-members.ts <EVENT_ID>')
  process.exit(1)
}

// .env.local 수동 로드 (dotenv 미설치 환경 대응)
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const lines = readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local 없으면 환경변수에서 직접 사용
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type TestUser = {
  email: string
  name: string
  role: 'host' | 'co_host' | 'member'
  rsvp: 'attending' | 'declined' | 'pending'
}

const TEST_USERS: TestUser[] = [
  { email: 'host@gather.dev', name: '이주최', role: 'host', rsvp: 'attending' },
  { email: 'cohost@gather.dev', name: '박공동', role: 'co_host', rsvp: 'attending' },
  { email: 'member1@gather.dev', name: '김참석', role: 'member', rsvp: 'attending' },
  { email: 'member2@gather.dev', name: '최불참', role: 'member', rsvp: 'declined' },
  { email: 'member3@gather.dev', name: '정미정', role: 'member', rsvp: 'pending' },
  { email: 'member4@gather.dev', name: '오참가', role: 'member', rsvp: 'attending' },
  { email: 'member5@gather.dev', name: '한함께', role: 'member', rsvp: 'attending' },
]

const TEST_PASSWORD = 'TestPassword123!'

async function getOrCreateUser(user: TestUser): Promise<string> {
  // 기존 사용자 조회
  const { data: listData } = await supabase.auth.admin.listUsers()
  const existing = listData?.users.find((u) => u.email === user.email)

  if (existing) {
    console.log(`  기존 사용자 재사용: ${user.email} (${existing.id})`)
    return existing.id
  }

  // 신규 사용자 생성
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: user.name },
  })

  if (error || !data.user) {
    throw new Error(`사용자 생성 실패 (${user.email}): ${error?.message}`)
  }

  console.log(`  신규 사용자 생성: ${user.email} (${data.user.id})`)
  return data.user.id
}

async function ensureProfile(userId: string, user: TestUser) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name: user.name, email: user.email }, { onConflict: 'id' })
  if (error) {
    console.warn(`  프로필 upsert 경고 (${user.email}): ${error.message}`)
  }
}

async function addEventMember(userId: string, user: TestUser): Promise<boolean> {
  // 이미 멤버인지 확인
  const { data: existing } = await supabase
    .from('event_members')
    .select('id')
    .eq('event_id', EVENT_ID)
    .eq('user_id', userId)
    .single()

  if (existing) {
    console.log(`  이미 멤버: ${user.email} — 건너뜀`)
    return false
  }

  const { error } = await supabase.from('event_members').insert({
    event_id: EVENT_ID,
    user_id: userId,
    role: user.role,
    rsvp: user.rsvp,
  })

  if (error) {
    throw new Error(`event_members insert 실패 (${user.email}): ${error.message}`)
  }

  return true
}

async function seedExpenses(memberIds: { userId: string; name: string }[]) {
  const attending = memberIds.slice(0, 5) // 처음 5명을 정산 테스트 대상으로
  if (attending.length < 2) return

  const payerId = attending[0].userId
  const amount = 50000

  // 비용 생성
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({ event_id: EVENT_ID, paid_by: payerId, title: '테스트 식비', amount })
    .select('id')
    .single()

  if (expenseError || !expense) {
    console.warn(`  비용 생성 실패: ${expenseError?.message}`)
    return
  }

  // n분할 정산
  const splitAmount = Math.floor(amount / attending.length)
  const splits = attending.map(({ userId }) => ({
    expense_id: expense.id,
    user_id: userId,
    amount: splitAmount,
    is_settled: false,
  }))

  const { error: splitError } = await supabase.from('expense_splits').insert(splits)
  if (splitError) {
    console.warn(`  expense_splits insert 경고: ${splitError.message}`)
  } else {
    console.log(`  정산 테스트 데이터 생성 완료 (${attending.length}명, ${splitAmount}원/인)`)
  }
}

async function main() {
  console.log(`\n이벤트 ID: ${EVENT_ID}`)
  console.log('테스트 참여자 시드 시작...\n')

  // 이벤트 존재 확인
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', EVENT_ID)
    .single()

  if (eventError || !event) {
    console.error(`이벤트를 찾을 수 없습니다: ${EVENT_ID}`)
    process.exit(1)
  }

  console.log(`대상 이벤트: "${event.title}"\n`)

  const createdMembers: { userId: string; name: string }[] = []

  for (const user of TEST_USERS) {
    console.log(`처리 중: ${user.name} (${user.email})`)
    try {
      const userId = await getOrCreateUser(user)
      await ensureProfile(userId, user)
      const added = await addEventMember(userId, user)
      if (added) {
        console.log(`  역할: ${user.role}, RSVP: ${user.rsvp}`)
        createdMembers.push({ userId, name: user.name })
      }
    } catch (err) {
      console.error(`  오류: ${(err as Error).message}`)
    }
  }

  // 정산 테스트 데이터
  console.log('\n정산 테스트 데이터 생성 중...')
  const allMembers = await (async () => {
    const result: { userId: string; name: string }[] = []
    for (const user of TEST_USERS) {
      const { data: listData } = await supabase.auth.admin.listUsers()
      const u = listData?.users.find((x) => x.email === user.email)
      if (u) result.push({ userId: u.id, name: user.name })
    }
    return result
  })()

  await seedExpenses(allMembers)

  console.log(`\n완료! 총 ${createdMembers.length}명 추가됨.`)
  console.log(`테스트 비밀번호: ${TEST_PASSWORD}`)
}

main().catch((err) => {
  console.error('시드 실패:', err)
  process.exit(1)
})
