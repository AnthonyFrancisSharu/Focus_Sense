'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Square, 
  Camera, 
  Eye, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Brain,
  Focus,
  BookOpen
} from 'lucide-react'
import { SessionData } from '@/app/page'
import VideoFeed from './VideoFeed'
import EngagementIndicator from './EngagementIndicator'
import GazeTracker from './GazeTracker'
import Notepad from './Notepad'
import SessionTimer from './SessionTimer'
import FocusAlert from './FocusAlert'

interface LearningSessionProps {
  sessionData: SessionData
  onEndSession: (sessionData: SessionData) => void
  onUpdateSession: (sessionData: SessionData) => void
}

export default function LearningSession({ 
  sessionData, 
  onEndSession, 
  onUpdateSession 
}: LearningSessionProps) {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState<string>('')
  const [engagementLevel, setEngagementLevel] = useState<'active' | 'passive' | 'distracted'>('active')
  const [showFocusAlert, setShowFocusAlert] = useState(false)
  const [sessionNotes, setSessionNotes] = useState('')
  const [gazeData, setGazeData] = useState({ focused: 0, unfocused: 0 })
  
  const sessionStartTime = useRef<Date>(new Date())
  const lastGazeCheck = useRef<Date>(new Date())
  const focusAlertShown = useRef<boolean>(false)

  // Handle emotion detection from VideoFeed
  const handleEmotionDetection = async (emotion: string) => {
    setCurrentEmotion(emotion)
    updateEngagementLevel(emotion)
    
    // Send emotion data to backend if session is active
    if (isSessionActive && sessionData.id) {
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
        await fetch(`${apiUrl}/sessions/${sessionData.id}/emotion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emotion: emotion,
            confidence: 0.8, // Default confidence
            timestamp: new Date().toISOString()
          })
        })
      } catch (error) {
        console.error('Error sending emotion data to backend:', error)
      }
    }
  }

  // Gaze tracking with 8-minute intervals
  useEffect(() => {
    if (!isSessionActive) return

    const interval = setInterval(() => {
      const now = new Date()
      const timeSinceLastCheck = (now.getTime() - lastGazeCheck.current.getTime()) / (1000 * 60)
      
      if (timeSinceLastCheck >= 8) {
        checkGazeFocus()
        lastGazeCheck.current = now
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [isSessionActive])

  const updateEngagementLevel = (emotion: string) => {
    // Map emotions to engagement levels
    const emotionMap: { [key: string]: 'active' | 'passive' | 'distracted' } = {
      'happy': 'active',
      'neutral': 'passive',
      'sad': 'distracted',
      'angry': 'distracted',
      'fearful': 'distracted',
      'surprised': 'passive',
      'disgusted': 'distracted',
      // Handle legacy emotions
      'excited': 'active',
      'focused': 'active',
      'calm': 'passive'
    }

    const level = emotionMap[emotion.toLowerCase()] || 'passive'
    setEngagementLevel(level)
    
    // Update session data
    const updatedSession = { ...sessionData }
    updatedSession.engagement[level]++
    onUpdateSession(updatedSession)
  }

  const checkGazeFocus = () => {
    // Simulate gaze tracking - in real implementation, this would use eye tracking
    const isFocused = Math.random() > 0.3 // 70% chance of being focused
    
    if (!isFocused && !focusAlertShown.current) {
      setShowFocusAlert(true)
      focusAlertShown.current = true
      
      // Hide alert after 5 seconds
      setTimeout(() => {
        setShowFocusAlert(false)
        focusAlertShown.current = false
      }, 5000)
    }

    // Update gaze data
    const newGazeData = { ...gazeData }
    if (isFocused) {
      newGazeData.focused++
    } else {
      newGazeData.unfocused++
    }
    setGazeData(newGazeData)

    // Update session data
    const updatedSession = { ...sessionData }
    updatedSession.gazeTracking = newGazeData
    onUpdateSession(updatedSession)
  }

  const startSession = () => {
    setIsSessionActive(true)
    sessionStartTime.current = new Date()
    lastGazeCheck.current = new Date()
  }

  const pauseSession = () => {
    setIsSessionActive(false)
  }

  const endSession = () => {
    const finalSessionData = {
      ...sessionData,
      notes: sessionNotes,
      endTime: new Date(),
      engagement: sessionData.engagement,
      gazeTracking: gazeData
    }
    onEndSession(finalSessionData)
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
      case 'active': return <CheckCircle className="w-5 h-5" />
      case 'passive': return <Clock className="w-5 h-5" />
      case 'distracted': return <AlertTriangle className="w-5 h-5" />
      default: return <Brain className="w-5 h-5" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Session Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Learning Session: {sessionData.learnerName}
            </h2>
            <p className="text-gray-600">
              {isSessionActive ? 'Session Active' : 'Session Paused'}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <SessionTimer 
              startTime={sessionStartTime.current}
              isActive={isSessionActive}
            />
            
            <div className="flex space-x-2">
              {!isSessionActive ? (
                <button
                  onClick={startSession}
                  className="btn btn-success px-4 py-2"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </button>
              ) : (
                <button
                  onClick={pauseSession}
                  className="btn btn-warning px-4 py-2"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </button>
              )}
              
              <button
                onClick={endSession}
                className="btn btn-danger px-4 py-2"
              >
                <Square className="w-4 h-4 mr-2" />
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Learning Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Feed */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Camera className="w-5 h-5 mr-2" />
                Live Video Feed
              </h3>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getEngagementColor(engagementLevel)}`}>
                {getEngagementIcon(engagementLevel)}
                <span className="capitalize">{engagementLevel}</span>
              </div>
            </div>
            
            <VideoFeed 
              isActive={isSessionActive} 
              onEmotionDetected={handleEmotionDetection}
            />
          </div>

          {/* Engagement Analytics */}
          <EngagementIndicator 
            engagement={sessionData.engagement}
            currentLevel={engagementLevel}
            currentEmotion={currentEmotion}
          />

          {/* Gaze Tracking */}
          <GazeTracker 
            gazeData={gazeData}
            isActive={isSessionActive}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Real-time Status */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Real-time Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Emotion:</span>
                <span className="font-medium text-gray-900 capitalize">
                  {currentEmotion || 'Detecting...'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Engagement Level:</span>
                <span className={`font-medium capitalize ${getEngagementColor(engagementLevel)}`}>
                  {engagementLevel}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Session Status:</span>
                <span className={`font-medium ${isSessionActive ? 'text-success-600' : 'text-warning-600'}`}>
                  {isSessionActive ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
          </div>

          {/* Notepad */}
          <Notepad 
            notes={sessionNotes}
            onNotesChange={setSessionNotes}
          />

          {/* Quick Stats */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Session Stats
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Time:</span>
                <span className="font-medium">{sessionData.engagement.active} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Passive Time:</span>
                <span className="font-medium">{sessionData.engagement.passive} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Distracted Time:</span>
                <span className="font-medium">{sessionData.engagement.distracted} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Focus Score:</span>
                <span className="font-medium">
                  {gazeData.focused + gazeData.unfocused > 0 
                    ? Math.round((gazeData.focused / (gazeData.focused + gazeData.unfocused)) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Focus Alert */}
      <AnimatePresence>
        {showFocusAlert && (
          <FocusAlert onClose={() => setShowFocusAlert(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
