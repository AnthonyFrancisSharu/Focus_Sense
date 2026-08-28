'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StudentReportsPage() {
  const router = useRouter()

  useEffect(() => {
    // Students should not access reports page - redirect to dashboard
    router.replace('/student/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
