'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'

interface VideoFeedProps {
  isActive: boolean
  websocket?: WebSocket | null
  onEmotionDetected?: (emotionData: EmotionData) => void
  height?: string
}

interface EmotionData {
  emotion: string | null
  raw_emotion?: string
  confidence: number
  engagement: 'active' | 'passive' | 'distracted'
  focus_level: number
  face_detected: boolean
  is_focused_gaze?: boolean
  gaze_direction?: string
  eye_openness?: number
  wearing_glasses?: boolean
  face_distance?: number
  lighting_quality?: number
  pose?: {
    yaw: number
    pitch: number
    roll: number
  }
}

export default function VideoFeed({ isActive, websocket, onEmotionDetected, height = 'h-40' }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(0)
  const [faceDetected, setFaceDetected] = useState<boolean>(false)
  const [gazeDirection, setGazeDirection] = useState<string>('CENTER')
  const [isFocusedGaze, setIsFocusedGaze] = useState<boolean>(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamReady, setStreamReady] = useState(false)

  useEffect(() => {
    if (isActive) {
      startVideoStream()
    } else {
      stopVideoStream()
    }

    return () => {
      stopVideoStream()
    }
  }, [isActive])

  // Ensure stream is attached to video when ref becomes available (e.g. after mount)
  useEffect(() => {
    if (!isActive || !streamRef.current || !videoRef.current || !streamReady) return
    if (videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch((e) => console.warn('Video play:', e))
    }
  }, [isActive, streamReady])

  // Handle WebSocket emotion results
  useEffect(() => {
    if (!websocket) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'emotion_result') {
          const emotionData: EmotionData = data.data
          
          // Debug log to see what we're receiving
          console.log('Emotion result received:', {
            emotion: emotionData.emotion,
            is_focused_gaze: emotionData.is_focused_gaze,
            gaze_direction: emotionData.gaze_direction,
            eye_openness: emotionData.eye_openness
          })
          
          setCurrentEmotion(emotionData.emotion)
          setConfidence(emotionData.confidence)
          setFaceDetected(emotionData.face_detected)
          setGazeDirection(emotionData.gaze_direction || 'CENTER')
          
          // Only set to true if explicitly true, otherwise false
          if (emotionData.is_focused_gaze !== undefined) {
            setIsFocusedGaze(emotionData.is_focused_gaze)
          }
          
          setError(null) // Clear any errors
          onEmotionDetected?.(emotionData)
        } else if (data.type === 'error') {
          console.error('Backend error:', data.message)
          setError(data.message)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
        setError('Failed to process emotion data')
      }
    }

    const handleError = (event: Event) => {
      console.error('WebSocket error:', event)
      setError('Connection error')
    }

    const handleClose = () => {
      console.log('WebSocket closed')
      setError('Connection closed')
    }

    websocket.addEventListener('message', handleMessage)
    websocket.addEventListener('error', handleError)
    websocket.addEventListener('close', handleClose)

    return () => {
      websocket.removeEventListener('message', handleMessage)
      websocket.removeEventListener('error', handleError)
      websocket.removeEventListener('close', handleClose)
    }
  }, [websocket, onEmotionDetected])

  // Send video frames to backend (start when stream is ready so video element has data)
  useEffect(() => {
    if (!isActive || !websocket || !streamReady) {
      return
    }

    setIsProcessing(true)
    // Send frames every 500ms (2 FPS) to avoid overwhelming the backend
    frameIntervalRef.current = setInterval(() => {
      captureAndSendFrame()
    }, 500)

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current)
        frameIntervalRef.current = null
      }
      setIsProcessing(false)
    }
  }, [isActive, websocket, streamReady])

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !websocket) {
      console.log('Missing dependencies:', { 
        video: !!videoRef.current, 
        canvas: !!canvasRef.current, 
        websocket: !!websocket 
      })
      return
    }
    
    if (websocket.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not open, state:', websocket.readyState)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.log('Video not ready:', { 
        context: !!context, 
        videoReadyState: video.readyState,
        expectedState: video.HAVE_ENOUGH_DATA 
      })
      return
    }

    try {
      // Draw current video frame to canvas
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert canvas to base64 JPEG
      const base64Image = canvas.toDataURL('image/jpeg', 0.8)

      // Send to backend via WebSocket
      const message = {
        type: 'video_frame',
        frame: base64Image,
        timestamp: new Date().toISOString()
      }
      
      websocket.send(JSON.stringify(message))
      console.log('Frame sent to backend via WebSocket')
    } catch (error) {
      console.error('Error capturing/sending frame:', error)
    }
  }

  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      })

      streamRef.current = stream
      setStreamReady(true)
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch((e) => console.warn('Video autoplay:', e))
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setError('Unable to access camera. Please ensure camera permissions are granted.')
    }
  }

  const stopVideoStream = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setCurrentEmotion(null)
    setConfidence(0)
    setFaceDetected(false)
    setIsProcessing(false)
    setStreamReady(false)
  }

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      {isActive ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full ${height} object-cover`}
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </>
      ) : (
        <div className={`w-full ${height} flex items-center justify-center bg-gray-100`}>
          <div className="text-center">
            <CameraOff className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Camera inactive</p>
            <p className="text-sm text-gray-400">Start session to begin monitoring</p>
          </div>
        </div>
      )}
      
      {/* Overlay indicators */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
          isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          <Camera className="w-3 h-3" />
          <span>{isActive ? 'Live' : 'Off'}</span>
        </div>
        
        {/* Face detection indicator */}
        {isActive && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            faceDetected 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              faceDetected ? 'bg-blue-600' : 'bg-yellow-600 animate-pulse'
            }`}></div>
            <span>{faceDetected ? 'Face Detected' : 'No Face'}</span>
          </div>
        )}
        
        {/* Gaze Focus Indicator */}
        {isActive && faceDetected && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            isFocusedGaze 
              ? 'bg-green-100 text-green-800' 
              : 'bg-orange-100 text-orange-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isFocusedGaze ? 'bg-green-600' : 'bg-orange-600 animate-pulse'
            }`}></div>
            <span>{isFocusedGaze ? 'Focused' : `Looking ${gazeDirection}`}</span>
          </div>
        )}
        
        {/* Emotion indicator */}
        {isActive && currentEmotion && faceDetected && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            <span className="capitalize">{currentEmotion}</span>
            {confidence > 0 && (
              <span className="text-[10px] opacity-75">({Math.round(confidence * 100)}%)</span>
            )}
          </div>
        )}
        
        {/* Processing indicator */}
        {isActive && isProcessing && !error && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
            <span>AI Processing</span>
          </div>
        )}
        
        {/* Error indicator */}
        {error && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
            <span>{error}</span>
          </div>
        )}
      </div>
      
      {/* Recording indicator */}
      {/* {isActive && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span>Recording</span>
          </div>
        </div>
      )} */}
    </div>
  )
}
