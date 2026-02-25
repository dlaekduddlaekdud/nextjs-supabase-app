# React Hook Form + Zod + Server Actions 가이드 (Next.js 16.1.6)

이 문서는 Next.js 16.1.6에서 React Hook Form + Zod + Server Actions를 활용한 폼 처리 패턴을 제공합니다.

## 🚀 패키지 설치 (현재 미설치 — 사용 전 필수)

> ⚠️ 현재 프로젝트에는 아래 패키지가 설치되어 있지 않습니다. 폼 기능 도입 전 설치하세요.

```bash
# 필수 패키지
npm install react-hook-form @hookform/resolvers zod

# 실시간 자동저장 등 고급 기능 (선택)
npm install use-debounce
```

## 🚀 기본 설정

### TypeScript 공통 타입 정의

```typescript
// lib/types/forms.ts
import { z } from 'zod'

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
}

export interface FormHookProps<T extends z.ZodSchema> {
  schema: T
  defaultValues?: Partial<z.infer<T>>
  onSubmit: (data: z.infer<T>) => Promise<ActionResult>
}
```

### 스키마 정의

```typescript
// lib/schemas/auth.ts
import { z } from 'zod'

export const emailSchema = z
  .string()
  .min(1, '이메일을 입력해주세요')
  .email('올바른 이메일 형식이 아닙니다')

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다'
  )

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

export const registerSchema = z
  .object({
    name: z.string().min(2, '이름은 최소 2자 이상').max(50, '이름은 최대 50자'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: '이용약관에 동의해주세요',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
```

## 🚀 Server Actions 패턴

> 이 프로젝트는 Supabase SSR을 사용합니다. 인증 관련 Server Actions는 반드시 `@supabase/ssr` 방식으로 구현하세요.

```typescript
// app/actions/auth.ts
'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, registerSchema } from '@/lib/schemas/auth'
import type { ActionResult } from '@/lib/types/forms'

export async function loginAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: '입력된 정보를 확인해주세요',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { email, password } = validatedFields.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return {
      success: false,
      message: '이메일 또는 비밀번호가 올바르지 않습니다',
    }
  }

  // 응답 후 비동기 후처리 (Next.js 16 after() API)
  after(async () => {
    await logUserActivity(email, 'login')
  })

  redirect('/protected')
}

export async function registerAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const validatedFields = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    terms: formData.get('terms') === 'on',
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: '입력된 정보를 확인해주세요',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { email, password, name } = validatedFields.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })

  if (error) {
    return {
      success: false,
      message: error.message,
      errors: { email: [error.message] },
    }
  }

  return {
    success: true,
    message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
  }
}
```

## 🚀 기본 폼 컴포넌트 패턴

```typescript
// components/login-form.tsx
'use client'

import React from 'react'
import { useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/schemas/auth'
import { loginAction } from '@/app/actions/auth'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { ActionResult } from '@/lib/types/forms'

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    loginAction,
    { success: false, message: '' }
  )

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  })

  const onSubmit = (data: LoginFormData) => {
    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('password', data.password)
    formAction(formData)
  }

  // 서버 에러를 폼 필드 에러로 연동
  React.useEffect(() => {
    if (state.errors) {
      Object.entries(state.errors).forEach(([field, messages]) => {
        form.setError(field as keyof LoginFormData, {
          type: 'server',
          message: messages[0],
        })
      })
    }
  }, [state.errors, form])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이메일</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="이메일을 입력하세요"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {state.message && (
          <p className={`text-sm ${state.success ? 'text-green-600' : 'text-destructive'}`}>
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로그인 중...
            </>
          ) : (
            '로그인'
          )}
        </Button>
      </form>
    </Form>
  )
}
```

## ✅ 고급 폼 패턴

### 다단계 폼 (Multi-step Form)

