# 프로젝트 구조 가이드 (Next.js 16.1.6)

이 문서는 현재 프로젝트(`nextjs-supabase-app`)의 실제 폴더 구조, 파일 조직 및 네이밍 컨벤션을 정의합니다.

## 🏗️ 전체 프로젝트 구조

```
nextjs-supabase-app/
├── docs/                   # 📚 프로젝트 문서
│   └── guides/            # 개발 가이드 모음
├── public/                # 🌍 정적 파일 (이미지, 아이콘)
├── app/                   # 🚀 Next.js App Router (src/ 없음)
├── components/            # 🧩 React 컴포넌트
├── lib/                   # 🛠️ 유틸리티 및 설정
├── components.json        # shadcn/ui 설정
├── next.config.ts         # Next.js 설정
├── tailwind.config.ts     # Tailwind CSS 설정
├── package.json           # 의존성 및 스크립트
└── tsconfig.json          # TypeScript 설정
```

> ⚠️ 이 프로젝트는 `src/` 디렉토리를 사용하지 않습니다.
> 모든 소스 파일은 프로젝트 루트 바로 아래에 위치합니다.

## 📁 세부 폴더 구조

### app/ - App Router 페이지 (실제 구조)

```
app/
├── layout.tsx              # 루트 레이아웃 (전역 설정)
├── page.tsx               # 홈페이지 (/)
├── globals.css            # 전역 CSS 스타일 (CSS 변수 정의)
├── favicon.ico
├── auth/                  # 인증 관련 라우트 그룹
│   ├── confirm/
│   │   └── route.ts       # 이메일 확인 Route Handler
│   ├── error/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── sign-up/
│   │   └── page.tsx
│   ├── sign-up-success/
│   │   └── page.tsx
│   └── update-password/
│       └── page.tsx
├── instruments/            # 악기 관련 페이지
│   └── page.tsx
└── protected/              # 인증 필요 영역
    ├── layout.tsx          # 보호된 영역 레이아웃
    └── page.tsx
```

**App Router 파일 컨벤션:**

- `page.tsx`: 해당 경로의 메인 페이지
- `layout.tsx`: 레이아웃 컴포넌트 (자식 페이지 감쌈)
- `route.ts`: Route Handler (API 엔드포인트)
- `loading.tsx`: 로딩 UI (필요시 추가)
- `error.tsx`: 에러 UI (필요시 추가)
- `not-found.tsx`: 404 페이지 (필요시 추가)

### components/ - 컴포넌트 조직

```
components/
├── ui/                    # shadcn/ui 기반 기본 UI 컴포넌트
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── checkbox.tsx
│   ├── dropdown-menu.tsx
│   └── ...               # npx shadcn@latest add 로 추가
├── layout/                # 레이아웃 컴포넌트
│   ├── header.tsx
│   └── footer.tsx
├── providers/             # Context 프로바이더
│   └── theme-provider.tsx
└── [feature-name].tsx     # 기능별 컴포넌트
```

**컴포넌트 분류 규칙:**

