"use client";

/**
 * Enhanced Teacher Dashboard with Agora Live Streaming
 * 
 * This component demonstrates how to integrate Agora live streaming
 * into your existing teacher dashboard.
 */

import { useState, useEffect } from "react";
import InteractiveLiveStreaming from "./InteractiveLiveStreaming";
import { agoraConfig, validateAgoraConfig } from "@/lib/agoraConfig";
import { Video, VideoOff, Users, TrendingUp, AlertCircle, Eye, Clock } from "lucide-react";

interface TeacherDashboardWithAgoraProps {
  teacherName: string;
  teacherId: string;
  sessionId?: string;
}

export default function TeacherDashboardWithAgora({
  teacherName,
  teacherId,
  sessionId,
}: TeacherDashboardWithAgoraProps) {
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || "");
  const [configValid, setConfigValid] = useState(false);
  const [configError, setConfigError] = useState("");

  // Validate Agora config on mount
  useEffect(() => {
    const validation = validateAgoraConfig();
    setConfigValid(validation.valid);
    if (!validation.valid) {
      setConfigError(validation.error || "Configuration error");
    }
  }, []);

  const handleStartLiveStream = () => {
    if (!configValid) {
      alert(configError);
      return;
    }
    
    if (!currentSessionId) {
      // Generate a session ID if not provided
      setCurrentSessionId(`session_${Date.now()}`);
    }
    
    setIsLiveStreaming(true);
  };

  const handleEndLiveStream = () => {
    setIsLiveStreaming(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {teacherName}</p>
          </div>

          {/* Live Stream Toggle Button */}
          <button
            onClick={isLiveStreaming ? handleEndLiveStream : handleStartLiveStream}
            disabled={!configValid}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              isLiveStreaming
                ? "bg-red-600 hover:bg-red-700 text-white"
                : configValid
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-400 text-gray-200 cursor-not-allowed"
            }`}
          >
            {isLiveStreaming ? (
              <>
                <VideoOff className="w-5 h-5" />
                End Live Class
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                Start Live Class
              </>
            )}
          </button>
        </div>

        {/* Configuration Error Alert */}
        {!configValid && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900">Agora Configuration Required</h3>
                <p className="text-sm text-yellow-800 mt-1">{configError}</p>
                <p className="text-sm text-yellow-700 mt-2">
                  Please add your Agora App ID to <code className="bg-yellow-100 px-2 py-0.5 rounded">.env.local</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Streaming Section */}
        {isLiveStreaming && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <h2 className="text-xl font-bold text-gray-900">Live Class in Session</h2>
                </div>
                <div className="text-sm text-gray-600">
                  Session: <code className="bg-gray-100 px-2 py-1 rounded">{currentSessionId}</code>
                </div>
              </div>

              <InteractiveLiveStreaming
                sessionId={currentSessionId}
                userId={teacherId}
                userName={teacherName}
                appId={agoraConfig.appId}
                isHost={true}
                onCallEnd={handleEndLiveStream}
              />
            </div>
          </div>
        )}

        {/* Dashboard Stats */}
        {!isLiveStreaming && (
          <>
            <div className="grid md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">24</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg. Engagement</p>
                    <p className="text-3xl font-bold text-green-600">87%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Now</p>
                    <p className="text-3xl font-bold text-blue-600">12</p>
                  </div>
                  <Eye className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Session Time</p>
                    <p className="text-3xl font-bold text-purple-600">42m</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                📹 Ready to Start Your Live Class?
              </h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start">
                  <span className="font-semibold mr-2">1.</span>
                  Click "Start Live Class" to begin streaming
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">2.</span>
                  Share the session ID with your students
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">3.</span>
                  Students can join and watch your live lecture
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">4.</span>
                  They can request to speak and interact with you
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
