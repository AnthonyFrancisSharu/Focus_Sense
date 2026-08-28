'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, AuthContextType, LoginCredentials, SignupCredentials } from '@/types/auth'
import { authApi } from '@/lib/api'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('access_token')
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser)
        // Validate that the user object has required fields (accept both _id and id)
        const userId = parsedUser._id || parsedUser.id
        if (parsedUser && userId && parsedUser.email && parsedUser.name && parsedUser.role) {
          setUser({
            id: userId,
            email: parsedUser.email,
            name: parsedUser.name,
            role: parsedUser.role,
            avatar: parsedUser.avatar,
            phone: parsedUser.phone,
            location: parsedUser.location,
            bio: parsedUser.bio,
            title: parsedUser.title,
            department: parsedUser.department,
            createdAt: new Date(parsedUser.created_at || parsedUser.createdAt || Date.now()),
            lastLogin: parsedUser.last_login ? new Date(parsedUser.last_login) : undefined,
          })
        } else {
          // Invalid user data, clear it
          console.error('Invalid user data in localStorage - missing required fields')
          localStorage.removeItem('user')
          localStorage.removeItem('access_token')
        }
      } catch (error) {
        console.error('Failed to parse stored user:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('access_token')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    try {
      // Call real API
      const response = await authApi.login(credentials.email, credentials.password)
      
      // Transform user data to match our User type
      const loggedInUser: User = {
        id: response.user._id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        avatar: response.user.avatar,
        phone: response.user.phone,
        location: response.user.location,
        bio: response.user.bio,
        title: response.user.title,
        department: response.user.department,
        createdAt: new Date(response.user.created_at),
        lastLogin: response.user.last_login ? new Date(response.user.last_login) : undefined,
      }

      setUser(loggedInUser)

      // Redirect based on role
      switch (loggedInUser.role) {
        case 'admin':
          router.push('/admin/dashboard')
          break
        case 'teacher':
          router.push('/teacher/dashboard')
          break
        case 'student':
          router.push('/student/dashboard')
          break
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (credentials: SignupCredentials) => {
    setIsLoading(true)
    try {
      // Validate passwords match
      if (credentials.password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      // Call real API
      const response = await authApi.signup(
        credentials.email,
        credentials.password,
        credentials.name,
        credentials.role
      )

      // Transform user data to match our User type
      const newUser: User = {
        id: response.user._id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        avatar: response.user.avatar,
        phone: response.user.phone,
        location: response.user.location,
        bio: response.user.bio,
        title: response.user.title,
        department: response.user.department,
        createdAt: new Date(response.user.created_at),
        lastLogin: response.user.last_login ? new Date(response.user.last_login) : undefined,
      }

      setUser(newUser)

      // Redirect based on role
      switch (newUser.role) {
        case 'admin':
          router.push('/admin/dashboard')
          break
        case 'teacher':
          router.push('/teacher/dashboard')
          break
        case 'student':
          router.push('/student/dashboard')
          break
      }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    authApi.logout()
    setUser(null)
    router.push('/login')
  }

  const updateProfile = async (data: Partial<User>) => {
    setIsLoading(true)
    try {
      if (!user) throw new Error('No user logged in')

      // Call real API
      const updatedUserData = await authApi.updateProfile(data)
      
      const updatedUser: User = {
        id: updatedUserData._id,
        email: updatedUserData.email,
        name: updatedUserData.name,
        role: updatedUserData.role,
        avatar: updatedUserData.avatar,
        phone: updatedUserData.phone,
        location: updatedUserData.location,
        bio: updatedUserData.bio,
        title: updatedUserData.title,
        department: updatedUserData.department,
        createdAt: new Date(updatedUserData.created_at),
        lastLogin: updatedUserData.last_login ? new Date(updatedUserData.last_login) : undefined,
      }
      
      setUser(updatedUser)
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
