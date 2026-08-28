"use client";

/**
 * Enhanced Student Dashboard with Agora Live Streaming
 * 
 * This component demonstrates how to integrate Agora live streaming
 * viewing into your student dashboard.
 */

import { useState, useEffect } from "react";
import InteractiveLiveStreaming from "./InteractiveLiveStreaming";
import { agoraConfig, validateAgoraConfig } from "@/lib/agoraConfig";
import { Video, Clock, Users, TrendingUp, BookOpen } from "lucide-react";

interface StudentDashboardWithAgoraProps {
  studentName: string;
  studentId: string;
  sessionId?: string;
}

export default function StudentDashboardWithAgora({
  studentName,
  studentId,
  sessionId = "session_123",
}: StudentDashboardWithAgoraProps) {
  const [isWatching, setIsWatching] = useState(false);
  const [configValid, setConfigValid] = useState(false);
  const [sessionIdInput, setSessionIdInput] = useState(sessionId);

  // Validate Agora config on mount
  useEffect(() => {
    const validation = validateAgoraConfig();
    setConfigValid(validation.valid);
  }, []);

  const handleJoinClass = () => {
    if (!configValid) {
      alert("Agora is not configured. Please check .env.local");
      return;
    }
    setIsWatching(true);
  };

  const handleLeaveClass = () => {
    setIsWatching(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-6">Student Dashboard</h1>

        {/* Live Class Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-600" />
            Live Class
          </h2>

          {!isWatching ? (
            <div className="space-y-4">
              {/* Session ID Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session ID
                </label>
                <input
                  type="text"
                  value={sessionIdInput}
                  onChange={(e) => setSessionIdInput(e.target.value)}
                  placeholder="Enter session ID from your teacher"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Ask your teacher for the session ID to join the live class
                </p>
              </div>

              {/* Join Button */}
              <div className="text-center py-8">
                <div className="mb-4">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-12 h-12 text-blue-600" />
                  </div>
                  <p className="text-gray-600 mb-2">
                    {configValid
                      ? "Join the live session to participate in real-time"
                      : "Agora not configured. Please contact administrator."}
                  </p>
                </div>
                <button
                  onClick={handleJoinClass}
                  disabled={!configValid || !sessionIdInput}
                  className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                    configValid && sessionIdInput
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-400 text-gray-200 cursor-not-allowed"
                  }`}
                >
                  Join Live Class
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Watching Live
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  Session: <code className="bg-gray-100 px-2 py-1 rounded">{sessionIdInput}</code>
                </span>
              </div>

              <InteractiveLiveStreaming
                sessionId={sessionIdInput}
                userId={studentId}
                userName={studentName}
                appId={agoraConfig.appId}
                isHost={false}
                onCallEnd={handleLeaveClass}
              />
            </div>
          )}
        </div>

        {/* Student Stats */}
        {!isWatching && (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Classes Attended</p>
                    <p className="text-3xl font-bold text-gray-900">12</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Hours</p>
                    <p className="text-3xl font-bold text-green-600">18.5</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg. Engagement</p>
                    <p className="text-3xl font-bold text-purple-600">92%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* How to Join Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                📚 How to Join a Live Class
              </h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start">
                  <span className="font-semibold mr-2">1.</span>
                  Get the session ID from your teacher
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">2.</span>
                  Enter the session ID in the input field above
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">3.</span>
                  Click "Join Live Class" to start watching
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2">4.</span>
                  Click "Request to Speak" if you want to interact with the teacher
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
