# 스타일링 가이드 (Tailwind CSS v3.4.1 + shadcn/ui)

이 문서는 Tailwind CSS v3.4.1 + shadcn/ui를 활용한 스타일링 규칙과 모범 사례를 제공합니다.

## 🎨 기술 스택 개요

### 핵심 스타일링 도구

- **Tailwind CSS v3.4.1**: 유틸리티 기반 CSS 프레임워크 (v4 아님)
- **shadcn/ui (new-york style)**: Radix UI 기반 컴포넌트 라이브러리
- **next-themes**: 다크모드 지원
- **tailwindcss-animate**: 애니메이션 플러그인 (`tailwind.config.ts`에 설정됨)
- **CSS Variables**: 동적 테마 시스템 (`app/globals.css`에 정의)
- **tailwind-merge + clsx**: `cn()` 유틸리티로 클래스 조합

> ⚠️ 이 프로젝트는 Tailwind CSS **v3**입니다. v4 문법(`@import "tailwindcss"`, `@theme` 등)은 사용하지 마세요.

## 🚀 Tailwind CSS v3 사용 규칙

### 기본 원칙

```tsx
// ✅ 올바른 Tailwind 클래스 사용
<div className="flex items-center justify-between rounded-lg bg-background p-4 shadow-md">
  <h2 className="text-lg font-semibold text-foreground">제목</h2>
  <Button variant="outline" size="sm">버튼</Button>
</div>

// ❌ 인라인 스타일 사용 금지
<div style={{ display: 'flex', padding: '16px' }}>
  <h2 style={{ fontSize: '18px' }}>제목</h2>
</div>
```

### 클래스 작성 순서

```tsx
<div className={cn(
  // 1. 레이아웃 (display, position)
  "flex absolute",

  // 2. 크기 (width, height, padding, margin)
  "w-full h-auto p-4 m-2",

  // 3. 타이포그래피 (font, text)
  "text-lg font-medium text-center",

  // 4. 배경 및 테두리
  "bg-background border border-border rounded-md",

  // 5. 효과 (shadow, opacity, transform)
  "shadow-lg opacity-90 hover:scale-105",

  // 6. 상호작용 (hover, focus, active)
  "hover:bg-accent focus:ring-2 active:scale-95",

  // 7. 조건부 클래스
  isActive && "bg-primary text-primary-foreground",
  className
)}>
```

### 반응형 디자인 (모바일 우선)

```tsx
// ✅ 모바일 우선 접근법
<div className={cn(
  // 기본 (모바일)
  "flex flex-col space-y-4 p-4",
  // 태블릿 (768px+)
  "md:flex-row md:space-y-0 md:space-x-6 md:p-6",
  // 데스크톱 (1024px+)
  "lg:max-w-6xl lg:mx-auto lg:p-8",
  // 대형 화면 (1280px+)
  "xl:max-w-7xl"
)}>

// ❌ 데스크톱 우선 지양
<div className="hidden lg:block md:hidden">
```

## 🎭 shadcn/ui 컴포넌트 활용

### 기본 사용법

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function UserCard({ user }: { user: User }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline">프로필 보기</Button>
      </CardContent>
    </Card>
  )
}
```

### 컴포넌트 변형 (Variants)

```tsx
// Button 변형
<Button variant="default">기본 버튼</Button>
<Button variant="destructive">삭제 버튼</Button>
<Button variant="outline">아웃라인 버튼</Button>
<Button variant="secondary">보조 버튼</Button>
<Button variant="ghost">고스트 버튼</Button>
<Button variant="link">링크 버튼</Button>

// 크기 변형
<Button size="default">기본 크기</Button>
<Button size="sm">작은 크기</Button>
<Button size="lg">큰 크기</Button>
<Button size="icon">아이콘만</Button>
```

### 컴포넌트 커스터마이징

```tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ✅ 기존 shadcn 컴포넌트 확장
interface CustomButtonProps extends React.ComponentProps<typeof Button> {}

export function CustomButton({ className, ...props }: CustomButtonProps) {
  return (
    <Button
      className={cn(
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg',
        className
      )}
      {...props}
    />
  )
}
```

### 새 shadcn/ui 컴포넌트 추가

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add form     # React Hook Form 연동 포함
```

## 🌓 다크모드 구현

### ThemeProvider 설정

```tsx
// components/providers/theme-provider.tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
```

### 테마 토글 컴포넌트

```tsx
'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">테마 전환</span>
    </Button>
  )
}
```

### 다크모드 대응 스타일링

```tsx
// ✅ 시맨틱 색상 변수 사용 (자동으로 다크모드 대응)
<div className="bg-background text-foreground">
  <h1 className="text-primary">제목</h1>
  <p className="text-muted-foreground">설명</p>
</div>

// ❌ 하드코딩된 색상 (다크모드 별도 처리 필요해 비효율적)
<div className="bg-white text-black dark:bg-black dark:text-white">
  <h1 className="text-blue-600 dark:text-blue-400">제목</h1>
</div>
```

## 🎨 색상 시스템

### CSS 변수 (app/globals.css 실제 값)

