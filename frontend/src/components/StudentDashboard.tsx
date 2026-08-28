'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { 
  LogIn, 
  Users, 
  Brain,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  LogOut,
  Maximize,
  Minimize,
  X
} from 'lucide-react'
import VideoFeed from './VideoFeed'
import EngagementIndicator from './EngagementIndicator'
import FocusAlert from './FocusAlert'
import Notepad from './Notepad'
import CameraPermissionModal, { checkCameraPermission } from './CameraPermissionModal'
import { agoraConfig, validateAgoraConfig } from '@/lib/agoraConfig'

import { WebSocketManager, ConnectionState } from '@/lib/websocket'

// Dynamically import Agora component to avoid SSR issues
const InteractiveLiveStreaming = dynamic(
  () => import('./InteractiveLiveStreaming'),
  { ssr: false }
)

interface StudentDashboardProps {
  studentName: string
  onBack: () => void
}

interface SessionInfo {
  id: string
  sessionCode: string
  teacherName: string
  subject: string
  startTime: Date
  isActive: boolean
}

interface StudentStats {
  currentEmotion: string
  engagement: 'active' | 'passive' | 'distracted'
  focusLevel: number
  engagementData: {
    active: number
    passive: number
    distracted: number
  }
  gazeData: {
    focused: number
    unfocused: number
  }
}

