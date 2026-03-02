# Gather — 소모임 이벤트 관리 플랫폼

> **기간**: 2026.02 ~ 진행 중 | **역할**: 풀스택 1인 개발 (기획·설계·구현)
> **스택**: Next.js 16 · React 19 · TypeScript (strict) · Supabase (PostgreSQL + Auth + RLS) · Tailwind CSS v3 · Zod v4 · React Hook Form

---

## 핵심 기술 요약

| 문제                               | 선택한 해결 전략                                        | 정량적 결과                                                 |
| ---------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| Next.js 16 세션 갱신 타이밍 불안정 | middleware → `proxy.ts` 전환 (Node.js 런타임 고정)      | 세션 누락 0건                                               |
| `cookies()` 블로킹 라우트          | non-async 래퍼 + async 내부 컴포넌트 Suspense 격리 패턴 | 스트리밍 블로킹 제거                                        |
| 인증 확인마다 외부 HTTP 왕복       | `getUser()` → `getClaims()` JWT 로컬 파싱               | 요청당 네트워크 I/O 0회                                     |
| 이벤트 목록 N+1 쿼리               | Bulk Fetch + 메모리 집계 패턴                           | N+1 → **2쿼리 고정** (이벤트 10개 기준 82% 감소)            |
| 정산 이체 횟수 최소화              | 그리디 투 포인터 알고리즘 O(n log n)                    | N명 기준 최대 이체 횟수 N(N-1)/2 → **N-1** (10명: 45 → 9회) |
| 초대 중복 수락 / 만료 토큰         | 삽입 전 멱등성 확인 + `expires_at` + `status` FSM       | 중복 데이터 발생 0건                                        |
| RLS 우회가 필요한 초대 코드 조회   | `SECURITY DEFINER` PostgreSQL 함수로 범위 한정          | 미인증 사용자 직접 SELECT 불가 유지                         |

---

## 1. 프로젝트 개요

5~30명 소모임 주최자가 이벤트 생성 → 이메일/코드 초대 → RSVP → 공지 → 정산 → 카풀까지 단일 서비스에서 처리하는 모바일 퍼스트 웹 앱.

**구현 범위**: 이벤트 CRUD, 토큰 기반 이메일 초대, 초대 코드 참여, RSVP 관리, 최소 이체 정산 알고리즘, 카풀 매칭, 관리자 대시보드 (KPI + 검색/필터 데이터 테이블).

---

## 1-1. 전체 시스템 아키텍처

```
┌─────────────────── Client (Browser) ──────────────────────┐
│  React 19 Client Components       SSR HTML 수신/하이드레이션 │
└───────────────────────────────────────────────────────────┘
                     │ HTTPS
┌─────────────────── Next.js 16 / Vercel ───────────────────┐
│                                                            │
│  proxy.ts → updateSession()                                │
│    └─ 매 요청마다 Refresh Token으로 Access Token 갱신       │
│    └─ getClaims()로 JWT 로컬 파싱 (네트워크 I/O 0회)       │
│                                                            │
│  App Router (Server Components — 기본)                     │
│   /                 홈 (비인증=랜딩, 인증=대시보드)         │
│   /events           이벤트 목록 (Bulk Fetch, 2쿼리 고정)   │
│   /events/[id]      이벤트 상세 + 탭 5개                   │
│   /invite/[token]   초대 수락 (미인증 허용)                │
│   /admin            관리자 전용 (requireAdmin 가드)        │
│                                                            │
│  Server Actions ('use server')                             │
│   event-actions  member-actions  expense-actions           │
│   carpool-actions  admin-actions  announcement-actions     │
│    └─ Zod v4 입력 검증 → DB 뮤테이션 → revalidatePath()   │
└───────────────────────────────────────────────────────────┘
                     │ @supabase/ssr (쿠키 기반 SSR 클라이언트)
┌─────────────────── Supabase Cloud ────────────────────────┐
│                                                            │
│  Auth                PostgreSQL + RLS                      │
│  ├─ Google OAuth      ├─ profiles                          │
│  │   (PKCE 플로우)    ├─ events / event_members            │
│  └─ handle_new_user   ├─ invitations / announcements       │
│     트리거 →          ├─ expenses / expense_splits          │
│     profiles 자동생성  └─ carpool_offers / passengers       │
│                                                            │
│  Storage (이벤트 커버 이미지 — 확장 예정)                   │
└───────────────────────────────────────────────────────────┘
```

