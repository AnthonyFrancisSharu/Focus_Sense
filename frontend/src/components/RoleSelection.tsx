'use client'

import { motion } from 'framer-motion'
import { Users, GraduationCap, BookOpen, BarChart3 } from 'lucide-react'

interface RoleSelectionProps {
  onSelectRole: (role: 'teacher' | 'student') => void
}

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-primary-50">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl mb-12"
        >
          {/* Background photo (lightly blurred) */}
          <div
            className="absolute inset-0 bg-cover bg-center blur-[2px] scale-110"
            style={{ backgroundImage: "url('/images/hero-bg1.jpg')" }}
          />
          {/* Soft blue wash for text contrast */}
          <div className="absolute inset-0 bg-primary-50/70" />

          <div className="relative z-10 text-center py-16 px-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-primary-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Real-Time Learning Analytics System
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              AI-powered emotion recognition and engagement tracking for enhanced learning experiences
            </p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Teacher Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelectRole('teacher')}
            className="cursor-pointer"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary-400">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <GraduationCap className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                I'm a Teacher
              </h2>
              <p className="text-gray-600 mb-6 text-center">
                Create and manage live learning sessions, monitor student engagement in real-time, 
                and download detailed analytics reports.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mr-3"></div>
                  Create live sessions
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mr-3"></div>
                  Monitor multiple students
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mr-3"></div>
                  Download analytics reports
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mr-3"></div>
                  Real-time engagement tracking
                </div>
              </div>

              <button className="w-full mt-6 btn btn-primary py-3">
                Continue as Teacher
              </button>
            </div>
          </motion.div>

          {/* Student Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onSelectRole('student')}
            className="cursor-pointer"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all border-2 border-transparent hover:border-success-400">
              <div className="w-16 h-16 bg-success-100 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <Users className="w-8 h-8 text-success-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                I'm a Student
              </h2>
              <p className="text-gray-600 mb-6 text-center">
                Join live learning sessions, receive real-time feedback on your engagement, 
                and improve your focus during study sessions.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-success-600 rounded-full mr-3"></div>
                  Join live sessions
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-success-600 rounded-full mr-3"></div>
                  Real-time engagement feedback
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-success-600 rounded-full mr-3"></div>
                  Focus alerts and reminders
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-success-600 rounded-full mr-3"></div>
                  Personal progress tracking
                </div>
              </div>

              <button className="w-full mt-6 btn btn-success py-3">
                Continue as Student
              </button>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Powered by Advanced AI Technology
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Emotion Recognition</h4>
              <p className="text-sm text-gray-600">
                Real-time facial emotion analysis using advanced AI models
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Gaze Tracking</h4>
              <p className="text-sm text-gray-600">
                Monitor attention and focus patterns throughout sessions
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Analytics Dashboard</h4>
              <p className="text-sm text-gray-600">
                Comprehensive reports and insights for better learning outcomes
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
