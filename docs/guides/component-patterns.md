# 컴포넌트 패턴 가이드 (Next.js 16.1.6 + React 19)

이 문서는 Next.js 16.1.6 + React 19 환경에서 효율적이고 재사용 가능한 컴포넌트 작성 패턴을 제공합니다.

## 🧩 기본 설계 원칙

### 1. 단일 책임 원칙 (Single Responsibility)

```tsx
// ✅ 각 컴포넌트가 하나의 명확한 책임
interface UserAvatarProps {
  user: { avatar: string; name: string }
  size?: 'sm' | 'md' | 'lg'
}

export function UserAvatar({ user, size = 'md' }: UserAvatarProps) {
  return (
    <Avatar className={avatarSizes[size]}>
      <AvatarImage src={user.avatar} alt={user.name} />
      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
    </Avatar>
  )
}

interface UserStatusProps {
  isOnline: boolean
}

export function UserStatus({ isOnline }: UserStatusProps) {
  return (
    <div
      className={cn(
        'h-3 w-3 rounded-full',
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      )}
    />
  )
}

// ❌ 여러 책임이 섞인 컴포넌트
export function UserCard({ user }: { user: User }) {
  // 아바타 + 상태 + 프로필 + 액션 버튼 + 통계... (책임 과다)
}
```

### 2. 컴포지션 우선 (Composition over Inheritance)

```tsx
// ✅ 컴포지션 패턴
interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className, ...props }: CardProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)} {...props}>
      {children}
    </div>
  )
}

// 사용법
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
  </CardHeader>
  <CardContent>내용</CardContent>
</Card>

// ❌ 상속 패턴 (리액트에는 부적합)
class BaseCard extends Component { ... }
class UserCard extends BaseCard { ... }
```

## 🔄 Server vs Client Components

### Server Components (기본값)

```tsx
// ✅ Server Component: 데이터 패칭, SEO 중요
import { Suspense } from 'react'

export default async function UserListPage() {
  const users = await getUsers()

  return (
    <div>
      <h1>사용자 목록</h1>
      <Suspense fallback={<UserListSkeleton />}>
        <UserList users={users} />
      </Suspense>
    </div>
  )
}

async function UserList({ users }: { users: User[] }) {
  return (
    <div className="grid gap-4">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```

### Client Components ('use client' 필요)

```tsx
'use client'

import { useState } from 'react'
import { useActionState } from 'react'

// ✅ Client Component: 상호작용, 상태 관리
export function UserSearchForm() {
  const [query, setQuery] = useState('')

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="사용자 검색..."
      />
    </div>
  )
}

// ✅ React 19 useActionState 활용
interface ActionState {
  success: boolean
  message: string
}

export function UserForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateUserAction,
    { success: false, message: '' }
  )

  return (
    <form action={formAction}>
      <input name="name" required />
      <button type="submit" disabled={isPending}>
        {isPending ? '저장 중...' : '저장'}
      </button>
      {state.message && <p>{state.message}</p>}
    </form>
  )
}
```

### Server-Client 경계 설정 (Next.js 16 params 방식)

```tsx
// ✅ Next.js 16: params는 반드시 await
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id)

  return (
    <div>
      {/* 서버 컴포넌트 영역 */}
      <ProductInfo product={product} />
      <ProductImages images={product.images} />

      {/* 클라이언트 컴포넌트는 별도 파일로 분리 */}
      <ProductInteractions productId={product.id} />
    </div>
  )
}
```

```tsx
// components/product-interactions.tsx
'use client'

import { useState } from 'react'

interface ProductInteractionsProps {
  productId: string
}

export function ProductInteractions({ productId }: ProductInteractionsProps) {
  const [liked, setLiked] = useState(false)
  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? '❤️' : '🤍'}
    </button>
  )
}
```

## 🎯 Props 설계 패턴

### 1. Props Interface 정의