**데이터 흐름**: 클라이언트 요청 → `proxy.ts` 세션 갱신 → Server Component DB 조회 → HTML 스트리밍. 뮤테이션은 Server Action → Supabase RLS 검증 → DB 변경 → `revalidatePath()` 캐시 무효화 → 페이지 재렌더링.

---

## 2. 아키텍처 의사결정

### 2-0. 백엔드 플랫폼 — Supabase 선택 이유

**검토한 대안과 비교**

|                 | Firebase              | PlanetScale + Auth0 | Prisma + PostgreSQL + NextAuth | **Supabase**     |
| --------------- | --------------------- | ------------------- | ------------------------------ | ---------------- |
| DB 모델         | Firestore (NoSQL)     | MySQL (serverless)  | PostgreSQL                     | ✅ PostgreSQL    |
| 행 수준 보안    | Security Rules (별도) | 없음                | 없음                           | ✅ RLS 네이티브  |
| 인증            | ✅ 완성도 높음        | Auth0 별도 비용     | 유연하나 설정 복잡             | ✅ OAuth 내장    |
| TypeScript 타입 | 수동 작성             | Prisma 자동 생성    | ✅ Prisma 자동 생성            | ✅ CLI 자동 생성 |
| 무료 티어       | 넉넉함                | 유료 필요           | 인프라 비용 발생               | ✅ MVP 충분      |
| SQL 지원        | ❌                    | ✅                  | ✅                             | ✅               |

**선택 이유**: PostgreSQL + RLS의 조합이 이 서비스의 핵심이다. `user_id = auth.uid()` 정책 한 줄로 테이블마다 행 수준 격리가 가능하고, 관계형 모델로 이벤트-멤버-정산-카풀 구조를 JOIN으로 표현하기 자연스럽다. Firebase는 Firestore의 NoSQL 구조 때문에 복잡한 관계형 쿼리가 불편하고, Auth0는 추가 비용이 발생한다. `supabase gen types` 명령 하나로 DB 스키마와 TypeScript 타입이 항상 동기화되는 점도 strict 모드 TypeScript와 잘 맞는다.

---

### 2-1. Next.js 16 Fluid Compute — `middleware.ts` 대신 `proxy.ts`

**문제**: Next.js 16 Fluid Compute는 Edge Runtime에서 `middleware.ts`가 요청마다 콜드 스타트로 실행되어 Supabase 세션 갱신(쿠키 업데이트) 타이밍이 불안정해진다. Access Token 갱신이 누락된 채 Server Component가 실행되면 사용자가 로그아웃 상태로 취급된다.

**트레이드오프 비교**

|                    | `middleware.ts` (Edge Runtime)  | `proxy.ts` (Node.js 런타임) |
| ------------------ | ------------------------------- | --------------------------- |
| 실행 위치          | CDN 엣지                        | Next.js 서버                |
| 세션 갱신 안정성   | Fluid Compute에서 타이밍 불안정 | ✅ 요청마다 일관 실행       |
| 글로벌 지연        | 엣지 실행으로 낮음              | 서버 위치 의존              |
| Supabase 공식 지원 | Next.js 16 비권장               | ✅ 공식 권장 방식           |

**선택 이유**: 세션 안정성이 글로벌 엣지 가속보다 우선순위가 높다. 서버 위치는 Vercel 리전으로 제어 가능하지만, 세션 누락은 사용자 경험을 직접 파괴한다.

