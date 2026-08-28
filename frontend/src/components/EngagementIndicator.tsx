'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface EngagementIndicatorProps {
  engagement: {
    active: number
    passive: number
    distracted: number
  }
  currentLevel: 'active' | 'passive' | 'distracted'
  currentEmotion: string
}

export default function EngagementIndicator({ 
  engagement, 
  currentLevel, 
  currentEmotion 
}: EngagementIndicatorProps) {
  const total = engagement.active + engagement.passive + engagement.distracted
  const activePercentage = total > 0 ? (engagement.active / total) * 100 : 0
  const passivePercentage = total > 0 ? (engagement.passive / total) * 100 : 0
  const distractedPercentage = total > 0 ? (engagement.distracted / total) * 100 : 0

  const pieData = [
    { name: 'Active', value: engagement.active, color: '#22c55e' },
    { name: 'Passive', value: engagement.passive, color: '#f59e0b' },
    { name: 'Distracted', value: engagement.distracted, color: '#ef4444' }
  ]

  const barData = [
    { level: 'Active', seconds: engagement.active, color: '#22c55e' },
    { level: 'Passive', seconds: engagement.passive, color: '#f59e0b' },
    { level: 'Distracted', seconds: engagement.distracted, color: '#ef4444' }
  ]

  const getEngagementIcon = (level: string) => {
    switch (level) {
      case 'active': return <CheckCircle className="w-5 h-5 text-success-600" />
      case 'passive': return <Clock className="w-5 h-5 text-warning-600" />
      case 'distracted': return <AlertTriangle className="w-5 h-5 text-danger-600" />
      default: return <TrendingUp className="w-5 h-5 text-gray-600" />
    }
  }

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'active': return 'text-success-600 bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-800'
      case 'passive': return 'text-warning-600 bg-warning-50 dark:bg-warning-900/30 border-warning-200 dark:border-warning-800'
      case 'distracted': return 'text-danger-600 bg-danger-50 dark:bg-danger-900/30 border-danger-200 dark:border-danger-800'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Engagement Analytics
        </h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getEngagementColor(currentLevel)}`}>
          {getEngagementIcon(currentLevel)}
          <span className="capitalize">{currentLevel}</span>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Current Status */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Current Status</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Current Emotion:</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">
                {currentEmotion || 'Detecting...'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Engagement Level:</span>
              <span className={`font-medium capitalize ${getEngagementColor(currentLevel).split(' ')[0]}`}>
                {currentLevel}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Time:</span>
              <span className="font-medium dark:text-white">{Math.floor(total / 60)}m {total % 60}s</span>
            </div>
          </div>

          {/* Engagement Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm dark:text-gray-300">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success-600" />
                <span>Active</span>
              </div>
              <span className="font-medium">{Math.floor(engagement.active / 60)}m {engagement.active % 60}s ({activePercentage.toFixed(1)}%)</span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-success-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${activePercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm dark:text-gray-300">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-warning-600" />
                <span>Passive</span>
              </div>
              <span className="font-medium">{Math.floor(engagement.passive / 60)}m {engagement.passive % 60}s ({passivePercentage.toFixed(1)}%)</span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-warning-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${passivePercentage}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm dark:text-gray-300">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-danger-600" />
                <span>Distracted</span>
              </div>
              <span className="font-medium">{Math.floor(engagement.distracted / 60)}m {engagement.distracted % 60}s ({distractedPercentage.toFixed(1)}%)</span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-danger-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${distractedPercentage}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
          </div>
        </div>

        {/* Visual Charts */}
        {/* <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Engagement Distribution</h4>
          

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} min`, 'Duration']} />
              </PieChart>
            </ResponsiveContainer>
          </div>


          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} min`, 'Duration']} />
                <Bar dataKey="minutes" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div> */}
      </div>
    </div>
  )
}