```tsx
// ✅ 명확한 Props 타입 정의
interface ButtonProps {
  children: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
}

export function Button({
  children,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  onClick,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? <Spinner className="mr-2" /> : null}
      {children}
    </button>
  )
}
```

### 2. Polymorphic Components

```tsx
// ✅ 다형성 컴포넌트 (as prop 패턴)
type TextVariant = 'body' | 'caption' | 'subtitle'

interface TextProps<T extends React.ElementType = 'p'> {
  as?: T
  children: React.ReactNode
  variant?: TextVariant
  className?: string
}

export function Text<T extends React.ElementType = 'p'>({
  as,
  children,
  variant = 'body',
  className,
  ...props
}: TextProps<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof TextProps>) {
  const Component = as || 'p'

  return (
    <Component className={cn(textVariants[variant], className)} {...props}>
      {children}
    </Component>
  )
}

// 사용법
<Text>기본 단락</Text>
<Text as="h1" variant="subtitle">제목</Text>
<Text as="span" variant="caption">캡션</Text>
```

## 🔄 재사용성 패턴

### 1. 컴포넌트 변형 (Variants with CVA)

```tsx
import { cva, type VariantProps } from 'class-variance-authority'

// ✅ CVA로 변형 정의
const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm',
  {
    variants: {
      variant: {
        default: 'border-border',
        outline: 'border-2',
        ghost: 'border-transparent shadow-none',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

interface CardProps extends VariantProps<typeof cardVariants> {
  children: React.ReactNode
  className?: string
}

export function Card({ variant, size, className, children }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant, size }), className)}>
      {children}
    </div>
  )
}
```

### 2. 컴파운드 컴포넌트 패턴

```tsx
'use client'

import { createContext, useContext, useState } from 'react'

interface AccordionContextType {
  openItems: Set<string>
  toggle: (value: string) => void
}

const AccordionContext = createContext<AccordionContextType | null>(null)

export function Accordion({
  children,
  type = 'single',
}: {
  children: React.ReactNode
  type?: 'single' | 'multiple'
}) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggle = (value: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(value)) {
        newSet.delete(value)
      } else {
        if (type === 'single') newSet.clear()
        newSet.add(value)
      }
      return newSet
    })
  }

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div>{children}</div>
    </AccordionContext.Provider>
  )
}

export function AccordionTrigger({ children, value }: { children: React.ReactNode; value: string }) {
  const ctx = useContext(AccordionContext)
  if (!ctx) throw new Error('AccordionContext 없음')

  return (
    <button onClick={() => ctx.toggle(value)} className="accordion-trigger">
      {children}
    </button>
  )
}

export function AccordionContent({ children, value }: { children: React.ReactNode; value: string }) {
  const ctx = useContext(AccordionContext)
  if (!ctx) throw new Error('AccordionContext 없음')

  return ctx.openItems.has(value) ? <div>{children}</div> : null
}
```

## ⚡ 성능 최적화 패턴

### 1. 메모이제이션

```tsx
import { memo, useMemo, useCallback } from 'react'

interface ComplexData {
  id: string
  value: number
}

// ✅ React.memo로 불필요한 리렌더링 방지
export const ExpensiveComponent = memo(function ExpensiveComponent({
  data,
  onUpdate,
}: {
  data: ComplexData[]
  onUpdate: (id: string) => void
}) {
  const processedData = useMemo(
    () => data.map(item => ({ ...item, calculated: expensiveCalculation(item) })),
    [data]
  )

  const handleUpdate = useCallback((id: string) => onUpdate(id), [onUpdate])

  return (
    <div>
      {processedData.map(item => (
        <ExpensiveItem key={item.id} item={item} onUpdate={handleUpdate} />
      ))}
    </div>
  )
})
```

### 2. 지연 로딩 (Lazy Loading)

```tsx
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// ✅ Next.js에서는 next/dynamic 사용 (React.lazy 대신)
const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <div>차트 로딩 중...</div>,
  ssr: false, // 클라이언트 전용 컴포넌트
})

export function Dashboard() {
  return (
    <div>
      <h1>대시보드</h1>
      <Suspense fallback={<div>로딩 중...</div>}>
        <HeavyChart />
      </Suspense>
    </div>
  )
}
```