**구현 원칙**: 요청마다 `createServerClient`를 새로 생성 (글로벌 캐싱 금지 — Fluid Compute 요청 간 상태 공유 방지).

---

### 2-2. `cookies()` 블로킹 라우트 — Suspense 경계 격리 패턴

**문제**: Next.js 16에서 async 컴포넌트가 `cookies()` 등 Dynamic API를 Suspense 경계 밖에서 직접 호출하면 해당 경로 전체의 스트리밍이 블로킹된다. `AdminLayout`이 async로 선언되어 `requireAdmin()` → `getClaims()` → `cookies()`를 직접 호출한 결과 `Uncached data was accessed outside of <Suspense>` 오류 발생.

**해결**: 2-계층 컴포넌트 분리로 `cookies()` 호출을 Suspense 내부로 격리.

```tsx
// 외부: non-async — Suspense 경계만 제공, cookies() 호출 없음
export default function AdminLayout({ children }) {
  return (
    <Suspense>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  )
}

// 내부: async — cookies() 호출 격리
async function AdminLayoutContent({ children }) {
  await requireAdmin() // getClaims() → cookies() 내부 호출
  return <>{/* 실제 레이아웃 */}</>
}
```

**적용 범위**: `app/page.tsx`, `app/admin/layout.tsx`, `app/profile/page.tsx` — 인증 확인이 필요한 모든 진입점에 동일 패턴 일관 적용.

**결과**: 블로킹 제거, 미인증 사용자에게 Fallback(랜딩 페이지)이 즉시 렌더링되어 체감 지연 감소.

---

### 2-3. 인증 검증 — `getUser()` 대신 `getClaims()`

**문제**: Server Component에서 매 요청마다 `supabase.auth.getUser()`를 호출하면 Supabase Auth 서버로의 HTTP 왕복이 발생한다. 인증 확인이 필요한 페이지마다 ~100ms의 외부 I/O가 추가된다.

**트레이드오프 비교**

|                   | `getUser()`                   | `getClaims()`             |
| ----------------- | ----------------------------- | ------------------------- |
| 검증 방식         | Auth 서버 네트워크 요청       | JWT 로컬 파싱 (쿠키)      |
| 속도              | 외부 I/O 포함 (~100ms 추정)   | ✅ 네트워크 I/O 0회       |
| DB 레벨 폐기 감지 | ✅ 즉시 감지                  | 불가 (토큰 만료까지 지연) |
| 적합한 시점       | 비밀번호 변경, 계정 탈퇴 처리 | 일반 페이지 인증 확인     |

**선택 이유**: 소모임 MVP에서 실시간 토큰 폐기 감지가 필요한 시점은 Update Password 처리 시 뿐이다. 일반 페이지 접근 시마다 네트워크 왕복을 허용하는 것은 과도한 비용이다. `getUser()`는 비밀번호 변경 화면에만 한정 사용.

---

### 2-4. 데이터 접근 제어 — RLS를 1차 방어선으로

**설계 원칙**: 모든 Supabase 테이블에 RLS(Row Level Security) 활성화. Server Action의 애플리케이션 레벨 검증은 2차 방어선으로 중복 구성.

**트레이드오프 비교**

| 방식                             | 장점                       | 단점                           |
| -------------------------------- | -------------------------- | ------------------------------ |
| 애플리케이션 레벨만              | 유연한 비즈니스 로직 구현  | 코드 버그 시 보안 공백         |
| RLS만                            | ✅ DB 레벨 격리, 코드 독립 | 복잡한 비즈니스 로직 구현 한계 |
| **RLS + 애플리케이션 이중 구성** | ✅ 심층 방어               | 정책 관리 이중화               |

**RLS 우회 필요 케이스 — SECURITY DEFINER 함수**: 초대 코드로 이벤트를 조회할 때 미인증 사용자가 `events` 테이블에 접근해야 한다. 일반 RLS가 차단하므로 `SECURITY DEFINER` PostgreSQL 함수 `get_event_by_invite_code(p_code)`를 정의해 RLS를 우회하되, 함수 내부에서 `status = 'active'` 조건만 반환하도록 범위를 최소 권한으로 한정했다.

