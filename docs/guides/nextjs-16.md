# Next.js 16.1.6 개발 지침

이 문서는 Claude Code에서 Next.js 16.1.6 프로젝트를 개발할 때 따라야 할 핵심 규칙과 가이드라인을 제공합니다.

## 🚀 필수 규칙 (엄격 준수)

### App Router 아키텍처

```typescript
// ✅ 올바른 방법: App Router 사용
app/
├── layout.tsx          // 루트 레이아웃
├── page.tsx           // 메인 페이지
├── loading.tsx        // 로딩 UI
├── error.tsx          // 에러 UI
├── not-found.tsx      // 404 페이지
└── dashboard/
    ├── layout.tsx     // 대시보드 레이아웃
    └── page.tsx       // 대시보드 페이지

// ❌ 금지: Pages Router 사용
pages/
├── index.tsx
└── dashboard.tsx
```

### Server Components 우선 설계

```typescript
// 🚀 필수: 기본적으로 모든 컴포넌트는 Server Components
export default async function UserDashboard() {
  const user = await getUser()

  return (
    <div>
      <h1>{user.name}님의 대시보드</h1>
      {/* 클라이언트 컴포넌트가 필요한 경우에만 분리 */}
      <InteractiveChart data={user.analytics} />
    </div>
  )
}

// ✅ 클라이언트 컴포넌트는 최소한으로 사용
'use client'

import { useState } from 'react'

export function InteractiveChart({ data }: { data: Analytics[] }) {
  const [selectedRange, setSelectedRange] = useState('week')
  return <Chart data={data} range={selectedRange} />
}
```

### async request APIs 처리 (Next.js 16 필수)

```typescript
// ✅ Next.js 16 방식: params/searchParams는 Promise 타입
import { cookies, headers } from 'next/headers'

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const query = await searchParams
  const cookieStore = await cookies()
  const headersList = await headers()

  const user = await getUser(id)

  return <UserProfile user={user} />
}

// ❌ 금지: 동기식 접근 (16.x에서 동작하지 않음)
export default function Page({ params }: { params: { id: string } }) {
  const user = getUser(params.id) // 에러 발생
  return <UserProfile user={user} />
}
```

## ✅ 권장 사항 (성능 최적화)

### Streaming과 Suspense 활용

```typescript
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <div>
      <h1>대시보드</h1>

      {/* 빠른 컨텐츠는 즉시 렌더링 */}
      <QuickStats />

      {/* 느린 컨텐츠는 Suspense로 감싸기 */}
      <Suspense fallback={<SkeletonChart />}>
        <SlowChart />
      </Suspense>

      <Suspense fallback={<SkeletonTable />}>
        <SlowDataTable />
      </Suspense>
    </div>
  )
}

async function SlowChart() {
  const data = await getComplexAnalytics()
  return <Chart data={data} />
}
```

### after() API 활용 (응답 후 비동기 처리)

```typescript
import { after } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const result = await processUserData(body)

  // 응답을 먼저 반환하고, 이후 작업은 비블로킹으로 처리
  after(async () => {
    await sendAnalytics(result)
    await updateCache(result.id)
  })

  return Response.json({ success: true, id: result.id })
}
```

### 캐싱 전략

```typescript
// ✅ 세밀한 캐시 제어 (Next.js 15+부터 fetch 기본값은 no-store)
export async function getProductData(id: string) {
  const data = await fetch(`/api/products/${id}`, {
    next: {
      revalidate: 3600, // 1시간 캐시
      tags: [`product-${id}`, 'products'],
    },
  })

  return data.json()
}

// 캐시 무효화
import { revalidateTag } from 'next/cache'

export async function updateProduct(id: string, data: ProductData) {
  await updateDatabase(id, data)
  revalidateTag(`product-${id}`)
  revalidateTag('products')
}
```

### next.config.ts (현재 프로젝트 설정)

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 컴포넌트 캐싱 활성화 (Next.js 16 신규 옵션)
  cacheComponents: true,
}

export default nextConfig
```

> `experimental.typedRoutes`, `experimental.turbo` 등은 현재 프로젝트에 설정되어 있지 않으므로 추가 시 팀과 협의 후 적용하세요.

## ⚠️ React 19 호환성

### useFormStatus / useActionState 활용

```typescript
// ✅ React 19: useFormStatus 훅
'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? '제출 중...' : '제출'}
    </button>
  )
}

// ✅ Server Actions와 form 통합
export async function createUser(formData: FormData) {
  'use server'

  const name = formData.get('name') as string
  const email = formData.get('email') as string

  await saveUser({ name, email })
  redirect('/users')
}

export default function UserForm() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <input name="email" type="email" required />
      <SubmitButton />
    </form>
  )
}
```

### 미들웨어 작성 방식

```typescript
// middleware.ts - Edge Runtime (기본값 유지)
import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return NextResponse.next()
}
```

> Edge Runtime에서는 Node.js `require()`를 사용할 수 없습니다. Node.js API가 필요하면 Route Handler를 대신 사용하세요.

### unauthorized / forbidden API

```typescript
// app/api/admin/route.ts
import { unauthorized, forbidden } from 'next/server'

export async function GET(request: Request) {
  const session = await getSession(request)

  if (!session) {
    return unauthorized()
  }

  if (!session.user.isAdmin) {
    return forbidden()
  }

  const data = await getAdminData()
  return Response.json(data)
}
```

## 🔄 Advanced: Route Groups / Parallel Routes

### Route Groups로 레이아웃 분리

```typescript
// ✅ Route Groups로 레이아웃 분리
app/
├── (marketing)/
│   ├── layout.tsx
│   └── page.tsx
├── (dashboard)/
│   ├── layout.tsx
│   └── analytics/
│       └── page.tsx
└── (auth)/
    ├── login/
    │   └── page.tsx
    └── register/
        └── page.tsx
```

### Parallel Routes 활용

```typescript
// ✅ Parallel Routes로 동시 렌더링
app/
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── @analytics/
│   │   └── page.tsx
│   └── @notifications/
│       └── page.tsx

// dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  notifications,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  notifications: React.ReactNode
}) {
  return (
    <div className="dashboard-grid">
      <main>{children}</main>
      <aside>
        <Suspense fallback={<AnalyticsSkeleton />}>{analytics}</Suspense>
      </aside>
      <div>
        <Suspense fallback={<NotificationsSkeleton />}>{notifications}</Suspense>
      </div>
    </div>
  )
}
```

## ❌ 금지 사항

```typescript
// ❌ Pages Router 패턴 절대 금지
pages/
├── _app.tsx
└── index.tsx

// ❌ getServerSideProps, getStaticProps 사용 금지
export async function getServerSideProps() { ... }

// ❌ 불필요한 'use client' 남용
'use client'
export default function SimpleComponent({ title }: { title: string }) {
  return <h1>{title}</h1> // 상태/이벤트 없으면 Server Component로 유지
}

// ❌ 클라이언트에서 서버 전용 함수 직접 호출
'use client'
import { getUser } from '@/lib/database' // 서버 전용 함수 → 에러 발생
```

## 코드 품질 체크리스트

```bash
# 현재 프로젝트에 정의된 스크립트만 사용

# 린트 검사
npm run lint

# 빌드 테스트 (타입 에러 포함 확인)
npm run build
```