## 🛡️ 타입 안전성 패턴

### 1. 제네릭 컴포넌트

```tsx
// ✅ 타입 안전한 제네릭 Select 컴포넌트
interface SelectProps<T> {
  options: T[]
  value?: T
  onChange: (value: T) => void
  getLabel: (option: T) => string
  getValue: (option: T) => string
  className?: string
}

export function Select<T>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
  className,
}: SelectProps<T>) {
  return (
    <select
      value={value ? getValue(value) : ''}
      onChange={e => {
        const selected = options.find(o => getValue(o) === e.target.value)
        if (selected) onChange(selected)
      }}
      className={className}
    >
      {options.map(option => (
        <option key={getValue(option)} value={getValue(option)}>
          {getLabel(option)}
        </option>
      ))}
    </select>
  )
}

// 사용법 (완전한 타입 추론)
<Select<User>
  options={users}
  value={selectedUser}
  onChange={setSelectedUser}
  getLabel={user => user.name}
  getValue={user => user.id}
/>
```

## 🎨 고급 패턴

### 1. Hook 기반 상태 관리

```tsx
'use client'

import { useState, useCallback } from 'react'

function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => setValue(prev => !prev), [])
  const setTrue = useCallback(() => setValue(true), [])
  const setFalse = useCallback(() => setValue(false), [])

  return { value, toggle, setTrue, setFalse }
}

export function ModalExample({ children }: { children: React.ReactNode }) {
  const { value: isOpen, setTrue: open, setFalse: close } = useToggle()

  return (
    <>
      <button onClick={open}>모달 열기</button>
      {isOpen && <Dialog onClose={close}>{children}</Dialog>}
    </>
  )
}
```

### 2. Context + Reducer 패턴

```tsx
'use client'

import { createContext, useContext, useReducer, type Dispatch } from 'react'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  total: number
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      return {
        items: [...state.items, action.payload],
        total: state.total + action.payload.price,
      }
    case 'REMOVE_ITEM':
      return {
        items: state.items.filter(i => i.id !== action.payload),
        total: state.items
          .filter(i => i.id !== action.payload)
          .reduce((sum, i) => sum + i.price, 0),
      }
    case 'CLEAR_CART':
      return { items: [], total: 0 }
    default:
      return state
  }
}

const CartContext = createContext<{
  state: CartState
  dispatch: Dispatch<CartAction>
} | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 })

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
```

## 🚫 안티패턴

```tsx
// ❌ props drilling 3단계 이상 → Context 또는 Server Component 활용
function App() {
  const user = useUser()
  return <Level1 user={user} />
}
function Level1({ user }: { user: User }) {
  return <Level2 user={user} />
}
function Level2({ user }: { user: User }) {
  return <Level3 user={user} /> // ← 여기까지 내려오면 구조 재검토
}

// ❌ 인라인 객체/함수 생성 (매 렌더마다 새 참조)
function BadComponent() {
  return (
    <ExpensiveComponent
      config={{ option: 'value' }} // 매번 새 객체
      onUpdate={() => {}}           // 매번 새 함수
    />
  )
}

// ❌ any 타입 사용
function Component({ data }: { data: any }) { ... }
```

## ✅ 컴포넌트 작성 체크리스트

- [ ] 단일 책임 원칙 준수
- [ ] Props 인터페이스 정의 (any 금지)
- [ ] Server Component 우선 고려, 'use client' 최소화
- [ ] Next.js 16: `params` 사용 시 `Promise<{...}>` 타입 + `await`
- [ ] 불필요한 리렌더링 방지 (memo, useCallback, useMemo)
- [ ] 지연 로딩은 `next/dynamic` 사용 (React.lazy 대신)
- [ ] 의미있는 HTML 태그 및 ARIA 속성
- [ ] 파일 크기 300줄 이하 유지