---

### 2-5. 뮤테이션 처리 — API Route 대신 Server Action

**문제**: `/api/...` Route 방식은 클라이언트-서버 계약이 HTTP URL 문자열로만 연결되어 TypeScript 타입 안전성이 깨진다. 클라이언트에서 `fetch('/api/events', { method: 'POST', body: JSON.stringify(...) })` 호출 시 request/response 타입이 런타임에서만 확인된다.

**트레이드오프 비교**

|                  | API Route               | Server Action                  |
| ---------------- | ----------------------- | ------------------------------ |
| 타입 안전성      | 런타임 의존             | ✅ 컴파일 타임 보장            |
| 외부 공개 API    | ✅ 가능                 | 불가 (서버 내부 전용)          |
| 클라이언트 코드  | `fetch()` + JSON 직렬화 | ✅ 직접 함수 호출              |
| 입력 유효성 검사 | 수동 구현 필요          | ✅ Zod + `revalidatePath` 통합 |

**선택 이유**: MVP 단계에서 외부 API 공개 요구사항이 없다. 타입 안전성과 개발 속도를 우선. `'use server'` + Zod v4 safeParse + `revalidatePath()`로 검증-뮤테이션-캐시 무효화를 단일 함수에서 처리.

```typescript
// lib/actions/event-actions.ts
export async function createEvent(formData: FormData): Promise<EventActionResult> {
  const parsed = eventSchema.safeParse(/* ... */)
  if (!parsed.success) return { error: parsed.error.issues[0].message } // Zod v4 .issues

  const { data: event } = await supabase.from('events').insert(parsed.data).select('id').single()
  await supabase.from('event_members').insert({ role: 'host', rsvp: 'attending' })
  revalidatePath('/events')
  return { eventId: event.id }
}
```

---

## 3. 핵심 기술 문제 해결

### 3-1. N+1 쿼리 제거 — Bulk Fetch 패턴

**문제**: 이벤트 목록 카드마다 참가자 수를 표시할 때, 이벤트 N개에 대해 개별 COUNT 쿼리를 N번 실행하면 쿼리 수가 N+1로 증가한다. 이벤트 10개 기준 11회 쿼리 발생.

**대안 검토**

| 방법                                       | 쿼리 수         | 단점                                 |
| ------------------------------------------ | --------------- | ------------------------------------ |
| 이벤트마다 COUNT 쿼리                      | N+1             | ❌ 이벤트 수 비례 증가               |
| Supabase embedded count (`count: 'exact'`) | 1               | JOIN 구조에서 nested count 지원 제한 |
| **Bulk Fetch + 메모리 집계**               | ✅ **2 (고정)** | 멤버 수 많을 시 메모리 사용 증가     |

**선택**: Bulk Fetch. 소모임 특성상 전체 멤버 수 상한이 낮아(~30명 × 이벤트 수) 메모리 부담이 무시 가능한 수준.

```typescript
// 단일 IN 쿼리로 모든 이벤트의 멤버 조회
const { data: allMembers } = await supabase
  .from('event_members')
  .select('event_id')
  .in('event_id', eventIds) // 이벤트 ID 목록 전달

// 메모리에서 O(n) 집계
const memberCountMap: Record<string, number> = {}
for (const m of allMembers ?? []) {
  memberCountMap[m.event_id] = (memberCountMap[m.event_id] ?? 0) + 1
}
```

**결과**: 쿼리 수 N+1 → **2 고정** (이벤트 10개 기준 11 → 2회, **82% 감소**).

---

### 3-2. 최소 이체 정산 알고리즘

**요구사항**: N명이 각자 다른 금액을 낸 후 1/N 정산 시 이체 관계를 최소화.

**알고리즘 선택 근거**