1. **ui/**: shadcn/ui 기반 재사용 가능한 기본 컴포넌트 (`npx shadcn@latest add`로 추가)
2. **layout/**: 전체 페이지 구조, 공통 헤더/푸터
3. **providers/**: React Context 프로바이더 (테마, 인증 상태 등)
4. **루트 컴포넌트**: 특정 기능/페이지에서 사용하는 비즈니스 컴포넌트

### lib/ - 유틸리티 및 설정

```
lib/
├── utils.ts               # cn() 등 공통 유틸리티 함수
└── supabase/              # Supabase 클라이언트 설정
    ├── client.ts          # 브라우저용 클라이언트
    ├── server.ts          # 서버용 클라이언트 (@supabase/ssr)
    └── middleware.ts      # 미들웨어용 클라이언트
```

**lib/ 확장 가이드:**

```
lib/
├── utils.ts               # 공통 유틸리티
├── types/                 # TypeScript 타입 정의
│   ├── auth.ts
│   └── api.ts
├── schemas/               # Zod 스키마 (도입 시)
│   └── auth.ts
└── actions/               # Server Actions (또는 app/actions/ 사용)
    └── auth.ts
```

## 🔗 경로 별칭 (Path Aliases)

`tsconfig.json` 기준: `@/*` → `./` (프로젝트 루트)

```typescript
// ✅ @/ 별칭 사용 (항상 이 방식)
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'

// ❌ 상대 경로 사용 금지
import { Button } from '../../../components/ui/button'
```

**실제 매핑 (tsconfig.json 기준):**

| 별칭              | 실제 경로         |
| ----------------- | ----------------- |
| `@/components`    | `./components`    |
| `@/components/ui` | `./components/ui` |
| `@/lib`           | `./lib`           |
| `@/lib/utils`     | `./lib/utils.ts`  |
| `@/hooks`         | `./hooks`         |
| `@/app`           | `./app`           |

> `components.json`의 aliases와 tsconfig의 `@/*: ["./*"]`가 일치하므로, `@/` 접두사만 사용하면 됩니다.

## 🏷️ 파일 네이밍 컨벤션

```bash
# ✅ 올바른 파일명
user-profile.tsx        # kebab-case (권장)
login-form.tsx          # kebab-case

# ✅ 컴포넌트 함수명 (PascalCase)
export function UserProfile() {}
export function LoginForm() {}

# ❌ 잘못된 파일명
user_profile.tsx        # snake_case (금지)
userprofile.tsx         # 소문자 연속 (금지)

# ❌ 잘못된 폴더명
Components/             # PascalCase (금지)
user_settings/          # snake_case (금지)
```

## 📝 새 파일/폴더 추가 규칙

### 1. 새 shadcn/ui 컴포넌트 추가

```bash
npx shadcn@latest add [component-name]
# 예: npx shadcn@latest add dialog
# 예: npx shadcn@latest add select
```

### 2. 새 페이지 추가

```bash
# 정적 페이지
app/about/page.tsx

# 동적 페이지
app/users/[id]/page.tsx

# 인증 필요 페이지 → protected/ 하위에 추가
app/protected/settings/page.tsx

# Route Handler
app/api/users/route.ts
```

### 3. 새 비즈니스 컴포넌트 추가

```
배치 기준:
- 특정 페이지에서만 사용 → 해당 페이지 폴더 내 또는 components/
- 여러 페이지에서 재사용 → components/ 적절한 위치
- 레이아웃 관련 → components/layout/
```

### 4. 새 유틸리티/설정 추가

```
- 공통 유틸: lib/utils.ts에 추가
- Supabase 관련: lib/supabase/
- 타입 정의: lib/types/
- 서버 액션: app/actions/ 또는 해당 기능 폴더
```

## 🎯 의존성 import 순서

```typescript
// 1. 외부 라이브러리
import { Suspense } from 'react'
import Link from 'next/link'

// 2. 내부 모듈 (@/ 경로)
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'

// 3. 타입 import (type 키워드 사용)
import type { User } from '@/lib/types/auth'
```

## 🚫 금지사항

```bash
# src/ 폴더 생성 금지 (이 프로젝트는 src/ 없음)
src/app/         # ❌ 금지
src/components/  # ❌ 금지

# 깊은 중첩 구조 (4단계 이상)
components/pages/auth/forms/login/LoginForm.tsx  # ❌

# 의미 없는 폴더명
components/misc/    # ❌
components/shared/  # ❌

# 상대 경로 import
../../components/ui/button  # ❌
```

## ✅ 체크리스트

새 파일/폴더 추가 시:

- [ ] `app/`에 페이지 추가 (App Router)
- [ ] `src/` 없이 루트 경로에 배치
- [ ] `@/` 별칭으로 import
- [ ] kebab-case 파일명
- [ ] PascalCase 컴포넌트 함수명
- [ ] 단일 책임 원칙 준수
- [ ] 파일 크기 300줄 이하 유지
