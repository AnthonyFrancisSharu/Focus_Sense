'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { User, LogOut, Settings, LayoutDashboard, ChevronDown, KeyRound, Bell, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  if (!user) return null

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const getRoleColor = () => {
    switch (user.role) {
      case 'admin':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'teacher':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
      case 'student':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <nav className={`${user.role === 'teacher' || user.role === 'student' || user.role === 'admin' ? 'bg-primary-100' : 'bg-white'} dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 transition-colors duration-200`}>
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={`/${user.role}/dashboard`} className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div className="hidden md:block">
              <span className="font-bold text-gray-900 dark:text-white text-lg">Learning Analytics</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1 capitalize">{user.role} Portal</p>
            </div>
          </Link>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Role Badge */}
            <div className={`hidden sm:flex px-3 py-1.5 text-xs font-semibold rounded-full ${getRoleColor()} capitalize items-center space-x-1`}>
              <span className="w-2 h-2 bg-current rounded-full animate-pulse"></span>
              <span>{user.role}</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>

            {/* Notifications Button */}
            <Link href="/notifications">
              <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </Link>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
              >
                {/* Avatar */}
                <div className="relative">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white font-semibold text-sm">
                        {getInitials(user.name)}
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                </div>

                {/* User Info */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>

                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl py-2 z-50 border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User Info in Dropdown */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>
                    <div className={`inline-flex items-center mt-2 px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor()}`}>
                      {user.role}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      href="/profile"
                      className={`flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        pathname === '/profile' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium' : ''
                      }`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <User className="w-4 h-4" />
                      <div>
                        <p className="font-medium">My Profile</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">View and edit profile</p>
                      </div>
                    </Link>

                    {/* Reports & Analytics - Only for teachers and admins */}
                    {(user.role === 'teacher' || user.role === 'admin') && (
                      <Link
                        href={`/${user.role}/reports`}
                        className={`flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          pathname.includes('/reports') ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium' : ''
                        }`}
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <div>
                          <p className="font-medium">Reports & Analytics</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">View performance reports</p>
                        </div>
                      </Link>
                    )}

                    <Link
                      href="/settings"
                      className={`flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        pathname === '/settings' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium' : ''
                      }`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Settings</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Preferences & privacy</p>
                      </div>
                    </Link>

                    <Link
                      href="/change-password"
                      className={`flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        pathname === '/change-password' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium' : ''
                      }`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <KeyRound className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Change Password</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Update your password</p>
                      </div>
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        logout()
                      }}
                      className="flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Logout</p>
                        <p className="text-xs text-red-500 dark:text-red-400">Sign out of your account</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
