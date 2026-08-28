'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import { 
  Palette, 
  Sun, 
  Moon, 
  ArrowLeft,
  Check
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function AdminSettings() {
  const { user, isLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Show loading while auth is being checked
  if (isLoading || !user) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700/50 transition-colors duration-200">
          <div className="container mx-auto px-6 py-4">
            {/* Back to Dashboard Button */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => router.push('/admin/dashboard')}
              className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </motion.button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Appearance - Theme Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-700/50 p-6 transition-colors duration-200"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appearance</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customize your interface theme</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTheme('light')}
                    className={`relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl border-2 transition-all ${
                      theme === 'light'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span className={`font-medium ${theme === 'light' ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      Light
                    </span>
                    {theme === 'light' && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`relative flex items-center justify-center gap-3 px-6 py-4 rounded-xl border-2 transition-all ${
                      theme === 'dark'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span className={`font-medium ${theme === 'dark' ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      Dark
                    </span>
                    {theme === 'dark' && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
