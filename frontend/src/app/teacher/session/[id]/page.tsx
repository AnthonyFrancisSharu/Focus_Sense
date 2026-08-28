'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Download, 
  Users, 
  Clock, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Eye,
  BarChart3
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { reportsApi } from '@/lib/api'

interface SessionStudent {
  id: string
  name: string
  email?: string
  joined_at: string
  emotion: string
  engagement: string
  focus_level: number
}

interface SessionReport {
  session_id: string
  session_code: string
  subject: string
  teacher_name: string
  start_time: string
  end_time: string | null
  duration_minutes: number
  is_active: boolean
  statistics: {
    total_students: number
    avg_focus: number
    avg_engagement: number
    emotions: Record<string, number>
    engagement_distribution: Record<string, number>
    focus_distribution: { high: number; medium: number; low: number }
  }
  students: SessionStudent[]
}

export default function SessionDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading: authLoading } = useAuth()
  const sessionId = params.id as string
  
  const [sessionData, setSessionData] = useState<SessionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const fetchSessionDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await reportsApi.getSessionReport(sessionId)
      setSessionData(data)
    } catch (err: any) {
      console.error('Error fetching session details:', err)
      setError(err.message || 'Failed to load session details')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    // Wait for auth to finish loading before fetching
    if (authLoading) return
    
    // Only fetch if we have a valid session ID and user is authenticated
    if (sessionId && user) {
      fetchSessionDetails()
    }
  }, [sessionId, user, authLoading, fetchSessionDetails])

  const downloadReport = async (format: 'pdf' | 'csv') => {
    try {
      setDownloading(true)
      const blob = await reportsApi.exportSessionReport(sessionId, format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `session-report-${sessionId}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Error downloading report:', err)
      setError(`Failed to download ${format.toUpperCase()} report`)
    } finally {
      setDownloading(false)
    }
  }

  const getEmotionEmoji = (emotion: string) => {
    const emojiMap: Record<string, string> = {
      'happy': '😊',
      'happiness': '😊',
      'sad': '😢',
      'sadness': '😢',
      'angry': '😠',
      'anger': '😠',
      'fear': '😨',
      'surprise': '😲',
      'surprised': '😲',
      'disgust': '🤢',
      'neutral': '😐',
      'contempt': '😒'
    }
    return emojiMap[emotion?.toLowerCase()] || '😐'
  }

  const getEngagementColor = (engagement: string) => {
    switch (engagement?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'passive':
        return 'bg-yellow-100 text-yellow-700'
      case 'distracted':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getFocusColor = (level: number) => {
    if (level >= 70) return 'text-green-600'
    if (level >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading || authLoading) {
    return (
      <ProtectedRoute allowedRoles={['teacher', 'admin']}>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading session details...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['teacher', 'admin']}>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Session</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => router.push('/teacher/dashboard')}
              className="btn btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!sessionData) {
    return (
      <ProtectedRoute allowedRoles={['teacher', 'admin']}>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Session Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">The requested session could not be found.</p>
            <button
              onClick={() => router.push('/teacher/dashboard')}
              className="btn btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['teacher', 'admin']}>
      <Navbar />
      <div className="min-h-screen bg-primary-900 dark:bg-gray-900">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => router.push('/teacher/dashboard')}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">{sessionData.subject}</h1>
                <p className="text-gray-300 mt-1">
                  Session Code: <span className="font-mono font-semibold">{sessionData.session_code}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  sessionData.is_active 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {sessionData.is_active ? 'Active' : 'Ended'}
                </span>
                <button
                  onClick={() => downloadReport('pdf')}
                  disabled={downloading}
                  className="btn btn-primary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </button>
                <button
                  onClick={() => downloadReport('csv')}
                  disabled={downloading}
                  className="btn btn-outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </button>
              </div>
            </div>
          </motion.div>

          {/* Session Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Start Time</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {new Date(sessionData.start_time).toLocaleString()}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {sessionData.duration_minutes} minutes
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Students</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {sessionData.statistics?.total_students ?? sessionData.students?.length ?? 0}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Avg Focus</span>
              </div>
              <p className={`text-lg font-semibold ${getFocusColor(sessionData.statistics?.avg_focus ?? 0)}`}>
                {sessionData.statistics?.avg_focus ?? 0}%
              </p>
            </div>
          </motion.div>

          {/* Statistics Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          >
            {/* Engagement Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-600" />
                Engagement Distribution
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-green-600 font-medium">Active</span>
                  <span className="font-bold dark:text-white">{sessionData.statistics?.engagement_distribution?.active ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-600 font-medium">Passive</span>
                  <span className="font-bold dark:text-white">{sessionData.statistics?.engagement_distribution?.passive ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600 font-medium">Distracted</span>
                  <span className="font-bold dark:text-white">{sessionData.statistics?.engagement_distribution?.distracted ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Focus Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                Focus Level Distribution
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-green-600 font-medium">High (70%+)</span>
                  <span className="font-bold dark:text-white">{sessionData.statistics?.focus_distribution?.high ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-600 font-medium">Medium (40-70%)</span>
                  <span className="font-bold dark:text-white">{sessionData.statistics?.focus_distribution?.medium ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600 font-medium">Low (&lt;40%)</span>
                  <span className="font-bold dark:text-white">{sessionData.statistics?.focus_distribution?.low ?? 0}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Emotion Distribution */}
          {sessionData.statistics?.emotions && Object.keys(sessionData.statistics.emotions).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">😊 Emotion Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(sessionData.statistics.emotions).map(([emotion, count]) => (
                  <div key={emotion} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-3xl mb-2 block">{getEmotionEmoji(emotion)}</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{emotion}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Students Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              Student Performance
            </h3>
            
            {sessionData.students && sessionData.students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Joined At</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Emotion</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Engagement</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Focus Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sessionData.students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                            {student.email && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(student.joined_at).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <span className="text-xl">{getEmotionEmoji(student.emotion)}</span>
                            <span className="text-sm capitalize dark:text-gray-300">{student.emotion}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEngagementColor(student.engagement)}`}>
                            {student.engagement}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm font-bold ${getFocusColor(student.focus_level)}`}>
                          {student.focus_level}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No students joined this session</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
