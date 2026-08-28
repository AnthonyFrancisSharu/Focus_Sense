'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, Pause } from 'lucide-react'

interface SessionTimerProps {
  startTime: Date
  isActive: boolean
}

export default function SessionTimer({ startTime, isActive }: SessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, isActive])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        {isActive ? (
          <Play className="w-4 h-4 text-success-600" />
        ) : (
          <Pause className="w-4 h-4 text-warning-600" />
        )}
        <Clock className="w-4 h-4 text-gray-600" />
      </div>
      
      <div className="text-right">
        <div className="text-lg font-mono font-semibold text-gray-900">
          {formatTime(elapsedTime)}
        </div>
        <div className="text-xs text-gray-500">
          {isActive ? 'Session Active' : 'Session Paused'}
        </div>
      </div>
    </div>
  )
}
