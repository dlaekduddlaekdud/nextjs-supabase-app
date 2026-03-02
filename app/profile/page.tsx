import { Suspense } from 'react'
import { ProfileContent } from './profile-content'

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  )
}
