'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import TeacherDashboard from '@/components/TeacherDashboard'
import Navbar from '@/components/Navbar'
import { Loader2 } from 'lucide-react'

export default function TeacherDashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (!isLoading) {
      if (!user) {
        router.push('/login')
      } else if (user.role !== 'teacher') {
        router.push(`/${user.role}/dashboard`)
      }
    }
  }, [user, isLoading, router])

  // Show loading while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'teacher') {
    return null
  }

  return (
    <>
      <Navbar />
      <TeacherDashboard teacherName={user.name} onBack={() => {}} />
    </>
  )
}
