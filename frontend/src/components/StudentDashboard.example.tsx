/**
 * Example: Integrating Emotion Detection into StudentDashboard
 * 
 * This file shows how to update your StudentDashboard.tsx to use
 * the new emotion detection system.
 */

import { useState, useEffect } from 'react'
import { useStudentSession } from '@/hooks/useStudentSession'
import VideoFeed from './VideoFeed'
import EngagementIndicator from './EngagementIndicator'
import FocusAlert from './FocusAlert'

interface StudentDashboardProps {
  studentId: string
  studentName: string
  onBack: () => void
}

export default function StudentDashboard({ studentId, studentName, onBack }: StudentDashboardProps) {
  const [sessionCode, setSessionCode] = useState('')
  const [isTeacherVideoFullscreen, setIsTeacherVideoFullscreen] = useState(false)
  const [notes, setNotes] = useState('')
  const [sessionDuration, setSessionDuration] = useState(0)
  const [showFocusAlert, setShowFocusAlert] = useState(false)
  const [unfocusedStartTime, setUnfocusedStartTime] = useState<number | null>(null)

  // Use the emotion-enabled student session hook
  const {
    currentSession,
    stats,  // Contains: currentEmotion, confidence, engagement, focusLevel, faceDetected, pose
    isLoading,
    error,
    joinSession,
    leaveSession,
    getWebSocket
  } = useStudentSession(studentId)

  const isInSession = currentSession?.is_active || false

  // Timer for session duration
  useEffect(() => {
    if (!isInSession) return

    const interval = setInterval(() => {
      setSessionDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isInSession])

  // Monitor focus level for alerts (8-minute threshold)
  useEffect(() => {
    if (!isInSession) {
      setUnfocusedStartTime(null)
      setShowFocusAlert(false)
      return
    }

    // Consider low focus if below 40 or face not detected
    const isUnfocused = stats.focusLevel < 40 || !stats.faceDetected

    if (isUnfocused) {
      if (unfocusedStartTime === null) {
        // Start tracking unfocused time
        setUnfocusedStartTime(Date.now())
      } else {
        // Check if unfocused for 8 minutes
        const unfocusedDuration = (Date.now() - unfocusedStartTime) / 1000 / 60
        if (unfocusedDuration >= 8 && !showFocusAlert) {
          setShowFocusAlert(true)
        }
      }
    } else {
      // Reset if focused again
      setUnfocusedStartTime(null)
      setShowFocusAlert(false)
    }
  }, [stats.focusLevel, stats.faceDetected, isInSession, unfocusedStartTime, showFocusAlert])

  const handleJoinSession = async () => {
    if (!sessionCode.trim()) {
      alert('Please enter a session code')
      return
    }

    try {
      await joinSession(sessionCode)
      setSessionCode('')
    } catch (err: any) {
      alert(err.message || 'Failed to join session')
    }
  }

  const handleLeaveSession = async () => {
    if (!currentSession) return

    if (confirm('Are you sure you want to leave this session?')) {
      try {
        await leaveSession(currentSession._id)
      } catch (err: any) {
        alert(err.message || 'Failed to leave session')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <p className="text-gray-600">Welcome, {studentName}!</p>
      </div>

      {!isInSession ? (
        // Join Session Form
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Join a Session</h2>
          
          <input
            type="text"
            placeholder="Enter session code"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />
          
          <button
            onClick={handleJoinSession}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Joining...' : 'Join Session'}
          </button>
          
          {error && (
            <p className="text-red-600 mt-4">{error}</p>
          )}
        </div>
      ) : (
        // Active Session View
        <div className="space-y-6">
          {/* Session Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-2">{currentSession.subject}</h2>
            <p className="text-gray-600">Teacher: {currentSession.teacher_name}</p>
            <p className="text-gray-600">Duration: {Math.floor(sessionDuration / 60)}:{String(sessionDuration % 60).padStart(2, '0')}</p>
          </div>

          {/* Video Feed with Emotion Detection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Your Video Feed</h3>
            <VideoFeed
              isActive={isInSession}
              websocket={getWebSocket()?.socket}
              onEmotionDetected={(emotionData) => {
                console.log('Emotion detected:', emotionData)
                // Data is automatically handled by useStudentSession hook
              }}
              height="h-64"
            />
            
            {/* Emotion Stats Display */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Current Emotion</p>
                <p className="text-xl font-bold capitalize">
                  {stats.currentEmotion || 'Detecting...'}
                </p>
                {stats.confidence > 0 && (
                  <p className="text-xs text-gray-500">
                    Confidence: {Math.round(stats.confidence * 100)}%
                  </p>
                )}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Engagement</p>
                <p className="text-xl font-bold capitalize">
                  {stats.engagement}
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Focus Level</p>
                <p className="text-xl font-bold">
                  {stats.focusLevel}%
                </p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Face Detection</p>
                <p className="text-xl font-bold">
                  {stats.faceDetected ? '✓ Detected' : '✗ Not Detected'}
                </p>
              </div>
            </div>

            {/* Head Pose (Optional) */}
            {stats.pose && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Head Pose</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Yaw:</span>{' '}
                    <span className="font-mono">{stats.pose.yaw.toFixed(1)}°</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pitch:</span>{' '}
                    <span className="font-mono">{stats.pose.pitch.toFixed(1)}°</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Roll:</span>{' '}
                    <span className="font-mono">{stats.pose.roll.toFixed(1)}°</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Engagement Indicator */}
          <EngagementIndicator 
            engagement={stats.engagement}
            focusLevel={stats.focusLevel}
          />

          {/* Focus Alert */}
          {showFocusAlert && (
            <FocusAlert 
              onDismiss={() => setShowFocusAlert(false)}
            />
          )}

          {/* Notes Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Session Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Take notes during the session..."
              className="w-full h-32 px-4 py-2 border rounded-lg resize-none"
            />
          </div>

          {/* Leave Session Button */}
          <button
            onClick={handleLeaveSession}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700"
          >
            Leave Session
          </button>
        </div>
      )}
    </div>
  )
}