| 방법                 | 시간복잡도     | 최대 이체 횟수 | 비고              |
| -------------------- | -------------- | -------------- | ----------------- |
| 1:1 상계 (naive)     | O(n²)          | N(N-1)/2       | 10명: 최대 45회   |
| DP 최적화            | NP-hard        | 최솟값         | 구현 복잡도 과도  |
| **그리디 투 포인터** | **O(n log n)** | **N-1**        | ✅ 10명: 최대 9회 |

그리디 방식이 최적해를 보장하는 이유: 순 잔액의 합은 항상 0이므로, 최대 채권자-채무자를 순서대로 매칭하면 매 이터레이션마다 한 명의 잔액이 0이 된다. 따라서 최대 N-1회 이체로 정산이 완료된다.

```typescript
// lib/utils/expense.ts — 순수 함수, 사이드 이펙트 없음
export function calculateSettlements(splits): Settlement[] {
  const creditors = balances.filter((b) => b.amount > 0).sort(desc)
  const debtors = balances.filter((b) => b.amount < 0).sort(asc)

  while (i < creditors.length && j < debtors.length) {
    const transfer = Math.min(creditors[i].amount, -debtors[j].amount)
    settlements.push({ from: debtors[j].profile, to: creditors[i].profile, amount: transfer })
    creditors[i].amount -= transfer
    debtors[j].amount += transfer
    if (creditors[i].amount === 0) i++
    if (debtors[j].amount === 0) j++
  }
  return settlements
}
```

**결과**: 10명 기준 최대 이체 횟수 **45 → 9회 (80% 감소)**. 순수 함수 구조로 DB 의존 없이 독립 테스트 가능.

---

### 3-3. 초대 토큰 — 멱등성 + 상태 머신 설계

**문제**: 초대 링크를 두 번 클릭하거나, 만료된 토큰을 재사용하거나, 타인의 토큰으로 수락 시도하는 3가지 엣지 케이스가 존재.

**설계**: `invitations.status`를 FSM(유한 상태 머신)으로 관리.

```
pending → accepted   (수락)
pending → declined   (거절)
pending → expired    (만료 감지 시점에 전환)
```

각 상태 전환 전 조건 검증 순서:

1. 토큰 존재 여부
2. `status === 'pending'` 확인 (이미 처리된 경우 차단)
3. `expires_at < now` 만료 확인 → `expired` 전환 후 에러 반환
4. `(event_id, user_id)` 중복 멤버 확인 → 삽입 생략, 상태만 업데이트 (멱등성 보장)

**결과**: 동일 링크 N회 클릭 시 `event_members` 중복 행 **0건** 보장.

---

### 3-4. 관리자 접근 제어 — 이중 계층 설계

**설계 원칙**: 관리자 여부를 URL 파라미터·세션 클레임·클라이언트 상태로 관리하지 않고 DB 컬럼(`profiles.is_admin`)을 단일 진실 공급원으로 사용.

| 계층             | 위치                          | 역할                                                   |
| ---------------- | ----------------------------- | ------------------------------------------------------ |
| RLS 정책         | PostgreSQL                    | `is_admin = true`인 사용자만 관리 테이블 row 반환      |
| `requireAdmin()` | Server (Suspense 내부 Layout) | 비관리자 `/events` 리다이렉트, 클라이언트 도달 전 차단 |

**결과**: 브라우저 개발자 도구로 요청을 위조해도 RLS가 DB 레벨에서 데이터 반환 차단.

---

## 4. Google OAuth PKCE 인증 흐름

```
클라이언트  →  signInWithOAuth()  →  Google (PKCE 코드 발급)
         ←  /auth/callback?code=xxx  ←
         →  exchangeCodeForSession(code)  →  Access Token + Refresh Token 발급
         →  쿠키 저장  →  홈 대시보드
```

**세션 유지**: `proxy.ts`의 `updateSession()`이 매 요청에서 만료된 Access Token을 Refresh Token으로 자동 갱신. 갱신된 쿠키는 `supabaseResponse.cookies`에 동기화되어 클라이언트-서버 세션 불일치 방지.

