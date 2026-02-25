# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개발 명령어

```bash
npm run dev      # 개발 서버 실행 (localhost:3000)
npm run build    # 프로덕션 빌드 (타입 에러 포함 확인)
npm run lint     # ESLint 검사
npm run start    # 프로덕션 서버 실행
```

테스트 설정 없음. 타입 검증은 `npm run build`로 수행한다.

## 환경변수

`.env.local` 파일 필요:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

`lib/utils.ts`의 `hasEnvVars`로 환경변수 설정 여부를 확인하고, 미설정 시 UI에 경고를 표시한다.

## 아키텍처

### 기술 스택

- **Next.js 16.1.6** (App Router 전용, `src/` 없음)
- **React 19** + **TypeScript strict**
- **Supabase** (`@supabase/ssr`) — 쿠키 기반 SSR 인증
- **Tailwind CSS v3.4.1** + **shadcn/ui (new-york style)**
- **next-themes** — 다크모드

### 디렉토리 구조

```
app/               # App Router 페이지 (루트 직하)
components/        # React 컴포넌트
  ui/              # shadcn/ui 컴포넌트 (npx shadcn@latest add로 추가)
  tutorial/        # 온보딩 튜토리얼 컴포넌트 (스타터킷 전용)
lib/
  utils.ts         # cn() 유틸리티, hasEnvVars
  supabase/
    client.ts      # 브라우저용 createClient (createBrowserClient)
    server.ts      # 서버용 createClient (createServerClient + cookies())
    proxy.ts       # 세션 갱신 로직 (updateSession)
proxy.ts           # Next.js 16 Fluid compute 프록시 (middleware 역할)
```

### Supabase 인증 흐름

**세션 관리**: `proxy.ts` (루트) → `lib/supabase/proxy.ts`의 `updateSession()`
Next.js 16에서는 `middleware.ts` 대신 `proxy.ts`를 사용한다. `getClaims()`로 세션을 검증하고 미인증 사용자를 `/auth/login`으로 리다이렉트한다.

**보호된 경로**: `app/protected/` — `protected/layout.tsx`에 네비게이션/푸터 포함.
인증 확인은 `app/protected/page.tsx`의 Server Component에서 `supabase.auth.getClaims()`로 수행하고, 미인증 시 `redirect('/auth/login')`.

**인증 라우트 구조**:

```
app/auth/
  confirm/route.ts        # 이메일 OTP 검증 → 성공 시 리다이렉트, 실패 시 /auth/error
  login/page.tsx
  sign-up/page.tsx
  forgot-password/page.tsx
  update-password/page.tsx
  sign-up-success/page.tsx
  error/page.tsx
```

### Supabase 클라이언트 사용 규칙

```typescript
// Server Component / Server Action / Route Handler
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient() // 반드시 함수 스코프 내에서 매번 새로 생성

// Client Component ('use client')
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

> 전역 변수에 클라이언트를 저장하지 말 것 (Fluid compute 환경 호환성).

### Next.js 16 필수 패턴

```typescript
// params/searchParams는 반드시 await
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
}
```

### Path Alias

`tsconfig.json`: `@/*` → `./` (프로젝트 루트)

```typescript
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
```

## 코드 작성 규칙

- **App Router 전용** — Pages Router, `getServerSideProps` 금지
- **Server Component 기본**, `'use client'` 최소화
- **TypeScript `any` 금지** — strict 모드 유지
- **Tailwind v3** — v4 문법(`@import "tailwindcss"`, `@theme`) 사용 금지
- **애니메이션**: `tailwindcss-animate` 클래스 사용 (`tw-animate-css` 미설치)
- **shadcn/ui 컴포넌트 추가**: `npx shadcn@latest add [component]`
- **색상**: CSS 변수 기반 시맨틱 클래스 사용 (`bg-background`, `text-foreground` 등)

## 개발 가이드 문서

`docs/guides/` 에 상세 가이드가 있다:

- `nextjs-16.md` — Next.js 16 핵심 패턴 및 규칙
- `project-structure.md` — 폴더 구조 및 네이밍 컨벤션
- `component-patterns.md` — React 컴포넌트 설계 패턴
- `forms-react-hook-form.md` — 폼 처리 패턴 (react-hook-form + zod, 별도 설치 필요)
- `styling-guide.md` — Tailwind v3 + shadcn/ui 스타일링 규칙
