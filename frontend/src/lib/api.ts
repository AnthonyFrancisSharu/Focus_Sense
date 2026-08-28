// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

// Helper function to handle API errors
const handleApiError = async (response: Response, skipAuthRedirect = false) => {
  if (!response.ok) {
    // Handle 401 Unauthorized - token expired or invalid.
    // Skip for the auth endpoints themselves (login/signup/password reset),
    // where a 401 just means "wrong credentials", not "session expired".
    if (response.status === 401 && !skipAuthRedirect) {
      // Clear stored auth data
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login?expired=true'
      }
    }
    
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
    throw new Error(error.detail || error.message || 'API request failed')
  }
  return response.json()
}

// Auth API
export const authApi = {
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await handleApiError(response, true)
    
    // Store token and user
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
    }
    
    return data
  },

  async signup(email: string, password: string, name: string, role: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role }),
    })
    const data = await handleApiError(response, true)
    
    // Store token and user
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
    }
    
    return data
  },

  async getMe() {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async updateProfile(data: any) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    const updatedUser = await handleApiError(response)
    localStorage.setItem('user', JSON.stringify(updatedUser))
    return updatedUser
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        current_password: currentPassword, 
        new_password: newPassword 
      }),
    })
    return handleApiError(response)
  },

  logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  },

  async forgotPassword(email: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    return handleApiError(response, true)
  },

  async resetPassword(email: string, resetCode: string, newPassword: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        reset_code: resetCode, 
        new_password: newPassword
      }),
    })
    return handleApiError(response, true)
  }
}

// Session API
export const sessionApi = {
  async createSession(subject: string, maxStudents: number = 30) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ subject, max_students: maxStudents }),
    })
    return handleApiError(response)
  },

  async startSession(sessionId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async endSession(sessionId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getTeacherSessions() {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/teacher`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getActiveTeacherSession() {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/teacher/active`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async joinSession(sessionCode: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/join`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ session_code: sessionCode }),
    })
    return handleApiError(response)
  },

  async leaveSession(sessionId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/leave`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getStudentSessions() {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/student`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getActiveStudentSession() {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/student/active`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getSession(sessionId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async updateEngagement(sessionId: string, studentId: string, data: any) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/engagement`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        student_id: studentId,
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        ...data
      }),
    })
    return handleApiError(response)
  },

  async deleteSession(sessionId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async restartSession(sessionId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/restart`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  }
}

// Admin API
export const adminApi = {
  async getAllUsers(skip: number = 0, limit: number = 100) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/admin/users?skip=${skip}&limit=${limit}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getUsersByRole(role: string, skip: number = 0, limit: number = 100) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/admin/users/role/${role}?skip=${skip}&limit=${limit}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async deleteUser(userId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async updateUserRole(userId: string, newRole: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ new_role: newRole }),
    })
    return handleApiError(response)
  },

  async getAllSessions(skip: number = 0, limit: number = 100) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/admin/sessions?skip=${skip}&limit=${limit}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getActiveSessions() {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/admin/sessions/active`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async deleteSession(sessionId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/admin/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getSystemStats() {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getSessionEngagement(sessionId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/admin/engagement/${sessionId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  }
}

// Notification API
export const notificationApi = {
  async getNotifications(skip: number = 0, limit: number = 50, unreadOnly: boolean = false) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(
      `${API_BASE_URL}/api/notifications/?skip=${skip}&limit=${limit}&unread_only=${unreadOnly}`, 
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
      }
    )
    return handleApiError(response)
  },

  async markAsRead(notificationId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async markAllAsRead() {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getUnreadCount() {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async deleteNotification(notificationId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async broadcastNotification(data: {
    title: string
    message: string
    type?: 'info' | 'warning' | 'error' | 'success'
    category?: 'system' | 'session' | 'user' | 'achievement'
    session_id?: string
    session_code?: string
    action_url?: string
    action_label?: string
    target_role?: 'student' | 'teacher' | 'all'
  }) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/notifications/broadcast`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    return handleApiError(response)
  },

  async notifySessionStarted(sessionId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/notifications/session/${sessionId}/notify`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  }
}

// Reports API
export const reportsApi = {
  async getSessionReport(sessionId: string) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/reports/session/${sessionId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getTeacherSummary(days: number = 30) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/reports/teacher/summary?days=${days}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async getStudentSummary(days: number = 30) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/reports/student/summary?days=${days}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  async exportSessionReport(sessionId: string, format: 'json' | 'csv' | 'pdf' = 'json') {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/reports/session/${sessionId}/export?format=${format}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })

    if (format === 'csv' || format === 'pdf') {
      const blob = await response.blob()
      return blob
    }

    return handleApiError(response)
  },

  async exportTeacherSummary(days: number = 30, format: 'json' | 'pdf' = 'json') {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/reports/teacher/summary/export?days=${days}&format=${format}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })

    if (format === 'pdf') {
      const blob = await response.blob()
      return blob
    }

    return handleApiError(response)
  },

  async exportStudentSummary(days: number = 30, format: 'json' | 'pdf' = 'json') {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/reports/student/summary/export?days=${days}&format=${format}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })

    if (format === 'pdf') {
      const blob = await response.blob()
      return blob
    }

    return handleApiError(response)
  },

  async getAdminOverview(days: number = 30) {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    const response = await fetch(`${API_BASE_URL}/api/reports/admin/overview?days=${days}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    })
    return handleApiError(response)
  },

  downloadCSV(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }
}

export { API_BASE_URL }
