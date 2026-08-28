'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  Download, 
  Eye, 
  Clock, 
  User, 
  Calendar,
  TrendingUp,
  FileText,
  Play,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { SessionData } from '@/app/page'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface SessionHistoryProps {
  sessions: SessionData[]
  onStartNewSession: () => void
}

export default function SessionHistory({ sessions, onStartNewSession }: SessionHistoryProps) {
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null)

  const generatePDFReport = (session: SessionData) => {
    // This would integrate with a PDF generation library
    console.log('Generating PDF report for session:', session.id)
    alert('PDF report generation would be implemented here')
  }

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'active': return 'text-success-600'
      case 'passive': return 'text-warning-600'
      case 'distracted': return 'text-danger-600'
      default: return 'text-gray-600'
    }
  }

  const getEngagementIcon = (level: string) => {
    switch (level) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'passive': return <Clock className="w-4 h-4" />
      case 'distracted': return <AlertTriangle className="w-4 h-4" />
      default: return <TrendingUp className="w-4 h-4" />
    }
  }

  // Calculate overall statistics
  const totalSessions = sessions.length
  const totalTime = sessions.reduce((sum, session) => sum + session.duration, 0)
  const avgEngagement = sessions.length > 0 ? 
    sessions.reduce((sum, session) => {
      const total = session.engagement.active + session.engagement.passive + session.engagement.distracted
      return sum + (total > 0 ? (session.engagement.active / total) * 100 : 0)
    }, 0) / sessions.length : 0

  const chartData = sessions.map(session => ({
    date: format(session.startTime, 'MMM dd'),
    active: session.engagement.active,
    passive: session.engagement.passive,
    distracted: session.engagement.distracted,
    focus: session.gazeTracking.focused + session.gazeTracking.unfocused > 0 ?
      (session.gazeTracking.focused / (session.gazeTracking.focused + session.gazeTracking.unfocused)) * 100 : 0
  }))

  const pieData = [
    { name: 'Active', value: sessions.reduce((sum, s) => sum + s.engagement.active, 0), color: '#22c55e' },
    { name: 'Passive', value: sessions.reduce((sum, s) => sum + s.engagement.passive, 0), color: '#f59e0b' },
    { name: 'Distracted', value: sessions.reduce((sum, s) => sum + s.engagement.distracted, 0), color: '#ef4444' }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Session History</h2>
          <p className="text-gray-600">View and analyze your learning sessions</p>
        </div>
        <button
          onClick={onStartNewSession}
          className="btn btn-primary px-6 py-3"
        >
          <Play className="w-5 h-5 mr-2" />
          Start New Session
        </button>
      </div>

      {/* Statistics Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalSessions}</div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mr-4">
              <Clock className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalTime}</div>
              <div className="text-sm text-gray-600">Total Minutes</div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mr-4">
              <TrendingUp className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{avgEngagement.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Avg Engagement</div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {sessions.length > 0 ? 
                  Math.round(sessions.reduce((sum, s) => {
                    const total = s.gazeTracking.focused + s.gazeTracking.unfocused
                    return sum + (total > 0 ? (s.gazeTracking.focused / total) * 100 : 0)
                  }, 0) / sessions.length) : 0}%
              </div>
              <div className="text-sm text-gray-600">Avg Focus</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sessions List */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h3>
            
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h4>
                <p className="text-gray-600 mb-4">Start your first learning session to see analytics here.</p>
                <button
                  onClick={onStartNewSession}
                  className="btn btn-primary"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start First Session
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedSession?.id === session.id 
                        ? 'border-primary-300 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{session.learnerName}</h4>
                          <p className="text-sm text-gray-600">
                            {format(session.startTime, 'MMM dd, yyyy • HH:mm')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{session.duration} min</div>
                          <div className="text-xs text-gray-500">Duration</div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {session.engagement.active + session.engagement.passive + session.engagement.distracted > 0 ?
                              Math.round((session.engagement.active / (session.engagement.active + session.engagement.passive + session.engagement.distracted)) * 100) : 0}%
                          </div>
                          <div className="text-xs text-gray-500">Engagement</div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            generatePDFReport(session)
                          }}
                          className="btn btn-secondary px-3 py-1 text-sm"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          PDF
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Session Details */}
        <div className="space-y-6">
          {selectedSession ? (
            <>
              {/* Session Details */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Details</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Learner:</span>
                    <span className="font-medium">{selectedSession.learnerName}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="font-medium">{format(selectedSession.startTime, 'MMM dd, yyyy')}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="font-medium">{selectedSession.duration} minutes</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Start Time:</span>
                    <span className="font-medium">{format(selectedSession.startTime, 'HH:mm')}</span>
                  </div>
                  
                  {selectedSession.endTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">End Time:</span>
                      <span className="font-medium">{format(selectedSession.endTime, 'HH:mm')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Engagement Breakdown */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Breakdown</h3>
                
                <div className="space-y-3">
                  {Object.entries(selectedSession.engagement).map(([level, minutes]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getEngagementIcon(level)}
                        <span className="text-sm font-medium capitalize">{level}</span>
                      </div>
                      <span className={`font-medium ${getEngagementColor(level)}`}>
                        {minutes} min
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gaze Tracking */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Focus Analysis</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Focused:</span>
                    <span className="font-medium text-success-600">{selectedSession.gazeTracking.focused}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Unfocused:</span>
                    <span className="font-medium text-danger-600">{selectedSession.gazeTracking.unfocused}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Focus Score:</span>
                    <span className="font-medium">
                      {selectedSession.gazeTracking.focused + selectedSession.gazeTracking.unfocused > 0 ?
                        Math.round((selectedSession.gazeTracking.focused / (selectedSession.gazeTracking.focused + selectedSession.gazeTracking.unfocused)) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedSession.notes && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSession.notes}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-6 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Session</h3>
              <p className="text-gray-600">Choose a session from the list to view detailed analytics.</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      {/* {sessions.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} min`, 'Duration']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="active" stackId="a" fill="#22c55e" />
                  <Bar dataKey="passive" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="distracted" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )} */}
    </div>
  )
}