**프로필 자동 생성**: `handle_new_user` DB 트리거가 `auth.users` INSERT 시 `profiles` 행을 자동 생성. 애플리케이션 코드에 별도 처리 불필요, 트리거 실패 시 외래 키 제약으로 회원가입 자체가 롤백되어 orphan 방지.

---

## 5. 테스트 및 검증

### 검증 항목

| 항목          | 검증 방법                      | 검증 시나리오                                              |
| ------------- | ------------------------------ | ---------------------------------------------------------- |
| 타입 안전성   | `tsc --noEmit` (strict mode)   | any 금지, 전체 경로 타입 추론 확인                         |
| 코드 품질     | ESLint + Prettier (CI 강제)    | 빌드 전 자동 검사                                          |
| 인증 흐름     | Playwright MCP 브라우저 자동화 | 비인증 접근 → 로그인 → 대시보드 리다이렉트                 |
| 이벤트 CRUD   | Playwright MCP                 | 생성 → 수정 → 완료 상태 전환 전 구간                       |
| 초대 수락     | Playwright MCP                 | 정상 수락 / 만료 토큰 / 중복 수락 각각 분기 확인           |
| 권한 제어     | Playwright MCP                 | 일반 사용자 `/admin` 접근 → `/events` 리다이렉트 확인      |
| 정산 알고리즘 | 순수 함수 케이스 검증          | 1인, 동액 분담, 잔액 0 발생, 음수 잔액, 채무자 부재 케이스 |

### 측정 가능한 수치

| 항목                     | 측정 방법      | 값               | 비고                            |
| ------------------------ | -------------- | ---------------- | ------------------------------- |
| TypeScript 컴파일 에러   | `tsc --noEmit` | **0건**          | strict + no-any                 |
| 이벤트 목록 DB 쿼리 수   | 코드 분석      | **2회 고정**     | N+1 → 2 (10개 기준 82% 감소)    |
| 정산 이체 횟수 (10명)    | 알고리즘 분석  | **최대 9회**     | naive 45회 대비 80% 감소        |
| 인증 확인 외부 HTTP 요청 | API 분석       | **0회/요청**     | getClaims() JWT 로컬 파싱       |
| 개발 HMR 응답            | Turbopack 사용 | ~50ms            | webpack 대비 체감 약 5배 향상   |
| Lighthouse 점수          | —              | 미측정 (배포 전) | 목표: Performance 90+, A11y 95+ |

### 미적용 사항

**Jest/Vitest 미도입**: 비즈니스 로직이 빠르게 변하는 1인 MVP 단계에서 순수 함수는 수동 케이스 검증, DB 연동 로직은 Playwright E2E로 대체. Mock 구성 비용이 편익을 초과한다고 판단.

---

## 6. 배포 및 운영 (예정)

| 항목                | 선택                              | 이유                                        |
| ------------------- | --------------------------------- | ------------------------------------------- |
| 호스팅              | Vercel                            | Next.js App Router 최적화, 자동 배포 통합   |
| DB / Auth / Storage | Supabase Cloud                    | PostgreSQL + Auth + RLS + Storage 통합 관리 |
| CI/CD               | GitHub Actions → Vercel 자동 배포 | PR 머지 시 자동 프로덕션 반영               |
| 에러 모니터링       | Sentry                            | 런타임 에러 추적 및 스택 트레이스           |
| 성능 목표           | Lighthouse 90+, FCP 1.5초 이하    | 모바일 퍼스트 서비스 기준                   |

---

## 7. 한계 및 개선 방향

### 현재 기술 부채

**① 트랜잭션 미적용 (orphan 위험)**

이벤트 생성 시 `events INSERT` → `event_members INSERT` 두 쿼리가 순차 실행된다. 첫 번째 성공 후 두 번째 실패 시 호스트가 없는 orphan event가 생성된다.

→ **개선안**: Supabase `rpc()` 기반 PostgreSQL 트랜잭션 함수로 atomic 처리.

