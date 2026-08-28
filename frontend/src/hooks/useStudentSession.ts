import { useState, useEffect, useRef } from 'react'
import { sessionApi } from '@/lib/api'
import { createStudentWebSocket, WebSocketManager } from '@/lib/websocket'

export interface Session {
  _id: string
  session_code: string
  teacher_id: string
  teacher_name: string
  subject: string
  max_students: number
  is_active: boolean
  students: any[]
  created_at: string
  started_at?: string
  ended_at?: string
}

export interface StudentStats {
  currentEmotion: string | null
  rawEmotion?: string
  confidence: number
  engagement: 'active' | 'passive' | 'distracted'
  focusLevel: number
  faceDetected: boolean
  pose?: {
    yaw: number
    pitch: number
    roll: number
  }
}

export function useStudentSession(studentId: string) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [pastSessions, setPastSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<StudentStats>({
    currentEmotion: null,
    confidence: 0,
    engagement: 'active',
    focusLevel: 100,
    faceDetected: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocketManager | null>(null)

  // Load past sessions
  useEffect(() => {
    loadPastSessions()
    loadActiveSession()
  }, [])

  // Setup WebSocket when in session
  useEffect(() => {
    if (currentSession && currentSession.is_active) {
      setupWebSocket()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect()
        wsRef.current = null
      }
    }
  }, [currentSession?.is_active])

  const loadPastSessions = async () => {
    try {
      const sessions = await sessionApi.getStudentSessions()
      setPastSessions(sessions.filter((s: Session) => !s.is_active))
    } catch (err: any) {
      console.error('Error loading past sessions:', err)
    }
  }

  const loadActiveSession = async () => {
    try {
      const session = await sessionApi.getActiveStudentSession()
      setCurrentSession(session)
    } catch (err: any) {
      // No active session is okay
      if (!err.message?.includes('404')) {
        console.error('Error loading active session:', err)
      }
    }
  }

  const setupWebSocket = () => {
    if (!currentSession || wsRef.current) return

    const ws = createStudentWebSocket(currentSession._id, studentId)

    ws.on('connected', (data) => {
      console.log('Student connected to session:', data)
    })

    ws.on('session_update', (data) => {
      console.log('Session update received:', data)
      // Handle session updates from teacher
    })

    ws.on('emotion_result', (data) => {
      console.log('Emotion result received:', data)
      // Update local stats with emotion data from backend
      setStats({
        currentEmotion: data.emotion,
        rawEmotion: data.raw_emotion,
        confidence: data.confidence,
        engagement: data.engagement,
        focusLevel: data.focus_level,
        faceDetected: data.face_detected,
        pose: data.pose
      })
    })

    ws.on('error', (data) => {
      console.error('WebSocket error:', data)
    })

    ws.on('pong', () => {
      // Connection is alive
    })

    ws.connect().then(() => {
      console.log('WebSocket connected successfully')
    }).catch(err => {
      console.error('WebSocket connection error:', err)
    })

    wsRef.current = ws
  }

  const joinSession = async (sessionCode: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const session = await sessionApi.joinSession(sessionCode)
      setCurrentSession(session)
      return session
    } catch (err: any) {
      setError(err.message || 'Failed to join session')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const leaveSession = async (sessionId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await sessionApi.leaveSession(sessionId)

      // Move to past sessions if it was current
      if (currentSession && currentSession._id === sessionId) {
        setPastSessions(prev => [currentSession, ...prev])
        setCurrentSession(null)
      }

      // Disconnect WebSocket
      if (wsRef.current) {
        wsRef.current.disconnect()
        wsRef.current = null
      }
    } catch (err: any) {
      setError(err.message || 'Failed to leave session')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const updateEngagement = async (emotionData?: Partial<StudentStats>) => {
    if (!currentSession) return

    try {
      // Update local stats
      if (emotionData) {
        setStats(prev => ({
          ...prev,
          ...emotionData
        }))
      }

      // Send through WebSocket if connected
      if (wsRef.current && wsRef.current.isConnected() && emotionData) {
        wsRef.current.send({
          type: 'engagement_update',
          data: {
            emotion: emotionData.currentEmotion,
            raw_emotion: emotionData.rawEmotion,
            confidence: emotionData.confidence,
            engagement: emotionData.engagement,
            focus_level: emotionData.focusLevel,
            face_detected: emotionData.faceDetected,
            pose: emotionData.pose
          }
        })
      }
    } catch (err: any) {
      console.error('Error updating engagement:', err)
    }
  }

  const getWebSocket = () => {
    return wsRef.current
  }

  const refreshSession = async () => {
    if (!currentSession) return

    try {
      const session = await sessionApi.getSession(currentSession._id)
      setCurrentSession(session)
    } catch (err: any) {
      console.error('Error refreshing session:', err)
    }
  }

  return {
    currentSession,
    pastSessions,
    stats,
    isLoading,
    error,
    joinSession,
    leaveSession,
    updateEngagement,
    refreshSession,
    loadPastSessions,
    getWebSocket
  }
}
