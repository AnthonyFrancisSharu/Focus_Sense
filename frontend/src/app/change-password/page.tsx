'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Check, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { authApi } from '@/lib/api';

function ChangePasswordPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    color: ''
  });

  const validatePasswordStrength = (password: string) => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    let label = '';
    let color = '';

    if (score <= 2) {
      label = 'Weak';
      color = 'bg-red-500';
    } else if (score <= 4) {
      label = 'Medium';
      color = 'bg-yellow-500';
    } else {
      label = 'Strong';
      color = 'bg-green-500';
    }

    setPasswordStrength({ score, label, color });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'newPassword') {
      validatePasswordStrength(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      // Validate fields
      if (!formData.oldPassword) {
        setMessage({ type: 'error', text: 'Please enter your current password' });
        setIsSubmitting(false);
        return;
      }

      if (!formData.newPassword) {
        setMessage({ type: 'error', text: 'Please enter a new password' });
        setIsSubmitting(false);
        return;
      }

      if (formData.newPassword.length < 8) {
        setMessage({ type: 'error', text: 'New password must be at least 8 characters long' });
        setIsSubmitting(false);
        return;
      }

      if (formData.newPassword === formData.oldPassword) {
        setMessage({ type: 'error', text: 'New password must be different from the current password' });
        setIsSubmitting(false);
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match' });
        setIsSubmitting(false);
        return;
      }

      // Call real API to change password
      await authApi.changePassword(formData.oldPassword, formData.newPassword);

      setMessage({ type: 'success', text: 'Password changed successfully! Redirecting...' });
      
      // Reset form
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/profile');
      }, 2000);

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          {/* Back to Dashboard Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => router.push(`/${user?.role}/dashboard`)}
            className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </motion.button>

          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-10 h-10 shrink-0 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Change Password</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update your password to keep your account secure</p>
            </div>
          </div>

          {/* Message Alert */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <span className={message.type === 'success' ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}>
                {message.text}
              </span>
            </motion.div>
          )}

          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8"
          >
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* LEFT: password inputs */}
                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        name="oldPassword"
                        value={formData.oldPassword}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="Enter your current password"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showOldPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="Enter your new password"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {formData.newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Password Strength:</span>
                          <span className={`text-xs font-semibold ${
                            passwordStrength.label === 'Weak' ? 'text-red-600' :
                            passwordStrength.label === 'Medium' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="Confirm your new password"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                      <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                    )}
                  </div>
                </div>

                {/* RIGHT: requirements + tips */}
                <div className="space-y-4">
                  {/* Password Requirements */}
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Password must contain:</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                      <li className={formData.newPassword.length >= 8 ? 'text-green-600' : ''}>
                        • At least 8 characters
                      </li>
                      <li className={/[A-Z]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                        • One uppercase letter
                      </li>
                      <li className={/[a-z]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                        • One lowercase letter
                      </li>
                      <li className={/[0-9]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                        • One number
                      </li>
                      <li className={/[^a-zA-Z0-9]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                        • One special character
                      </li>
                    </ul>
                  </div>

                  {/* Security Tips */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Security Tips</h4>
                    <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
                      <li>• Use a unique password that you don't use elsewhere</li>
                      <li>• Avoid using personal information in your password</li>
                      <li>• Consider using a password manager</li>
                      <li>• Change your password regularly</li>
                    </ul>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="md:col-span-2 flex gap-4 pt-2">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-6 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Changing Password...' : 'Change Password'}
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}

export default ChangePasswordPage;