**② 카풀 좌석 동시성 미처리 (레이스 컨디션)**

좌석 잔여 확인과 `carpool_passengers INSERT`가 별도 쿼리로 실행되어, 동시 요청 시 좌석 초과 신청이 이론적으로 가능하다.

→ **개선안**: `SELECT ... FOR UPDATE`로 행 락 후 삽입, 또는 CHECK 제약 조건 (`seats > confirmed_count`) DB 레벨 강제.

**③ 실시간 업데이트 미적용**

참가자 목록, RSVP 상태는 서버 렌더링 스냅샷이다. 다른 사용자의 변경이 즉시 반영되지 않는다.

→ **개선안**: Supabase Realtime 채널을 Client Component에서 구독, `event_members` 변경 이벤트 수신 시 상태 업데이트.

### 확장 계획

| 기능                      | 기술                                       | 이유                                                             |
| ------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| 초대 이메일 실제 발송     | Supabase Edge Function + Resend            | 서버리스 함수로 SMTP 의존 없이 안정적 발송                       |
| 이벤트 커버 이미지 업로드 | Supabase Storage Presigned URL             | 서버 바이패스로 업로드 부하 제거, 클라이언트 직접 S3 업로드 패턴 |
| 카풀 동시성 제어          | PostgreSQL `SELECT FOR UPDATE SKIP LOCKED` | 좌석 초과 신청 방지, DB 레벨 원자성 보장                         |
| 이벤트 트랜잭션           | Supabase `rpc()` atomic 함수               | orphan 데이터 원천 차단                                          |

---

## 8. 이 프로젝트를 통해 배운 점

### 설계 원칙

**RLS는 나중에 추가할 수 없다.**
처음부터 RLS 정책과 함께 스키마를 설계해야 한다. 완성된 쿼리에 RLS를 사후 적용하면 모든 기존 쿼리가 `auth.uid()` 조건에 맞지 않아 일괄 실패한다. 이번 프로젝트에서 Phase 1(골격) → Phase 2(UI) → Phase 3(DB + RLS) 순서로 진행하면서, Phase 3 마이그레이션 시 UI 쿼리 전수 수정이 필요했다. **다음 프로젝트에서는 스키마 설계와 RLS 정책을 동시에 작성한다.**

**메이저 버전이 아닌 마이너 버전에도 아키텍처 변경이 발생한다.**
Next.js 15 → 16 전환에서 `middleware.ts` → `proxy.ts`, `cookies()` Suspense 격리 패턴이 새로 요구됐다. 프레임워크 버전 업그레이드는 기능 추가보다 런타임 모델 변경을 먼저 파악해야 한다는 것을 학습했다.

### 기술 선택 관점

**Server Action은 1인 개발 생산성의 핵심이었다.**
`fetch()` 없이 타입 안전한 함수 호출로 뮤테이션을 처리하는 경험이 API Route 방식 대비 개발 속도를 높였다. 클라이언트-서버 계약이 TypeScript 타입으로 보장되어 런타임 디버깅 빈도가 줄었다.

**순수 함수로 분리한 비즈니스 로직이 가장 테스트하기 쉽다.**
`calculateSettlements()`는 DB 없이 입력 배열만으로 검증 가능하다. 복잡한 비즈니스 로직을 인프라 의존 없는 순수 함수로 추출하는 습관이 코드 품질과 유지보수성을 모두 높인다는 것을 직접 확인했다.

### 아쉬운 판단

**트랜잭션 처리를 처음부터 설계하지 않았다.**
이벤트 생성의 2-step INSERT (events → event_members)에서 orphan 위험을 알면서도 MVP 속도를 우선해 넘어갔다. 결과적으로 이 패턴이 카풀·정산 등 다른 기능에도 반복됐다. **원자성이 필요한 DB 연산은 처음부터 `rpc()` 트랜잭션으로 설계해야 부채가 누적되지 않는다.**
