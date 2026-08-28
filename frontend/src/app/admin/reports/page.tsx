'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Reports from '@/components/Reports'
import Navbar from '@/components/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function AdminReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('access_token')
    const userStr = localStorage.getItem('user')
    
    if (!token || !userStr) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(userStr)
    if (userData.role !== 'admin') {
      router.push('/login')
      return
    }

    setUser(userData)
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Reports userRole="admin" />
      </div>
    </ProtectedRoute>
  )
}
