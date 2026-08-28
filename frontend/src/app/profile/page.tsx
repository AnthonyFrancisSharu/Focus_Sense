'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Briefcase, Building2, FileText, Camera, Save, X, Edit2, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface ProfileFormData {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  title?: string;
  department?: string;
  avatar?: string;
}

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    bio: user?.bio || '',
    title: user?.title || '',
    department: user?.department || '',
    avatar: user?.avatar || ''
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setFormData(prev => ({ ...prev, avatar: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isEditing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!isEditing) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setFormData(prev => ({ ...prev, avatar: '' }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        setMessage({ type: 'error', text: 'Name is required' });
        setIsSaving(false);
        return;
      }

      if (!formData.email.trim()) {
        setMessage({ type: 'error', text: 'Email is required' });
        setIsSaving(false);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setMessage({ type: 'error', text: 'Please enter a valid email address' });
        setIsSaving(false);
        return;
      }

      // Update profile
      await updateProfile(formData);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      location: user?.location || '',
      bio: user?.bio || '',
      title: user?.title || '',
      department: user?.department || '',
      avatar: user?.avatar || ''
    });
    setAvatarPreview(user?.avatar || null);
    setIsEditing(false);
    setMessage(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-800';
      case 'teacher':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-800';
      case 'student':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-800';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
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
            className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </motion.button>

          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-10 h-10 shrink-0 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Profile Settings</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage your personal information and preferences</p>
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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Cover Image */}
            <div className="h-24 bg-gradient-to-r from-primary-500 to-primary-600"></div>

            {/* Profile Content */}
            <div className="px-6 sm:px-8 pb-6">
              {/* Avatar Section */}
              <div className="relative -mt-12 mb-4">
                <div className="flex items-end gap-4">
                  <div
                    className={`relative group ${isEditing ? 'cursor-pointer' : ''}`}
                    onClick={handleAvatarClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className={`w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold ${
                      isDragging ? 'ring-4 ring-primary-300' : ''
                    }`}>
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt={formData.name}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{getInitials(formData.name)}</span>
                      )}
                    </div>
                    
                    {isEditing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-full">
                        <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  <div className="mb-2 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{formData.name}</h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user?.role || '')}`}>
                        {user?.role.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{formData.email}</p>
                  </div>

                  {/* Edit/Save/Cancel Buttons */}
                  <div className="mb-2">
                    {!isEditing ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Profile
                      </motion.button>
                    ) : (
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Avatar Actions */}
                {isEditing && avatarPreview && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                  >
                    Remove Avatar
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary-600" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">{formData.name}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter your email"
                        />
                      ) : (
                        <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {formData.email}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Phone Number
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {formData.phone || 'Not provided'}
                        </p>
                      )}
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Location
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="City, Country"
                        />
                      ) : (
                        <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {formData.location || 'Not provided'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary-600" />
                    Professional Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Job Title
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="e.g., Senior Teacher, Student"
                        />
                      ) : (
                        <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          {formData.title || 'Not provided'}
                        </p>
                      )}
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Department
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="e.g., Mathematics, Computer Science"
                        />
                      ) : (
                        <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          {formData.department || 'Not provided'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-600" />
                    About
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Bio
                    </label>
                    {isEditing ? (
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white min-h-[80px]">
                        {formData.bio || 'No bio provided'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Account Information */}
                <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Account Created:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Last Login:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}

export default ProfilePage;
