'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, ShieldCheck, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react'

export type CameraPermissionStatus = 'unknown' | 'checking' | 'granted' | 'denied' | 'dismissed' | 'error'

interface CameraPermissionModalProps {
  /** When true the modal is shown */
  show: boolean
  /** Called after the user grants permission or dismisses the modal */
  onResolved: (granted: boolean) => void
  /** Optional: context message e.g. "to join this session" */
  context?: string
}

/**
 * Request camera permission from the browser with a friendly UI.
 * Returns current permission status without showing any UI.
 */
export async function checkCameraPermission(): Promise<CameraPermissionStatus> {
  try {
    // Modern Permissions API check (Chrome, Edge)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
        if (result.state === 'granted') return 'granted'
        if (result.state === 'denied') return 'denied'
        return 'unknown' // 'prompt' means not yet decided
      } catch {
        // Firefox doesn't support camera in permissions.query
      }
    }
    // Fallback: try enumerateDevices to see if labels are available (indicates granted)
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter(d => d.kind === 'videoinput')
    if (cameras.length === 0) return 'error' // no camera at all
    if (cameras.some(d => d.label)) return 'granted' // labels only available when granted
    return 'unknown'
  } catch {
    return 'error'
  }
}

/**
 * Actually request camera access via getUserMedia.
 * Stops the stream immediately — we only need the permission.
 */
export async function requestCameraAccess(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    })
    // Immediately release
    stream.getTracks().forEach(t => t.stop())
    return true
  } catch {
    return false
  }
}

export default function CameraPermissionModal({ show, onResolved, context }: CameraPermissionModalProps) {
  const [status, setStatus] = useState<CameraPermissionStatus>('unknown')
  const [requesting, setRequesting] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setStatus('checking')
      checkCameraPermission().then(s => {
        setStatus(s)
        // If already granted, auto-resolve after a brief flash
        if (s === 'granted') {
          setTimeout(() => onResolved(true), 800)
        }
      })
    }
  }, [show])

  const handleAllowCamera = useCallback(async () => {
    setRequesting(true)
    setStatus('checking')
    const granted = await requestCameraAccess()
    setStatus(granted ? 'granted' : 'denied')
    setRequesting(false)
    if (granted) {
      // Brief success animation then resolve
      setTimeout(() => onResolved(true), 800)
    }
  }, [onResolved])

  const handleDismiss = useCallback(() => {
    setStatus('dismissed')
    onResolved(false)
  }, [onResolved])

  if (!show) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header Banner */}
          <div className={`px-6 py-8 text-center transition-colors duration-300 ${
            status === 'granted'
              ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : status === 'denied' || status === 'error'
              ? 'bg-gradient-to-br from-red-500 to-rose-600'
              : 'bg-gradient-to-br from-primary-500 to-primary-700'
          }`}>
            <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
              {status === 'granted' ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>
              ) : status === 'denied' || status === 'error' ? (
                <CameraOff className="w-10 h-10 text-white" />
              ) : status === 'checking' || requesting ? (
                <RefreshCw className="w-10 h-10 text-white animate-spin" />
              ) : (
                <Camera className="w-10 h-10 text-white" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {status === 'granted'
                ? 'Camera Access Granted!'
                : status === 'denied'
                ? 'Camera Access Blocked'
                : status === 'error'
                ? 'No Camera Detected'
                : 'Camera Access Required'}
            </h2>
            <p className="text-white/80 text-sm">
              {status === 'granted'
                ? 'You\'re all set — your camera is ready.'
                : status === 'denied'
                ? 'Permission was denied by your browser.'
                : status === 'error'
                ? 'We couldn\'t find a camera on your device.'
                : context
                ? `Camera is needed ${context}`
                : 'This system uses your camera for emotion and engagement tracking.'}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {/* Prompt / Unknown state */}
            {(status === 'unknown' || status === 'checking') && !requesting && status !== 'checking' && (
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Your video is processed in <strong>real-time</strong> for emotion detection and is never recorded or stored.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Camera className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      A well-lit environment with your face clearly visible gives the best results.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleAllowCamera}
                  className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Allow Camera Access
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full mt-3 py-2.5 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                >
                  Skip for now
                </button>
              </>
            )}

            {/* Checking spinner */}
            {(status === 'checking' || requesting) && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {requesting ? 'Your browser will ask for camera permission…' : 'Checking camera status…'}
                </p>
              </div>
            )}

            {/* Granted — auto-closing */}
            {status === 'granted' && (
              <div className="text-center py-2">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Redirecting…
                </p>
              </div>
            )}

            {/* Denied */}
            {status === 'denied' && (
              <>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-300">
                      <p className="font-semibold mb-1">How to enable camera:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Click the <strong>camera/lock icon</strong> in your browser&apos;s address bar</li>
                        <li>Set Camera to <strong>Allow</strong></li>
                        <li>Refresh the page</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAllowCamera}
                  className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full mt-3 py-2.5 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                >
                  Continue without camera
                </button>
              </>
            )}

            {/* Error — no camera found */}
            {status === 'error' && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
                  Ensure a webcam is connected and not used by another application, then try again.
                </p>
                <button
                  onClick={handleAllowCamera}
                  className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full mt-3 py-2.5 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                >
                  Continue without camera
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
