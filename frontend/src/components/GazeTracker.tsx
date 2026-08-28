'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff, Focus, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface GazeTrackerProps {
  gazeData: {
    focused: number
    unfocused: number
  }
  isActive: boolean
}

export default function GazeTracker({ gazeData, isActive }: GazeTrackerProps) {
  const totalChecks = gazeData.focused + gazeData.unfocused
  const focusPercentage = totalChecks > 0 ? (gazeData.focused / totalChecks) * 100 : 0
  
  // Generate sample data for the focus trend chart
  const focusTrendData = Array.from({ length: 10 }, (_, i) => ({
    time: `${i * 8}min`,
    focus: Math.max(0, Math.min(100, focusPercentage + (Math.random() - 0.5) * 20))
  }))

  const getFocusStatus = () => {
    if (focusPercentage >= 80) return { status: 'excellent', color: 'text-success-600', bg: 'bg-success-50' }
    if (focusPercentage >= 60) return { status: 'good', color: 'text-warning-600', bg: 'bg-warning-50' }
    return { status: 'needs improvement', color: 'text-danger-600', bg: 'bg-danger-50' }
  }

  const focusStatus = getFocusStatus()

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Gaze Tracking
        </h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${focusStatus.bg} ${focusStatus.color}`}>
          {focusPercentage >= 60 ? (
            <Focus className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{focusStatus.status}</span>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Focus Statistics */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Focus Statistics</h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Focus Score:</span>
              <span className={`font-bold text-lg ${focusStatus.color}`}>
                {focusPercentage.toFixed(1)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className={`h-3 rounded-full ${
                  focusPercentage >= 80 ? 'bg-success-600' :
                  focusPercentage >= 60 ? 'bg-warning-600' : 'bg-danger-600'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${focusPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-success-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <Eye className="w-5 h-5 text-success-600" />
                </div>
                <div className="text-2xl font-bold text-success-600">{gazeData.focused}</div>
                <div className="text-sm text-gray-600">Focused</div>
              </div>
              
              <div className="text-center p-3 bg-danger-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <EyeOff className="w-5 h-5 text-danger-600" />
                </div>
                <div className="text-2xl font-bold text-danger-600">{gazeData.unfocused}</div>
                <div className="text-sm text-gray-600">Unfocused</div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>• Gaze tracking checks every 8 minutes</p>
              <p>• Alert shown if unfocused for 8+ minutes</p>
              <p>• Focus score calculated from attention data</p>
            </div>
          </div>
        </div>

        {/* Focus Trend Chart */}
        {/* <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Focus Trend</h4>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={focusTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value.toFixed(1)}%`, 'Focus']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="focus" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Focus percentage over time (simulated data)
          </div>
        </div> */}
      </div>

      {/* Focus Alerts */}
      {focusPercentage < 60 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-warning-50 border border-warning-200 rounded-lg"
        >
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-warning-600 mr-2" />
            <div>
              <h5 className="font-medium text-warning-800">Focus Alert</h5>
              <p className="text-sm text-warning-700">
                Your focus level is below 60%. Consider taking a break or adjusting your learning environment.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Session Status */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-600">Tracking Status:</span>
        <span className={`font-medium ${isActive ? 'text-success-600' : 'text-gray-500'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  )
}
