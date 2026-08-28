'use client'

import { useState, useEffect, useRef } from 'react'
import { AgoraClient, getAgoraToken } from '@/lib/agora'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react'
import { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng'

interface AgoraVideoCallProps {
  sessionId: string
  userId: string
  userName: string
  isTeacher?: boolean
  onCallEnd?: () => void
}

export default function AgoraVideoCall({ 
  sessionId, 
  userId, 
  userName, 
  isTeacher = false,
  onCallEnd 
}: AgoraVideoCallProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const agoraClientRef = useRef<AgoraClient | null>(null)
  const localVideoRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initializeCall()

    return () => {
      cleanupCall()
    }
  }, [sessionId])

  // Update remote users list
  useEffect(() => {
    if (!isConnected || !agoraClientRef.current) return

    const interval = setInterval(() => {
      const users = agoraClientRef.current?.getRemoteUsers() || []
      setRemoteUsers(users)
    }, 1000)

    return () => clearInterval(interval)
  }, [isConnected])

  const initializeCall = async () => {
    try {
      setError(null)
      
      // Get Agora token from backend
      const config = await getAgoraToken(sessionId, parseInt(userId) || 0)
      
      if (!config) {
        throw new Error('Failed to get Agora token. Please check your Agora configuration.')
      }

      // Create and join Agora client
      const client = new AgoraClient()
      agoraClientRef.current = client

      await client.join(config)

      // Play local video
      if (localVideoRef.current) {
        client.playLocalVideo(localVideoRef.current.id)
      }

      setIsConnected(true)
    } catch (err: any) {
      console.error('Failed to initialize Agora call:', err)
      setError(err.message || 'Failed to start video call')
    }
  }

  const cleanupCall = async () => {
    if (agoraClientRef.current) {
      await agoraClientRef.current.leave()
      agoraClientRef.current = null
    }
    setIsConnected(false)
    setRemoteUsers([])
  }

  const toggleAudio = async () => {
    if (!agoraClientRef.current) return

    const newState = !isAudioEnabled
    await agoraClientRef.current.toggleAudio(newState)
    setIsAudioEnabled(newState)
  }

  const toggleVideo = async () => {
    if (!agoraClientRef.current) return

    const newState = !isVideoEnabled
    await agoraClientRef.current.toggleVideo(newState)
    setIsVideoEnabled(newState)
  }

  const handleEndCall = async () => {
    await cleanupCall()
    onCallEnd?.()
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-semibold mb-2">Video Call Error</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={initializeCall}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative bg-gray-900 rounded-lg overflow-hidden">
      {/* Video Grid */}
      <div className={`grid gap-2 p-4 ${
        remoteUsers.length === 0 ? 'grid-cols-1' :
        remoteUsers.length === 1 ? 'grid-cols-2' :
        remoteUsers.length <= 4 ? 'grid-cols-2 grid-rows-2' :
        'grid-cols-3 grid-rows-2'
      }`}>
        {/* Local Video */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <div 
            id="local-video" 
            ref={localVideoRef}
            className="w-full h-full"
          />
          <div className="absolute bottom-2 left-2 px-3 py-1 bg-black bg-opacity-70 text-white text-sm rounded-full">
            {userName} (You)
          </div>
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Remote Videos */}
        {remoteUsers.map((user) => (
          <RemoteVideo key={user.uid} user={user} />
        ))}

        {/* Placeholder for empty slots */}
        {remoteUsers.length === 0 && (
          <div className="bg-gray-800 rounded-lg aspect-video flex items-center justify-center">
            <p className="text-gray-400">Waiting for others to join...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black bg-opacity-80 px-6 py-3 rounded-full">
        {/* Audio Toggle */}
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            isAudioEnabled 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${
            isVideoEnabled 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white">Connecting to video call...</p>
          </div>
        </div>
      )}

      {/* Participant Count */}
      <div className="absolute top-4 right-4 px-3 py-1 bg-black bg-opacity-70 text-white text-sm rounded-full">
        {remoteUsers.length + 1} participant{remoteUsers.length !== 0 ? 's' : ''}
      </div>
    </div>
  )
}

// Remote Video Component
function RemoteVideo({ user }: { user: IAgoraRTCRemoteUser }) {
  const videoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user.videoTrack && videoRef.current) {
      user.videoTrack.play(videoRef.current)
    }

    return () => {
      if (user.videoTrack) {
        user.videoTrack.stop()
      }
    }
  }, [user])

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
      <div ref={videoRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 px-3 py-1 bg-black bg-opacity-70 text-white text-sm rounded-full">
        User {user.uid}
      </div>
      {!user.hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <VideoOff className="w-12 h-12 text-gray-400" />
        </div>
      )}
    </div>
  )
}
