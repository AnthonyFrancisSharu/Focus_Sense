import { useState, useEffect, useRef } from 'react'
import { sessionApi } from '@/lib/api'
import { createTeacherWebSocket, WebSocketManager } from '@/lib/websocket'

export interface StudentInSession {
  id: string
  name: string
  email: string
  joined_at: string
  emotion?: string
  engagement?: 'active' | 'passive' | 'distracted'
  focus_level?: number
}

export interface Session {
  _id: string
  session_code: string
  teacher_id: string
  teacher_name: string
  subject: string
  max_students: number
  is_active: boolean
  students: StudentInSession[]
  created_at: string
  started_at?: string
  ended_at?: string
}

export function useTeacherSession(teacherId: string) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [pastSessions, setPastSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocketManager | null>(null)

  // Load past sessions
  useEffect(() => {
    loadPastSessions()
    loadActiveSession()
  }, [])

  // Setup WebSocket when session becomes active
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
      const sessions = await sessionApi.getTeacherSessions()
      setPastSessions(sessions.filter((s: Session) => !s.is_active))
    } catch (err: any) {
      console.error('Error loading past sessions:', err)
    }
  }

  const loadActiveSession = async () => {
    try {
      const session = await sessionApi.getActiveTeacherSession()
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

    const ws = createTeacherWebSocket(currentSession._id, teacherId)
    
    ws.on('connected', (data) => {
      console.log('Teacher connected to session:', data)
    })

    ws.on('student_update', (data) => {
      console.log('Student update received:', data)
      
      // Update the student in current session
      setCurrentSession(prev => {
        if (!prev) return prev
        
        const updatedStudents = prev.students.map(student => {
          if (student.id === data.student_id) {
            return {
              ...student,
              emotion: data.emotion,
              engagement: data.engagement,
              focus_level: data.focus_level
            }
          }
          return student
        })
        
        return { ...prev, students: updatedStudents }
      })
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

  const createSession = async (subject: string, maxStudents: number = 30) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const session = await sessionApi.createSession(subject, maxStudents)
      setCurrentSession(session)
      return session
    } catch (err: any) {
      setError(err.message || 'Failed to create session')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const startSession = async (sessionId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const session = await sessionApi.startSession(sessionId)
      setCurrentSession(session)
      return session
    } catch (err: any) {
      setError(err.message || 'Failed to start session')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const endSession = async (sessionId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const session = await sessionApi.endSession(sessionId)
      
      // Move to past sessions
      if (currentSession) {
        setPastSessions(prev => [session, ...prev])
      }
      
      setCurrentSession(null)
      
      // Disconnect WebSocket
      if (wsRef.current) {
        wsRef.current.disconnect()
        wsRef.current = null
      }
      
      return session
    } catch (err: any) {
      setError(err.message || 'Failed to end session')
      throw err
    } finally {
      setIsLoading(false)
    }
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
    isLoading,
    error,
    createSession,
    startSession,
    endSession,
    refreshSession,
    loadPastSessions
  }
}
