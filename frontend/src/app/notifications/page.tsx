'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Filter, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Clock,
  User,
  Calendar,
  BookOpen,
  Users,
  Settings as SettingsIcon,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { notificationApi } from '@/lib/api';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  category: 'system' | 'session' | 'user' | 'achievement';
  sessionCode?: string;
  sessionId?: string;
  action?: {
    label: string;
    url: string;
  };
}

function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'system' | 'session' | 'user' | 'achievement'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert API notification to our interface
  const convertNotification = (apiNotif: any): Notification => {
    // Use category from API if available, otherwise determine from content
    let category: 'system' | 'session' | 'user' | 'achievement' = apiNotif.category || 'system';
    
    if (!apiNotif.category) {
      const titleLower = (apiNotif.title || '').toLowerCase();
      const messageLower = (apiNotif.message || '').toLowerCase();
      
      if (titleLower.includes('session') || messageLower.includes('session') || messageLower.includes('code:')) {
        category = 'session';
      } else if (titleLower.includes('profile') || titleLower.includes('user') || messageLower.includes('profile')) {
        category = 'user';
      } else if (titleLower.includes('achievement') || titleLower.includes('badge')) {
        category = 'achievement';
      }
    }
    
    // Build action from API data
    let action = undefined;
    if (apiNotif.action_url && apiNotif.action_label) {
      action = {
        label: apiNotif.action_label,
        url: apiNotif.action_url
      };
    }
    
    return {
      id: apiNotif._id || apiNotif.id,
      type: apiNotif.type || 'info',
      title: apiNotif.title,
      message: apiNotif.message,
      timestamp: new Date(apiNotif.created_at || Date.now()),
      read: apiNotif.read || false,
      category: category,
      sessionCode: apiNotif.session_code,
      sessionId: apiNotif.session_id,
      action: action,
    };
  };

  // Get default notifications based on role when no API notifications exist
  const getDefaultNotifications = (): Notification[] => {
    const baseNotifications: Notification[] = [
      {
        id: 'welcome-1',
        type: 'info',
        title: 'Welcome to Learning Analytics',
        message: 'Start by exploring your dashboard and joining or creating sessions.',
        timestamp: new Date(),
        read: false,
        category: 'system',
      },
    ];

    if (user?.role === 'teacher') {
      return [
        ...baseNotifications,
        {
          id: 'teacher-tip-1',
          type: 'info',
          title: 'Create Your First Session',
          message: 'Go to your dashboard to create a learning session and get started with emotion tracking.',
          timestamp: new Date(),
          read: false,
          category: 'session',
          action: {
            label: 'Go to Dashboard',
            url: '/teacher/dashboard',
          },
        },
      ];
    }

    if (user?.role === 'student') {
      return [
        ...baseNotifications,
        {
          id: 'student-tip-1',
          type: 'info',
          title: 'Join a Session',
          message: 'Enter a session code on your dashboard to join a learning session.',
          timestamp: new Date(),
          read: false,
          category: 'session',
          action: {
            label: 'Go to Dashboard',
            url: '/student/dashboard',
          },
        },
      ];
    }

    return baseNotifications;
  };

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationApi.getNotifications(0, 50, false);
      
      if (Array.isArray(data) && data.length > 0) {
        setNotifications(data.map(convertNotification));
      } else {
        // Use default notifications when no API notifications exist
        setNotifications(getDefaultNotifications());
      }
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      // Fall back to default notifications on error
      setNotifications(getDefaultNotifications());
      setError(null); // Don't show error to user, just use defaults
    } finally {
      setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationBgColor = (type: string, read: boolean) => {
    const opacity = read ? '50' : '100';
    switch (type) {
      case 'success':
        return `bg-green-${opacity}`;
      case 'warning':
        return `bg-yellow-${opacity}`;
      case 'error':
        return `bg-red-${opacity}`;
      default:
        return `bg-blue-${opacity}`;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system':
        return <SettingsIcon className="w-4 h-4" />;
      case 'session':
        return <BookOpen className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
      case 'achievement':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const markAsRead = async (id: string) => {
    try {
      // Only call API if it's not a default notification (starts with 'welcome-' or similar)
      if (!id.startsWith('welcome-') && !id.startsWith('teacher-tip-') && !id.startsWith('student-tip-')) {
        await notificationApi.markAsRead(id);
      }
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Update locally anyway
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      // Update locally anyway
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // Only call API if it's not a default notification
      if (!id.startsWith('welcome-') && !id.startsWith('teacher-tip-') && !id.startsWith('student-tip-')) {
        await notificationApi.deleteNotification(id);
      }
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
      // Still remove locally
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const filteredNotifications = notifications.filter(notif => {
    const matchesReadFilter =
      filter === 'all' ||
      (filter === 'unread' && !notif.read) ||
      (filter === 'read' && notif.read);
    
    const matchesCategoryFilter =
      categoryFilter === 'all' || notif.category === categoryFilter;
    
    return matchesReadFilter && matchesCategoryFilter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* Back to Dashboard Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => router.push(`/${user?.role}/dashboard`)}
            className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </motion.button>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <Bell className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchNotifications}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
              {unreadCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark All Read
                </motion.button>
              )}
              {notifications.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearAll}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </motion.button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              {/* Read Status Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <div className="flex gap-2">
                  {['all', 'unread', 'read'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f as any)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        filter === f
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="system">System</option>
                  <option value="session">Session</option>
                  <option value="user">User</option>
                  <option value="achievement">Achievement</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-4">
            <AnimatePresence>
              {filteredNotifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center"
                >
                  <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Notifications</h3>
                  <p className="text-gray-600 dark:text-gray-400">You're all caught up! No notifications to show.</p>
                </motion.div>
              ) : (
                filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden ${
                      !notification.read ? 'border-l-4 border-primary-600' : ''
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`p-3 rounded-full ${
                          notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                          notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                          notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                {notification.title}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  {getCategoryIcon(notification.category)}
                                  {notification.category.charAt(0).toUpperCase() + notification.category.slice(1)}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {getTimeAgo(notification.timestamp)}
                                </span>
                              </div>
                            </div>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primary-600 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-3">{notification.message}</p>

                          {/* Session Code Display */}
                          {notification.sessionCode && (
                            <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-lg p-3 mb-3">
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Session Code:</p>
                              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 font-mono tracking-wider">
                                {notification.sessionCode}
                              </p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(notification.sessionCode!);
                                }}
                                className="mt-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                              >
                                📋 Copy Code
                              </button>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {notification.action && (
                              <button
                                onClick={() => router.push(notification.action!.url)}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                              >
                                {notification.action.label}
                              </button>
                            )}
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                              >
                                Mark as Read
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete notification"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}

export default NotificationsPage;
