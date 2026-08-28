'use client'

import { useRouter } from 'next/navigation'
import RoleSelection from '@/components/RoleSelection'

export default function GetStartedPage() {
  const router = useRouter()

  const handleSelectRole = (role: 'teacher' | 'student') => {
    router.push(`/login/${role}`)
  }

  return <RoleSelection onSelectRole={handleSelectRole} />
}