```css
/* app/globals.css - neutral base color 기준 */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 9%;
  /* ... 다크모드 값들 */
}
```

### 색상 사용 예시

```tsx
// ✅ 시맨틱 색상 클래스 사용
<div className="bg-background border-border">
  <h1 className="text-foreground">메인 텍스트</h1>
  <p className="text-muted-foreground">보조 텍스트</p>
  <Button className="bg-primary text-primary-foreground">버튼</Button>
</div>

// ❌ 직접 색상 지정
<div className="bg-white border-gray-200">
  <h1 className="text-gray-900">메인 텍스트</h1>
  <p className="text-gray-600">보조 텍스트</p>
</div>
```

## ✨ 애니메이션 가이드

이 프로젝트는 `tailwindcss-animate` 플러그인을 사용합니다 (`tailwind.config.ts`에 설정됨). 별도 import 불필요합니다.

### tailwindcss-animate 클래스 사용법

```tsx
// ✅ animate-in / animate-out 패턴
<div className="animate-in fade-in duration-300">페이드 인</div>
<div className="animate-in slide-in-from-bottom-4 duration-300">슬라이드 업</div>
<div className="animate-out fade-out duration-150">페이드 아웃</div>

// ✅ Tailwind 기본 애니메이션
<div className="animate-spin">스피너</div>
<div className="animate-bounce">바운스</div>
<div className="animate-pulse">펄스 (스켈레톤)</div>

// ✅ Tailwind transition 활용
<button className="transition-all duration-200 hover:scale-105 hover:shadow-lg">
  호버 효과
</button>

<div className="transform transition-transform duration-300 hover:scale-110">
  스케일 효과
</div>
```

> ⚠️ `tw-animate-css`는 이 프로젝트에 설치되지 않습니다. `import 'tw-animate-css'`를 코드에 작성하지 마세요.

### 성능 고려사항

```tsx
// ✅ will-change로 애니메이션 성능 최적화
<div className="will-change-transform transition-transform hover:scale-105">

// ✅ GPU 가속 대상에만 적용 (남용 금지)
<div className="hover:will-change-transform transition-transform hover:scale-105">
```

## 📱 반응형 디자인 패턴

### 컨테이너 패턴

```tsx
// ✅ 반응형 컨테이너
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  <div className="max-w-7xl mx-auto">
    {/* 컨텐츠 */}
  </div>
</div>

// ✅ 그리드 레이아웃
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map(item => (
    <Card key={item.id}>...</Card>
  ))}
</div>
```

### 반응형 네비게이션

```tsx
<nav className="flex items-center justify-between p-4">
  <div className="flex items-center space-x-4">
    <Logo />
    <div className="hidden md:flex md:space-x-6">
      <NavLink href="/about">소개</NavLink>
    </div>
  </div>
  <div className="md:hidden">
    <MobileMenu />
  </div>
</nav>
```

## 🛠️ 유틸리티 함수

### cn() 헬퍼 함수

```tsx
import { cn } from '@/lib/utils'

// ✅ cn()으로 클래스 조합
<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  variant === 'primary' && "bg-primary text-primary-foreground",
  className
)}>

// ❌ 수동 문자열 조합
<div className={`base-classes ${condition ? 'conditional-classes' : ''}`}>
```

### 조건부 스타일링

```tsx
<Button
  className={cn(
    "base-button-styles",
    isLoading && "opacity-50 cursor-not-allowed",
    isDestructive && "bg-destructive text-destructive-foreground",
  )}
  disabled={isLoading}
>
```

## 🚫 금지사항

```tsx
// ❌ 인라인 스타일
<div style={{ backgroundColor: 'red' }}>

// ❌ 하드코딩된 색상 (다크모드 미고려)
<div className="bg-gray-100 text-gray-900">

// ❌ tw-animate-css import (미설치)
import 'tw-animate-css'

// ❌ Tailwind v4 문법 사용 (이 프로젝트는 v3)
// @import "tailwindcss";      ← v4 문법, 사용 금지
// @theme { --color-* }       ← v4 문법, 사용 금지

// ❌ !important 남용
<div className="!text-red-500 !bg-blue-500">

// ❌ 접근성 미고려 (저대비)
<button className="bg-red-200 text-red-300">저대비 버튼</button>
```

## ✅ 스타일링 체크리스트

### 기본 사항

- [ ] Tailwind v3 유틸리티 클래스 사용 (v4 문법 금지)
- [ ] `cn()` 함수로 클래스 조합
- [ ] 시맨틱 색상 변수 사용 (`bg-background`, `text-foreground` 등)
- [ ] 반응형 디자인 (모바일 우선)

### 다크모드

- [ ] 하드코딩된 색상 없음
- [ ] CSS 변수 기반 색상 사용
- [ ] 테마 전환 시 깨짐 없음

### 애니메이션

- [ ] `tailwindcss-animate` 클래스 사용 (별도 import 없음)
- [ ] 불필요한 애니메이션 없음
- [ ] `will-change` 적절히 사용

### 접근성

- [ ] 충분한 색상 대비
- [ ] 포커스 상태 스타일링 (`focus-visible:ring-*`)
- [ ] 스크린 리더 고려 (`sr-only`)
