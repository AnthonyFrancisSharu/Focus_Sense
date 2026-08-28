'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, X, Eye, Focus } from 'lucide-react'

interface FocusAlertProps {
  onClose: () => void
}

export default function FocusAlert({ onClose }: FocusAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Alert Modal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Alert Content */}
        <div className="text-center">
          <div className="w-16 h-16 bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-warning-600" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            You are losing focus
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Our gaze tracking has detected that you haven't been focused on the screen 
            for more than 8 minutes. Consider taking a break or refocusing on your learning.
          </p>

          {/* Focus Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center">
              <Focus className="w-4 h-4 mr-2" />
              Focus Tips:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• Take a 5-minute break to refresh your mind</li>
              <li>• Adjust your seating position and lighting</li>
              <li>• Close distracting applications or tabs</li>
              <li>• Consider using the notepad to stay engaged</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="btn btn-primary flex-1 py-2"
            >
              <Eye className="w-4 h-4 mr-2" />
              I'll refocus
            </button>
            
            <button
              onClick={onClose}
              className="btn btn-secondary flex-1 py-2"
            >
              Take a break
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
