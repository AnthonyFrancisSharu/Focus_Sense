'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Play, Camera, Brain, Eye, FileText } from 'lucide-react'

interface WelcomeScreenProps {
  onStartSession: (learnerName: string) => void
}

export default function WelcomeScreen({ onStartSession }: WelcomeScreenProps) {
  const [learnerName, setLearnerName] = useState('')
  const [isStarting, setIsStarting] = useState(false)

  const handleStartSession = async () => {
    if (!learnerName.trim()) return
    
    setIsStarting(true)
    // Simulate a brief loading state
    await new Promise(resolve => setTimeout(resolve, 1000))
    onStartSession(learnerName.trim())
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <Brain className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to the Learning Analytics System
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Start your learning session and let AI monitor your engagement in real-time 
          using facial emotion recognition and gaze tracking.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white rounded-2xl shadow-xl p-8 mb-8"
      >
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <User className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Enter Your Name
            </h2>
            <p className="text-gray-600">
              This will be used to personalize your learning session and reports.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="learnerName" className="block text-sm font-medium text-gray-700 mb-2">
                Learner Name
              </label>
              <input
                id="learnerName"
                type="text"
                value={learnerName}
                onChange={(e) => setLearnerName(e.target.value)}
                placeholder="Enter your full name"
                className="input w-full"
                onKeyPress={(e) => e.key === 'Enter' && handleStartSession()}
                disabled={isStarting}
              />
            </div>

            <button
              onClick={handleStartSession}
              disabled={!learnerName.trim() || isStarting}
              className="btn btn-primary w-full py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Starting Session...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Play className="w-5 h-5 mr-2" />
                  Start Learning Session
                </div>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Features Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid md:grid-cols-3 gap-6"
      >
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
            <Camera className="w-6 h-6 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Real-time Monitoring
          </h3>
          <p className="text-gray-600 text-sm">
            Your webcam will capture facial expressions for emotion analysis throughout the session.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mb-4">
            <Eye className="w-6 h-6 text-success-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Gaze Tracking
          </h3>
          <p className="text-gray-600 text-sm">
            Eye movement tracking with smart intervals to monitor your attention and focus.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-warning-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Smart Reports
          </h3>
          <p className="text-gray-600 text-sm">
            Get detailed PDF reports with engagement analytics and personalized insights.
          </p>
        </div>
      </motion.div>

      {/* Privacy Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900">Privacy & Data Protection</h4>
            <p className="text-sm text-blue-700 mt-1">
              All facial data is processed locally and never stored. Your privacy is our priority. 
              The system only analyzes expressions for engagement tracking and generates anonymous reports.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
