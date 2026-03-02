// Supabase 조인 결과가 단일 객체나 배열로 올 수 있어 첫 번째 값을 반환
export function getProfile<T>(profiles: T | T[] | null): T | null {
  if (!profiles) return null
  return Array.isArray(profiles) ? profiles[0] : profiles
}