export default function StudentDashboard({ studentName, onBack }: StudentDashboardProps) {
  const [sessionCode, setSessionCode] = useState('')
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null)
  const [isInSession, setIsInSession] = useState(false)
  const [useMockData] = useState(false) // Disable mock mode - use real API
  const [isWatchingStream, setIsWatchingStream] = useState(false)
  const [agoraConfigValid, setAgoraConfigValid] = useState(false)
  const [emotionWebSocket, setEmotionWebSocket] = useState<WebSocket | null>(null)
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [isLeavingSession, setIsLeavingSession] = useState(false) // Track intentional leave
  const [reconnectAttempt, setReconnectAttempt] = useState<{current: number, max: number} | null>(null)
  const [stats, setStats] = useState<StudentStats>({
    currentEmotion: '',
    engagement: 'active',
    focusLevel: 100,
    engagementData: { active: 0, passive: 0, distracted: 0 },
    gazeData: { focused: 0, unfocused: 0 }
  })
  const [showFocusAlert, setShowFocusAlert] = useState(false)
  const [unfocusStartTime, setUnfocusStartTime] = useState<number | null>(null)
  const [unfocusAlertShown, setUnfocusAlertShown] = useState(false)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [notes, setNotes] = useState('')
  const [isTeacherVideoFullscreen, setIsTeacherVideoFullscreen] = useState(false)
  const [lastEngagementState, setLastEngagementState] = useState<'active' | 'passive' | 'distracted'>('active')
  const [lastEngagementTime, setLastEngagementTime] = useState<number>(Date.now())
  const [currentGazeDirection, setCurrentGazeDirection] = useState<string>('CENTER')
  const [isCurrentlyFocusedGaze, setIsCurrentlyFocusedGaze] = useState<boolean>(true)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraGranted, setCameraGranted] = useState(false)
  const [pendingJoin, setPendingJoin] = useState(false)

  // Validate Agora config on mount
  useEffect(() => {
    const validation = validateAgoraConfig()
    setAgoraConfigValid(validation.valid)
  }, [])

  // Show camera permission modal on dashboard load
  useEffect(() => {
    checkCameraPermission().then(status => {
      if (status === 'granted') {
        setCameraGranted(true)
      } else {
        setShowCameraModal(true)
      }
    })
  }, [])

  // Timer for session duration and engagement tracking
  useEffect(() => {
    if (!isInSession) return

    const interval = setInterval(() => {
      setSessionDuration(prev => prev + 1)
      
      // Update engagement data based on current state (1 second per interval)
      setStats(prev => {
        const newStats = { ...prev }
        newStats.engagementData[prev.engagement]++
        return newStats
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isInSession])

  // Keyboard shortcut for fullscreen (ESC to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTeacherVideoFullscreen) {
        setIsTeacherVideoFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTeacherVideoFullscreen])

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!isInSession || !currentSession) return

    // Get student ID from localStorage
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      console.error('No user data found in localStorage')
      return
    }
    
    const user = JSON.parse(userStr)
    const studentId = user.id
    
    if (!studentId) {
      console.error('No student ID found in user data')
      return
    }

    // Clean WebSocket URL to avoid double slashes
    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000').replace(/\/+$/, '')
    
    // Create WebSocket manager with improved reconnection
    const manager = new WebSocketManager(
      `${wsUrl}/ws/session/${currentSession.id}/student/${studentId}`,
      {
        onStateChange: (state) => {
          setConnectionState(state)
          console.log(`Connection state changed: ${state}`)
        },
        onReconnectAttempt: (attempt, max) => {
          setReconnectAttempt({ current: attempt, max })
          console.log(`Reconnection attempt ${attempt}/${max}`)
        },
        onMaxReconnectReached: () => {
          setReconnectAttempt(null)
          // Show user-friendly message instead of reloading
          alert('Connection lost. Please check your internet connection and rejoin the session.')
        }
      }
    )

    // Set up event listeners
    manager.on('emotion_result', (data: any) => {
      console.log('Emotion result:', data)
      handleEmotionData(data)
    })

    manager.on('pong', () => {
      console.log('Pong received - connection alive')
    })

    manager.on('focus_alert', () => {
      setShowFocusAlert(true)
      setTimeout(() => setShowFocusAlert(false), 5000)
    })

    manager.on('session_ended', () => {
      console.log('Session ended by teacher')
      alert('The teacher has ended the session.')
      handleLeaveSession()
    })

    manager.on('connected', (data: any) => {
      console.log('WebSocket connected:', data?.message || 'Connected')
    })

    manager.on('error', (data: any) => {
      console.error('WebSocket error from server:', data?.message)
    })

    // Connect
    manager.connect().then(() => {
      console.log('Connected to session WebSocket')
      console.log(`Session ID: ${currentSession.id}, Student: ${studentName}`)
    }).catch((error) => {
      console.error('Failed to connect WebSocket:', error)
    })

    setWsManager(manager)

    // Store message/error/close listeners so we can forward manager events to VideoFeed
    const messageListeners = new Set<(e: MessageEvent) => void>()
    const errorListeners = new Set<EventListenerOrEventListenerObject>()
    const closeListeners = new Set<EventListenerOrEventListenerObject>()

    // Forward emotion_result from manager to VideoFeed's message listeners
    const unsubEmotion = manager.on('emotion_result', (data: any) => {
      const payload = JSON.stringify({ type: 'emotion_result', data })
      const syntheticEvent = { data: payload } as MessageEvent
      messageListeners.forEach((fn) => fn(syntheticEvent))
    })
    const unsubError = manager.on('error', () => {
      errorListeners.forEach((fn) => {
        if (typeof fn === 'function') (fn as EventListener)(new Event('error'))
        else (fn as EventListenerObject).handleEvent(new Event('error'))
      })
    })
    const unsubClose = manager.on('connectionStateChange', ({ state }: { state: string }) => {
      if (state === 'disconnected' || state === 'closed') {
        closeListeners.forEach((fn) => {
          if (typeof fn === 'function') (fn as EventListener)(new Event('close'))
          else (fn as EventListenerObject).handleEvent(new Event('close'))
        })
      }
    })

    const unsubs: (() => void)[] = [unsubEmotion, unsubError, unsubClose]

    // Create a proxy WebSocket-like object for VideoFeed compatibility
    // This allows the VideoFeed component to send frames and receive emotion_result via our manager
    const wsProxy = {
      send: (data: string) => {
        try {
          const parsed = JSON.parse(data)
          manager.send(parsed)
        } catch {
          manager.send({ type: 'raw', data })
        }
      },
      close: () => manager.disconnect(),
      get readyState() {
        return manager.isConnected() ? WebSocket.OPEN : WebSocket.CLOSED
      },
      get OPEN() { return WebSocket.OPEN },
      get CLOSED() { return WebSocket.CLOSED },
      get CONNECTING() { return WebSocket.CONNECTING },
      get CLOSING() { return WebSocket.CLOSING },
      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        if (type === 'message') messageListeners.add(listener as (e: MessageEvent) => void)
        else if (type === 'error') errorListeners.add(listener)
        else if (type === 'close') closeListeners.add(listener)
      },
      removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        if (type === 'message') messageListeners.delete(listener as (e: MessageEvent) => void)
        else if (type === 'error') errorListeners.delete(listener)
        else if (type === 'close') closeListeners.delete(listener)
      }
    } as unknown as WebSocket

    setEmotionWebSocket(wsProxy)

    return () => {
      unsubs.forEach((unsub) => unsub())
      manager.disconnect()
      setWsManager(null)
      setEmotionWebSocket(null)
      setConnectionState('disconnected')
      setReconnectAttempt(null)
    }
  }, [isInSession, currentSession])

  const joinSession = async () => {
    if (!sessionCode.trim()) {
      alert('Please enter a session code')
      return
    }

    // Ensure camera permission before joining
    if (!cameraGranted) {
      setPendingJoin(true)
      setShowCameraModal(true)
      return
    }

    if (useMockData) {
      // Mock mode - simulate joining
      setCurrentSession({
        id: `mock_session_${Date.now()}`,
        sessionCode: sessionCode.toUpperCase(),
        teacherName: 'Prof. Anderson',
        subject: 'Advanced Mathematics',
        startTime: new Date(),
        isActive: true
      })
      setIsInSession(true)
      setSessionCode('')
      return
    }

    // Real mode - use backend
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
      const token = localStorage.getItem('access_token')
      
      const response = await fetch(`${apiUrl}/api/sessions/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_code: sessionCode.toUpperCase()
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to join session' }))
        throw new Error(errorData.detail || 'Failed to join session')
      }

      const session = await response.json()
      console.log('Joined session response:', session)
      
      // Extract session ID - handle both _id and id
      const sessionId = session._id || session.id
      if (!sessionId) {
        console.error('No session ID in response:', session)
        throw new Error('Invalid session response - missing ID')
      }
      
      setCurrentSession({
        id: sessionId,
        sessionCode: session.session_code,
        teacherName: session.teacher_name,
        subject: session.subject,
        startTime: new Date(session.started_at || session.created_at),
        isActive: session.is_active
      })
      setIsInSession(true)
      setSessionCode('')
      console.log('Session state updated, isInSession:', true)
    } catch (error: any) {
      console.error('Error joining session:', error)
      alert(error.message || 'Failed to join session. Please check the code and try again.')
    }
  }

  const handleLeaveSession = async () => {
    if (!currentSession) return

    // Mark that user is intentionally leaving to prevent auto-reconnect
    setIsLeavingSession(true)

    if (useMockData) {
      // Mock mode - close WebSocket first
      if (wsManager) {
        wsManager.disconnect()
        setWsManager(null)
      }
      setEmotionWebSocket(null)
      setIsInSession(false)
      setCurrentSession(null)
      setSessionDuration(0)
      setIsLeavingSession(false)
      setStats({
        currentEmotion: '',
        engagement: 'active',
        focusLevel: 100,
        engagementData: { active: 0, passive: 0, distracted: 0 },
        gazeData: { focused: 0, unfocused: 0 }
      })
      return
    }

    // Real mode - Call API FIRST to remove student from database
    // This ensures the teacher gets the correct count
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
      const token = localStorage.getItem('access_token')
      
      const response = await fetch(`${apiUrl}/api/sessions/${currentSession.id}/leave`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        console.error('Leave session API error:', await response.text())
      } else {
        console.log('Successfully left session via API')
      }
    } catch (error) {
      console.error('Error leaving session:', error)
    }

    // THEN close WebSocket (this will notify teacher via WebSocket)
    if (wsManager) {
      wsManager.disconnect()
      setWsManager(null)
    }
    setEmotionWebSocket(null)

    // Auto-save notes if any exist
    if (notes.trim()) {
      const shouldSave = confirm('Would you like to download your notes before leaving?')
      if (shouldSave) {
        downloadNotes()
      }
    }

    setIsInSession(false)
    setCurrentSession(null)
    setSessionDuration(0)
    setIsLeavingSession(false)
    setStats({
      currentEmotion: '',
      engagement: 'active',
      focusLevel: 100,
      engagementData: { active: 0, passive: 0, distracted: 0 },
      gazeData: { focused: 0, unfocused: 0 }
    })
  }

  const downloadNotes = () => {
    if (!notes.trim()) return
    
    const sessionInfo = currentSession ? `
Session: ${currentSession.subject}
Teacher: ${currentSession.teacherName}
Date: ${new Date().toLocaleDateString()}
Duration: ${formatDuration(sessionDuration)}

---

` : ''
    
    const fullContent = sessionInfo + notes
    const blob = new Blob([fullContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `session-notes-${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleEmotionDetected = (emotionData: { 
    emotion: string | null, 
    confidence: number, 
    engagement: 'active' | 'passive' | 'distracted', 
    focus_level: number, 
    face_detected: boolean,
    is_focused_gaze?: boolean,
    gaze_direction?: string 
  }) => {
    if (!emotionData.emotion) return
    
    // Update current gaze state
    if (emotionData.gaze_direction !== undefined) {
      setCurrentGazeDirection(emotionData.gaze_direction)
    }
    if (emotionData.is_focused_gaze !== undefined) {
      setIsCurrentlyFocusedGaze(emotionData.is_focused_gaze)
    }
    
    const emotion = emotionData.emotion
    setStats(prev => {
      const newStats = { 
        ...prev, 
        currentEmotion: emotion,
        engagement: emotionData.engagement, // Use backend's engagement calculation
        focusLevel: emotionData.focus_level // Use backend's focus level
      }
      
      // Don't increment here - let the timer handle it for accurate timing
      // Just update the current state
      
      // Track gaze focus data
      if (emotionData.is_focused_gaze !== undefined) {
        if (emotionData.is_focused_gaze) {
          newStats.gazeData.focused++
        } else {
          newStats.gazeData.unfocused++
        }
      }

      // Send update to backend
      if (currentSession) {
        sendStatsUpdate(newStats)
      }

      return newStats
    })
    
    // Track unfocus duration and show alert after 5 seconds of looking away
    const isUnfocused = emotionData.engagement === 'distracted' ||
                        emotionData.focus_level < 50 ||
                        emotionData.is_focused_gaze === false

    if (isUnfocused) {
      if (unfocusStartTime === null) {
        setUnfocusStartTime(Date.now())
        setUnfocusAlertShown(false)
      } else {
        const unfocusDuration = (Date.now() - unfocusStartTime) / 1000
        if (unfocusDuration >= 5 && !unfocusAlertShown) {
          setShowFocusAlert(true)
          setUnfocusAlertShown(true)
          setTimeout(() => setShowFocusAlert(false), 5000)
          alert('Please look back at the screen. You have been looking away for 5 seconds.')
        }
      }
    } else {
      setUnfocusStartTime(null)
      setUnfocusAlertShown(false)
    }
  }

  const handleEmotionData = (data: any) => {
    console.log('Received emotion data:', data)
    
    if (data.emotion) {
      // Update current gaze state
      if (data.gaze_direction !== undefined) {
        setCurrentGazeDirection(data.gaze_direction)
      }
      if (data.is_focused_gaze !== undefined) {
        setIsCurrentlyFocusedGaze(data.is_focused_gaze)
      }
      
      setStats(prev => {
        const newStats = { 
          ...prev, 
          currentEmotion: data.emotion,
          engagement: data.engagement || prev.engagement, // Use backend's engagement
          focusLevel: data.focus_level !== undefined ? data.focus_level : prev.focusLevel // Use backend's focus level
        }
        
        console.log('Updated stats:', newStats)
        console.log('Gaze - Direction:', data.gaze_direction, 'Focused:', data.is_focused_gaze)
        
        // Don't increment here - let the timer handle it for accurate timing
        // Just update the current state
        
        // Track gaze focus data
        if (data.is_focused_gaze !== undefined) {
          if (data.is_focused_gaze) {
            newStats.gazeData.focused++
          } else {
            newStats.gazeData.unfocused++
          }
        }

        return newStats
      })

      // Track unfocus duration and show alert after 5 seconds of looking away
      const isUnfocused = data.engagement === 'distracted' ||
                          (data.focus_level && data.focus_level < 50) ||
                          data.is_focused_gaze === false

      if (isUnfocused) {
        if (unfocusStartTime === null) {
          setUnfocusStartTime(Date.now())
          setUnfocusAlertShown(false)
        } else {
          const unfocusDuration = (Date.now() - unfocusStartTime) / 1000
          if (unfocusDuration >= 5 && !unfocusAlertShown) {
            setShowFocusAlert(true)
            setUnfocusAlertShown(true)
            setTimeout(() => setShowFocusAlert(false), 5000)
            alert('Please look back at the screen. You have been looking away for 5 seconds.')
          }
        }
      } else {
        setUnfocusStartTime(null)
        setUnfocusAlertShown(false)
      }
    }
  }

  const sendStatsUpdate = async (updatedStats: StudentStats) => {
    // Stats are sent via WebSocket in real-time, no need for additional API call
    // The WebSocket already updates the database with emotion, engagement, and focus data
    // This function is kept for backward compatibility but does nothing
    return
  }

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getEngagementColor = (engagement: string) => {
    switch (engagement) {
      case 'active': return 'text-success-600'
      case 'passive': return 'text-warning-600'
      case 'distracted': return 'text-danger-600'
      default: return 'text-gray-600'
    }
  }

  const getEngagementIcon = (engagement: string) => {
    switch (engagement) {
      case 'active': return <TrendingUp className="w-5 h-5" />
      case 'passive': return <Clock className="w-5 h-5" />
      case 'distracted': return <AlertCircle className="w-5 h-5" />
      default: return <Brain className="w-5 h-5" />
    }
  }

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      'happy': 'bg-green-100 text-green-800 border border-green-300',
      'focused': 'bg-blue-100 text-blue-800 border border-blue-300',
      'neutral': 'bg-gray-100 text-gray-800 border border-gray-300',
      'calm': 'bg-blue-100 text-blue-800 border border-blue-300',
      'surprised': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      'sad': 'bg-purple-100 text-purple-800 border border-purple-300',
      'angry': 'bg-red-100 text-red-800 border border-red-300',
      'fearful': 'bg-orange-100 text-orange-800 border border-orange-300',
      'disgusted': 'bg-pink-100 text-pink-800 border border-pink-300'
    }
    return colors[emotion.toLowerCase()] || 'bg-gray-100 text-gray-800 border border-gray-300'
  }

  const getEmotionEmoji = (emotion: string) => {
    const emojis: Record<string, string> = {
      'happy': '😊',
      'focused': '🎯',
      'neutral': '😐',
      'calm': '😌',
      'surprised': '😮',
      'sad': '😢',
      'angry': '😠',
      'fearful': '😨',
      'disgusted': '🤢'
    }
    return emojis[emotion.toLowerCase()] || '🙂'
  }

  return (
    <div className="min-h-screen bg-primary-900 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Welcome, {studentName}</p>
              {/* <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">DEMO MODE</span> */}
            </div>
            <div className="flex items-center space-x-3">
              {/* Back to Home button removed - use Navbar instead */}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isInSession && currentSession ? (
          /* In Session View */
          <div className="max-w-6xl mx-auto">
            {/* Session Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    {/* Connection Status Indicator */}
                    {connectionState === 'connected' ? (
                      <>
                        <div className="w-3 h-3 bg-success-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-success-600">Connected</span>
                      </>
                    ) : connectionState === 'reconnecting' ? (
                      <>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-yellow-600">
                          Reconnecting{reconnectAttempt ? ` (${reconnectAttempt.current}/${reconnectAttempt.max})` : '...'}
                        </span>
                      </>
                    ) : connectionState === 'connecting' ? (
                      <>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-blue-600">Connecting...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium text-red-600">Disconnected</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentSession.subject}</h2>
                  <p className="text-gray-600 dark:text-gray-400">Teacher: {currentSession.teacherName}</p>
                </div>
                <div className="text-right space-y-3">
                  {/* Real-time Emotion Display */}
                  {stats.currentEmotion && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your Current Emotion</p>
                      <div className={`px-4 py-2 rounded-lg font-semibold text-center ${getEmotionColor(stats.currentEmotion)}`}>
                        <span className="text-2xl mr-2">{getEmotionEmoji(stats.currentEmotion)}</span>
                        <span className="capitalize">{stats.currentEmotion}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Session Duration</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{formatDuration(sessionDuration)}</p>
                  </div>
                  <button onClick={handleLeaveSession} className="btn btn-danger w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Session
                  </button>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Teacher Video Feed / Live Stream */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Teacher: {currentSession.teacherName}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 rounded-full font-medium flex items-center">
                        {isWatchingStream ? (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                            Live
                          </>
                        ) : (
                          <>Session: {currentSession.sessionCode}</>
                        )}
                      </span>
                      {agoraConfigValid && !isWatchingStream && (
                        <button
                          onClick={() => setIsWatchingStream(true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Join Live Stream
                        </button>
                      )}
                      {!isWatchingStream && (
                        <button
                          onClick={() => setIsTeacherVideoFullscreen(true)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Fullscreen"
                        >
                          <Maximize className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    {isWatchingStream ? (
                      <InteractiveLiveStreaming
                        sessionId={`session_${currentSession.sessionCode}`}
                        appId={agoraConfig.appId}
                        userId={studentName}
                        userName={studentName}
                        isHost={false}
                        onCallEnd={() => setIsWatchingStream(false)}
                      />
                    ) : (
                      <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700">
                        <div className="text-center text-white">
                          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-semibold">Teacher Camera</p>
                          {agoraConfigValid ? (
                            <>
                              <p className="text-sm opacity-75 mt-2">Click &quot;Join Live Stream&quot; to watch</p>
                              <div className="mt-4 flex items-center justify-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-xs">Stream Available</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm opacity-75 mt-2">Waiting for teacher to start streaming</p>
                              <div className="mt-4 flex items-center justify-center space-x-2">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                <span className="text-xs">Connected</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Student Video Feed */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                      <Eye className="w-5 h-5 mr-2" />
                      Your Camera Feed
                    </h3>
                    <div className="flex items-center gap-2">
                      {stats.currentEmotion && (
                        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium ${getEmotionColor(stats.currentEmotion)}`}>
                          <span className="text-lg">{getEmotionEmoji(stats.currentEmotion)}</span>
                          <span className="capitalize">{stats.currentEmotion}</span>
                        </div>
                      )}
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getEngagementColor(stats.engagement)}`}>
                        {getEngagementIcon(stats.engagement)}
                        <span className="capitalize">{stats.engagement}</span>
                      </div>
                    </div>
                  </div>
                  <div className="max-w-sm">
                    <VideoFeed 
                      isActive={isInSession}
                      websocket={emotionWebSocket}
                      onEmotionDetected={handleEmotionDetected}
                    />
                  </div>
                </div>

                {/* Learning Notes */}
                <Notepad notes={notes} onNotesChange={setNotes} />
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Engagement Analytics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Engagement Analytics</h3>
                  <EngagementIndicator
                    engagement={stats.engagementData}
                    currentLevel={stats.engagement}
                    currentEmotion={stats.currentEmotion}
                  />
                </div>

                {/* Real-time Status */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Brain className="w-5 h-5 mr-2" />
                    Real-time Status
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Current Emotion:</span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {stats.currentEmotion || 'Detecting...'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Engagement:</span>
                      <span className={`font-medium capitalize ${getEngagementColor(stats.engagement)}`}>
                        {stats.engagement}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Focus Level:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{stats.focusLevel}%</span>
                    </div>
                    
                    {/* Gaze Focus Status */}
                    <div className="flex items-center justify-between pt-2 border-t dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        Gaze Focus:
                      </span>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            isCurrentlyFocusedGaze
                              ? 'bg-green-500 animate-pulse' 
                              : 'bg-orange-500'
                          }`}></div>
                          <span className={`font-medium text-sm ${
                            isCurrentlyFocusedGaze
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-orange-600 dark:text-orange-400'
                          }`}>
                            {isCurrentlyFocusedGaze ? 'On Screen' : 'Looking Away'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Direction: {currentGazeDirection}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t dark:border-gray-700">
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
                          <span className="font-medium dark:text-white">{stats.focusLevel}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              stats.focusLevel >= 70 ? 'bg-success-600' : 
                              stats.focusLevel >= 40 ? 'bg-warning-600' : 'bg-danger-600'
                            }`}
                            style={{ width: `${stats.focusLevel}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Gaze Focus Progress */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Screen Focus</span>
                          <span>
                            {stats.gazeData.focused + stats.gazeData.unfocused > 0
                              ? Math.round((stats.gazeData.focused / (stats.gazeData.focused + stats.gazeData.unfocused)) * 100)
                              : 100}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full transition-all bg-blue-500"
                            style={{ 
                              width: `${
                                stats.gazeData.focused + stats.gazeData.unfocused > 0
                                  ? (stats.gazeData.focused / (stats.gazeData.focused + stats.gazeData.unfocused)) * 100
                                  : 100
                              }%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Engagement Tips */}
                <div className="bg-gradient-to-br from-primary-50 to-success-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💡 Tips for Better Engagement</h3>
                  <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      <span>Maintain eye contact with the camera</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      <span>Take short breaks when needed</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      <span>Stay in a well-lit environment</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      <span>Minimize distractions around you</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Join Session View */
          <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogIn className="w-8 h-8 text-success-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Join a Session</h2>
                <p className="text-gray-600 dark:text-gray-400">Enter the code provided by your teacher</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Session Code
                  </label>
                  <input
                    type="text"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && joinSession()}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="w-full px-4 py-3 text-center text-2xl font-bold tracking-wider border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-success-500 focus:border-transparent uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <button
                  onClick={joinSession}
                  disabled={sessionCode.length < 6}
                  className="w-full btn btn-success py-3 text-lg"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Join Session
                </button>
              </div>

              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> Make sure you have a working camera and are in a well-lit environment for accurate emotion detection.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Teacher Video Modal */}
      <AnimatePresence>
        {isTeacherVideoFullscreen && currentSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
            onClick={() => setIsTeacherVideoFullscreen(false)}
          >
            <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-6">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6" />
                    <div>
                      <h3 className="text-xl font-semibold">{currentSession.teacherName}</h3>
                      <p className="text-sm opacity-75">{currentSession.subject}</p>
                    </div>
                    <span className="ml-4 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-sm flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                      Live
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsTeacherVideoFullscreen(false)}
                      className="p-3 hover:bg-white/10 rounded-lg transition-colors"
                      title="Exit Fullscreen"
                    >
                      <Minimize className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setIsTeacherVideoFullscreen(false)}
                      className="p-3 hover:bg-white/10 rounded-lg transition-colors"
                      title="Close"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Video Content */}
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700">
                <div className="text-center text-white">
                  <Users className="w-24 h-24 mx-auto mb-6 opacity-50" />
                  <p className="text-2xl font-semibold mb-2">Teacher Camera - Fullscreen</p>
                  <p className="text-lg opacity-75 mb-4">Teacher video feed will appear here</p>
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Connected</span>
                  </div>
                  <p className="mt-8 text-sm opacity-60">Press ESC or click the × button to exit fullscreen</p>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-white text-sm">
                    <span className="opacity-75">Duration:</span>
                    <span className="ml-2 font-mono font-semibold">{formatDuration(sessionDuration)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus Alert */}
      {showFocusAlert && (
        <FocusAlert 
          onClose={() => setShowFocusAlert(false)}
        />
      )}

      {/* Camera Permission Modal */}
      <CameraPermissionModal
        show={showCameraModal}
        context="to track your engagement during the session"
        onResolved={(granted) => {
          setShowCameraModal(false)
          setCameraGranted(granted)
          if (granted && pendingJoin) {
            setPendingJoin(false)
            // Re-trigger join now that camera is granted
            joinSession()
          } else {
            setPendingJoin(false)
          }
        }}
      />
    </div>
  )
}