```typescript
// components/multi-step-form.tsx
'use client'

import { useState } from 'react'
import { useForm, FormProvider, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const step1Schema = z.object({
  firstName: z.string().min(1, '이름을 입력해주세요'),
  lastName: z.string().min(1, '성을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
})

const step2Schema = z.object({
  company: z.string().min(1, '회사명을 입력해주세요'),
  position: z.string().min(1, '직책을 입력해주세요'),
})

const completeSchema = step1Schema.merge(step2Schema)
type CompleteFormData = z.infer<typeof completeSchema>

const steps = [
  { schema: step1Schema, title: '기본 정보' },
  { schema: step2Schema, title: '경력 정보' },
]

export function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0)
  const [savedData, setSavedData] = useState<Partial<CompleteFormData>>({})

  const form = useForm<CompleteFormData>({
    resolver: zodResolver(steps[currentStep].schema),
    defaultValues: savedData,
    mode: 'onChange',
  })

  const nextStep = async () => {
    const isValid = await form.trigger()
    if (!isValid) return

    const currentData = form.getValues()
    setSavedData(prev => ({ ...prev, ...currentData }))

    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

  const onSubmit = async (data: CompleteFormData) => {
    const completeData = { ...savedData, ...data }
    const validation = completeSchema.safeParse(completeData)
    if (!validation.success) return

    const formData = new FormData()
    Object.entries(completeData).forEach(([key, value]) => {
      formData.append(key, String(value))
    })

    await submitProfileAction(formData)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 진행 표시기 */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-2',
              index <= currentStep ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2',
                index <= currentStep
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground'
              )}
            >
              {index + 1}
            </div>
            <span>{step.title}</span>
          </div>
        ))}
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {currentStep === 0 && <Step1Form />}
          {currentStep === 1 && <Step2Form />}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 0}>
              이전
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={nextStep}>다음</Button>
            ) : (
              <Button type="submit">제출</Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

function Step1Form() {
  const { control } = useFormContext<CompleteFormData>()

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>이름</FormLabel>
            <FormControl><Input placeholder="이름을 입력하세요" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>이메일</FormLabel>
            <FormControl><Input type="email" placeholder="이메일을 입력하세요" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function Step2Form() {
  const { control } = useFormContext<CompleteFormData>()

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="company"
        render={({ field }) => (
          <FormItem>
            <FormLabel>회사명</FormLabel>
            <FormControl><Input placeholder="회사명을 입력하세요" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
```

### 실시간 자동저장 폼

```typescript
// components/auto-save-form.tsx
'use client'

import { useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDebouncedCallback } from 'use-debounce' // use-debounce 설치 필요
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const draftSchema = z.object({
  title: z.string(),
  content: z.string(),
})

type DraftFormData = z.infer<typeof draftSchema>

export function AutoSaveForm({ draftId }: { draftId: string }) {
  const form = useForm<DraftFormData>({
    resolver: zodResolver(draftSchema),
    defaultValues: { title: '', content: '' },
  })

  const debouncedSave = useDebouncedCallback(
    useCallback(async (data: DraftFormData) => {
      await saveDraftAction(draftId, data)
    }, [draftId]),
    2000
  )

  useEffect(() => {
    const subscription = form.watch(values => {
      if (values.title || values.content) {
        debouncedSave(values as DraftFormData)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, debouncedSave])

  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>제목</FormLabel>
              <FormControl>
                <Input placeholder="글 제목을 입력하세요" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>내용</FormLabel>
              <FormControl>
                <Textarea placeholder="글 내용을 입력하세요" className="min-h-[300px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
}
```

## 💡 보안 고려사항

### Rate Limiting (Server Action에서 적용)

```typescript
// lib/rate-limit.ts
import { headers } from 'next/headers'

const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

export async function checkRateLimit(identifier: string, limit = 5, window = 60000) {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now - record.lastReset > window) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now })
    return true
  }

  if (record.count >= limit) return false

  record.count++
  return true
}

// Server Action에서 사용
export async function rateLimitedLoginAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'

  if (!(await checkRateLimit(ip))) {
    return {
      success: false,
      message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
    }
  }

  return loginAction(prevState, formData)
}
```

## ❌ 안티패턴

```typescript
// ❌ 클라이언트에서만 검증 (서버 검증 없음)
const onSubmit = async (data: FormData) => {
  await fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) })
  // 서버에서 동일 스키마로 재검증하지 않으면 보안 취약점
}

// ❌ any 타입 사용
export async function saveDraftAction(draftId: string, data: unknown) {
  // data를 unknown으로 받고 검증하거나, 명확한 타입 지정
}

// ✅ 올바른 방법
export async function saveDraftAction(draftId: string, data: DraftFormData) {
  const validated = draftSchema.safeParse(data)
  if (!validated.success) return { success: false, message: '유효하지 않은 데이터' }
  // ...
}
```

## 🎯 체크리스트

- [ ] 필요 패키지 설치 확인 (react-hook-form, @hookform/resolvers, zod)
- [ ] Zod 스키마 정의 및 TypeScript 타입 추론 확인
- [ ] Server Actions에서 서버 사이드 스키마 재검증 수행
- [ ] Supabase 인증 연동 시 `@/lib/supabase/server` createClient 사용
- [ ] `any` 타입 없음 (TypeScript strict 준수)
- [ ] 로딩 상태 UI 구현 (isPending)
- [ ] 서버 에러 메시지 사용자 친화적으로 표시
- [ ] Rate limiting 적용 (필요시)
- [ ] `npm run lint` 통과
- [ ] `npm run build` 타입 에러 없음
