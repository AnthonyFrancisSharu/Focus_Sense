'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import { BookOpen, GraduationCap, Users, Shield, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to finish loading
    // Auto-redirect can be disabled by setting NEXT_PUBLIC_AUTO_REDIRECT=false
    if (
      process.env.NEXT_PUBLIC_AUTO_REDIRECT !== 'false' &&
      !isLoading &&
      isAuthenticated &&
      user &&
      user.role
    ) {
      // Use replace so landing page isn't kept in history
      router.replace(`/${user.role}/dashboard`)
    }
  }, [isAuthenticated, user, router, isLoading])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl mb-16"
        >
          {/* Background photo (lightly blurred) */}
          <div
            className="absolute inset-0 bg-cover bg-center blur-[2px] scale-110"
            style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
          />
          {/* Soft blue wash for text contrast */}
          <div className="absolute inset-0 bg-primary-50/70" />

          <div className="relative z-10 text-center py-16 px-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-primary-600" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Real-Time Learning Analytics System
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              AI-powered emotion recognition and engagement tracking for enhanced learning experiences.
              Monitor student attention, analyze engagement patterns, and optimize teaching strategies in real-time.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/get-started"
                className="px-8 py-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2 font-semibold"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/signup"
                className="px-8 py-4 border-2 border-primary-600 text-primary-600 rounded-xl hover:bg-primary-50 transition-all flex items-center space-x-2 font-semibold"
              >
                <span>Create Account</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-primary-100 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-200"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">For Students</h3>
            <p className="text-gray-600 mb-4">
              Join live sessions, track your engagement, and receive personalized feedback to enhance your learning experience.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                Real-time engagement tracking
              </li>
              <li className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                Focus level monitoring
              </li>
              <li className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                Session notes & recordings
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-primary-100 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-200"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <GraduationCap className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">For Teachers</h3>
            <p className="text-gray-600 mb-4">
              Create sessions, monitor student engagement in real-time, and access detailed analytics to improve teaching effectiveness.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                Live session management
              </li>
              <li className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                Student analytics dashboard
              </li>
              <li className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                Performance reports
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-primary-100 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-200"
          >
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">For Admins</h3>
            <p className="text-gray-600 mb-4">
              Manage users, monitor system-wide analytics, and configure platform settings to ensure smooth operations.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-green-600" />
                User management
              </li>
              <li className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-green-600" />
                System analytics
              </li>
              <li className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-green-600" />
                Platform configuration
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Key Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-primary-100 rounded-2xl shadow-lg p-12 text-center"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Powered by Advanced AI Technology</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Our platform uses cutting-edge facial emotion recognition and eye-tracking technology to provide 
            real-time insights into student engagement and learning effectiveness.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">98%</div>
              <div className="text-sm text-gray-600">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">&lt;100ms</div>
              <div className="text-sm text-gray-600">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">24/7</div>
              <div className="text-sm text-gray-600">Availability</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">Secure</div>
              <div className="text-sm text-gray-600">Data Protection</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2026 Real-Time Learning Analytics System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
