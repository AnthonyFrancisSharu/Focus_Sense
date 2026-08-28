'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  Activity,
  UserCheck,
  UserX,
  Clock,
  BarChart3,
  Settings,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/api'

interface UserData {
  id: string
  name: string
  email: string
  role: 'teacher' | 'student' | 'admin'
  status: 'active' | 'inactive'
  lastLogin: Date
  sessionsCount: number
  createdAt: Date
}

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalSessions: number
  avgEngagement: number
  teachersCount: number
  studentsCount: number
  adminsCount: number
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'teacher' | 'student' | 'admin'>('all')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalSessions: 0,
    avgEngagement: 0,
    teachersCount: 0,
    studentsCount: 0,
    adminsCount: 0,
  })

  const [users, setUsers] = useState<UserData[]>([])

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch system stats
      const statsData = await adminApi.getSystemStats()
      setStats({
        totalUsers: statsData.total_users || 0,
        activeUsers: statsData.total_users || 0, // Assume all users are active
        totalSessions: statsData.total_sessions || 0,
        avgEngagement: 75, // Default value
        teachersCount: statsData.total_teachers || 0,
        studentsCount: statsData.total_students || 0,
        adminsCount: statsData.total_admins || 0,
      })

      // Fetch all users
      const usersData = await adminApi.getAllUsers(0, 100)
      const formattedUsers = usersData.map((u: any) => ({
        id: u._id || u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: 'active' as const,
        lastLogin: new Date(u.last_login || u.created_at),
        sessionsCount: 0,
        createdAt: new Date(u.created_at),
      }))
      setUsers(formattedUsers)

    } catch (err: any) {
      console.error('Failed to fetch admin data:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData()
    }
  }, [user, fetchData])

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push('/login')
      }
    }
  }, [user, authLoading, router])

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await adminApi.deleteUser(userId)
        setUsers(users.filter(u => u.id !== userId))
      } catch (err: any) {
        setError('Failed to delete user: ' + (err.message || 'Unknown error'))
      }
    }
  }

  const handleToggleUserStatus = (userId: string) => {
    setUsers(users.map(u => 
      u.id === userId 
        ? { ...u, status: u.status === 'active' ? 'inactive' as const : 'active' as const }
        : u
    ))
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      trend: '+12%',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: UserCheck,
      color: 'bg-green-500',
      trend: '+8%',
    },
    {
      title: 'Total Sessions',
      value: stats.totalSessions,
      icon: Activity,
      color: 'bg-purple-500',
      trend: '+24%',
    },
    {
      title: 'Avg Engagement',
      value: `${stats.avgEngagement}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      trend: '+5%',
    },
  ]

  if (!user || user.role !== 'admin') {
    return null
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-primary-900 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">System Management & Analytics</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
                <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-green-600">{stat.trend}</span>
                </div>
                <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Role Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <GraduationCap className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Teachers</h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.teachersCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Active educators</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Students</h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.studentsCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Enrolled learners</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admins</h3>
            </div>
            <p className="text-4xl font-bold text-gray-900 dark:text-white">{stats.adminsCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">System administrators</p>
          </motion.div>
        </div>

        {/* User Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage all system users</p>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={fetchData}
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="mt-4 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Roles</option>
                <option value="teacher">Teachers</option>
                <option value="student">Students</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        user.role === 'teacher' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.sessionsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.lastLogin.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleUserStatus(user.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {user.status === 'active' ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                        </button>
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  )
}
