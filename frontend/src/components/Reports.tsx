'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { reportsApi } from '@/lib/api'

interface ReportsProps {
  userRole: 'teacher' | 'student' | 'admin'
  sessionId?: string
}

export default function Reports({ userRole, sessionId }: ReportsProps) {
  const [reportType, setReportType] = useState<'summary' | 'session' | 'admin'>('summary')
  const [period, setPeriod] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [sessionReportId, setSessionReportId] = useState(sessionId || '')

  useEffect(() => {
    if (reportType === 'summary') {
      loadSummaryReport()
    } else if (reportType === 'admin' && userRole === 'admin') {
      loadAdminReport()
    }
  }, [reportType, period, userRole])

  const loadSummaryReport = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = userRole === 'teacher'
        ? await reportsApi.getTeacherSummary(period)
        : await reportsApi.getStudentSummary(period)
      
      setReportData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const loadSessionReport = async () => {
    if (!sessionReportId) {
      setError('Please enter a session ID')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const data = await reportsApi.getSessionReport(sessionReportId)
      setReportData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load session report')
    } finally {
      setLoading(false)
    }
  }

  const loadAdminReport = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await reportsApi.getAdminOverview(period)
      setReportData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load admin overview')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'json' | 'csv' | 'pdf') => {
    if (!sessionReportId) {
      setError('Please enter a session ID')
      return
    }

    try {
      setLoading(true)
      const result = await reportsApi.exportSessionReport(sessionReportId, format)
      
      if ((format === 'csv' || format === 'pdf') && result instanceof Blob) {
        const extension = format === 'pdf' ? 'pdf' : 'csv'
        reportsApi.downloadCSV(result, `session_${sessionReportId}_report.${extension}`)
      } else {
        // For JSON, trigger download
        const dataStr = JSON.stringify(result, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        reportsApi.downloadCSV(blob, `session_${sessionReportId}_report.json`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to export report')
    } finally {
      setLoading(false)
    }
  }

  const getEmotionIcon = (emotion: string) => {
    const icons: Record<string, string> = {
      happiness: '😊',
      sadness: '😢',
      anger: '😠',
      fear: '😨',
      surprise: '😲',
      neutral: '😐'
    }
    return icons[emotion] || '😐'
  }

  const getFocusColor = (level: number) => {
    if (level >= 70) return 'text-green-600'
    if (level >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">📊 Reports & Analytics</h1>
        
        {/* Report Type Selection */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setReportType('summary')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              reportType === 'summary'
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {userRole === 'teacher' ? '📈 Teaching Summary' : '📚 Learning Summary'}
          </button>
          
          <button
            onClick={() => setReportType('session')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              reportType === 'session'
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            📄 Session Report
          </button>

          {userRole === 'admin' && (
            <button
              onClick={() => setReportType('admin')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                reportType === 'admin'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              🌐 System Overview
            </button>
          )}
        </div>

        {/* Period Selection for Summary */}
        {(reportType === 'summary' || reportType === 'admin') && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="text-gray-700 dark:text-gray-300 font-medium">Period:</label>
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
            {reportData && reportType === 'summary' && (
              <button
                onClick={async () => {
                  try {
                    setLoading(true)
                    const blob = userRole === 'teacher'
                      ? await reportsApi.exportTeacherSummary(period, 'pdf')
                      : await reportsApi.exportStudentSummary(period, 'pdf')
                    
                    if (blob instanceof Blob) {
                      reportsApi.downloadCSV(blob, `${userRole}_summary_${period}days.pdf`)
                    }
                  } catch (err: any) {
                    setError('Failed to export PDF: ' + err.message)
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
            )}
          </div>
        )}

        {/* Session ID Input */}
        {reportType === 'session' && (
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={sessionReportId}
              onChange={(e) => setSessionReportId(e.target.value)}
              placeholder="Enter Session ID or Code"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={loadSessionReport}
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Load Report
            </button>
            <button
              onClick={() => exportReport('pdf')}
              disabled={loading || !reportData}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF
            </button>
            <button
              onClick={() => exportReport('csv')}
              disabled={loading || !reportData}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              CSV
            </button>
            <button
              onClick={() => exportReport('json')}
              disabled={loading || !reportData}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              JSON
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Report Content */}
      {!loading && reportData && (
        <AnimatePresence mode="wait">
          {/* Summary Report */}
          {reportType === 'summary' && userRole === 'teacher' && (
            <motion.div
              key="teacher-summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.total_sessions}</div>
                  <div className="text-blue-100">Total Sessions</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.total_students}</div>
                  <div className="text-green-100">Total Students</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.avg_focus_level}%</div>
                  <div className="text-purple-100">Avg Focus Level</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{Math.round(reportData.total_duration_minutes)}m</div>
                  <div className="text-orange-100">Total Duration</div>
                </div>
              </div>

              {/* Sessions by Subject */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">📚 Sessions by Subject</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(reportData.sessions_by_subject).map(([subject, data]: [string, any]) => (
                    <div key={subject} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{subject}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{data.count} sessions</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{data.students} students</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engagement Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">🎯 Focus Distribution</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-600 font-medium">High (70%+)</span>
                      <span className="font-bold dark:text-white">{reportData.focus_distribution?.high ?? 0} students</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-600 font-medium">Medium (40-70%)</span>
                      <span className="font-bold dark:text-white">{reportData.focus_distribution?.medium ?? 0} students</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-red-600 font-medium">Low (&lt;40%)</span>
                      <span className="font-bold dark:text-white">{reportData.focus_distribution?.low ?? 0} students</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">😊 Emotion Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(reportData.emotion_distribution || {}).map(([emotion, count]) => (
                      <div key={emotion} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 dark:text-gray-300">
                          <span className="text-2xl">{getEmotionIcon(emotion)}</span>
                          <span className="capitalize">{emotion}</span>
                        </span>
                        <span className="font-bold dark:text-white">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Student Summary */}
          {reportType === 'summary' && userRole === 'student' && (
            <motion.div
              key="student-summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.total_sessions}</div>
                  <div className="text-blue-100">Sessions Attended</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.avg_focus_level}%</div>
                  <div className="text-green-100">Avg Focus</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.avg_engagement}%</div>
                  <div className="text-purple-100">Avg Engagement</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{Math.round(reportData.total_duration_minutes)}m</div>
                  <div className="text-orange-100">Total Time</div>
                </div>
              </div>

              {/* Subjects Performance */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">📚 Performance by Subject</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(reportData.subjects_attended).map(([subject, data]: [string, any]) => (
                    <div key={subject} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="font-semibold text-gray-900 dark:text-white mb-2">{subject}</div>
                      <div className="space-y-1 text-sm dark:text-gray-400">
                        <div>Sessions: {data.sessions_attended}</div>
                        <div className={getFocusColor(data.avg_focus)}>
                          Avg Focus: {data.avg_focus}%
                        </div>
                        <div className="flex items-center gap-1">
                          Mood: {getEmotionIcon(data.top_emotion)} {data.top_emotion}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {reportData.recommendations && reportData.recommendations.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">💡 Recommendations</h3>
                  <ul className="space-y-2">
                    {reportData.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary-600 mt-1">•</span>
                        <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Performance History */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">📈 Recent Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Subject</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Duration</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Focus</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Emotion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(reportData.performance_history || []).slice(0, 10).map((perf: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {new Date(perf.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{perf.subject}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{perf.duration_minutes}m</td>
                          <td className={`px-4 py-3 text-sm font-medium ${getFocusColor(perf.focus_level)}`}>
                            {perf.focus_level}%
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="flex items-center gap-1">
                              {getEmotionIcon(perf.emotion)} {perf.emotion}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Session Report */}
          {reportType === 'session' && (
            <motion.div
              key="session-report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Session Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Session Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Session Code</div>
                    <div className="font-semibold text-lg dark:text-white">{reportData.session_code}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Subject</div>
                    <div className="font-semibold text-lg dark:text-white">{reportData.subject}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Teacher</div>
                    <div className="font-semibold text-lg dark:text-white">{reportData.teacher_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                    <div className="font-semibold text-lg dark:text-white">{reportData.duration_minutes} min</div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.statistics?.total_students ?? reportData.students?.length ?? 0}</div>
                  <div className="text-blue-100">Students</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.statistics?.avg_focus ?? 0}%</div>
                  <div className="text-green-100">Avg Focus</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.statistics?.avg_engagement ?? 0}%</div>
                  <div className="text-purple-100">Active Engagement</div>
                </div>
              </div>

              {/* Student Details */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Student Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Joined At</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Emotion</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Engagement</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Focus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(reportData.students || []).map((student: any) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(student.joined_at).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="flex items-center gap-1">
                              {getEmotionIcon(student.emotion)} {student.emotion}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              student.engagement === 'active' ? 'bg-green-100 text-green-700' :
                              student.engagement === 'passive' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {student.engagement}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${getFocusColor(student.focus_level)}`}>
                            {student.focus_level}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Admin Overview */}
          {reportType === 'admin' && userRole === 'admin' && (
            <motion.div
              key="admin-overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* System Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.system_stats?.total_teachers ?? 0}</div>
                  <div className="text-blue-100">Teachers</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.system_stats?.total_students ?? 0}</div>
                  <div className="text-green-100">Students</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="text-3xl font-bold">{reportData.system_stats?.total_sessions ?? 0}</div>
                  <div className="text-purple-100">Total Sessions</div>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Usage Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{reportData.system_stats?.active_sessions ?? 0}</div>
                    <div className="text-sm text-gray-600">Active Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-700">{reportData.system_stats?.completed_sessions ?? 0}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-700">{Math.round(reportData.usage_stats?.total_duration_minutes ?? 0)}m</div>
                    <div className="text-sm text-gray-600">Total Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-700">{reportData.usage_stats?.total_participants ?? 0}</div>
                    <div className="text-sm text-gray-600">Participants</div>
                  </div>
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 System-wide Engagement</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-primary-600">{reportData.engagement_stats?.avg_focus_level ?? 0}%</div>
                      <div className="text-gray-600">Average Focus Level</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-green-600">High</span>
                        <span className="font-bold">{reportData.engagement_stats?.focus_distribution?.high ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-yellow-600">Medium</span>
                        <span className="font-bold">{reportData.engagement_stats?.focus_distribution?.medium ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-red-600">Low</span>
                        <span className="font-bold">{reportData.engagement_stats?.focus_distribution?.low ?? 0}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Emotion Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(reportData.engagement_stats?.emotion_distribution || {}).map(([emotion, count]) => (
                        <div key={emotion} className="flex justify-between items-center">
                          <span className="flex items-center gap-2">
                            <span className="text-xl">{getEmotionIcon(emotion)}</span>
                            <span className="capitalize">{emotion}</span>
                          </span>
                          <span className="font-bold">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
