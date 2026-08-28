"use client";

/**
 * Quick Test Page for Agora Video
 * Use this to test your Agora integration quickly
 */

import { useState } from "react";
import AgoraVideoCallReact from "@/components/AgoraVideoCallReact";
import InteractiveLiveStreaming from "@/components/InteractiveLiveStreaming";
import { agoraConfig, validateAgoraConfig } from "@/lib/agoraConfig";
import { Video, Users, Radio } from "lucide-react";

export default function AgoraTestPage() {
  const [mode, setMode] = useState<"none" | "call" | "stream-host" | "stream-audience">("none");
  const [sessionId, setSessionId] = useState(`test_${Date.now()}`);
  const [userId, setUserId] = useState(`user_${Math.floor(Math.random() * 1000)}`);
  const [userName, setUserName] = useState("Test User");

  const validation = validateAgoraConfig();

  if (!validation.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-2xl bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Agora Not Configured
            </h1>
            <p className="text-gray-600">{validation.error}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Quick Setup:</h3>
            <ol className="space-y-2 text-blue-800">
              <li>1. Get App ID from <a href="https://console.agora.io" target="_blank" className="underline font-medium">console.agora.io</a></li>
              <li>2. Add to <code className="bg-blue-100 px-2 py-0.5 rounded">frontend/.env.local</code></li>
              <li>3. Restart Next.js dev server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Agora Video Test Page
          </h1>
          <p className="text-gray-600">
            Quick test for your Agora video integration
          </p>
        </div>

        {mode === "none" ? (
          <>
            {/* Configuration Display */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">📋 Configuration</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session ID
                  </label>
                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="session_123"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use the same session ID to join the same room
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="user_123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div className="pt-2">
                  <p className="text-sm text-gray-600">
                    <strong>App ID:</strong> {agoraConfig.appId.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Multi-Party Video Call */}
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Multi-Party Video Call
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Everyone sees everyone equally. Perfect for small groups.
                  </p>
                </div>
                <button
                  onClick={() => setMode("call")}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Start Video Call
                </button>
              </div>

              {/* Live Streaming - Host */}
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Radio className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Start as Host (Teacher)
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Broadcast to many viewers. Your video is large and center.
                  </p>
                </div>
                <button
                  onClick={() => setMode("stream-host")}
                  className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Start as Host
                </button>
              </div>

              {/* Live Streaming - Audience */}
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow md:col-span-2">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Join as Audience (Student)
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Watch the host's live stream. Request to speak if needed.
                  </p>
                </div>
                <button
                  onClick={() => setMode("stream-audience")}
                  className="w-full max-w-md mx-auto block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Join as Audience
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">
                🧪 How to Test:
              </h3>
              <ol className="space-y-2 text-blue-800">
                <li>1. Choose a mode above</li>
                <li>2. Open another browser window (or incognito mode)</li>
                <li>3. Use the same <strong>Session ID</strong> on both windows</li>
                <li>4. Choose different modes or same mode</li>
                <li>5. You should see/hear each other!</li>
              </ol>
            </div>
          </>
        ) : (
          <>
            {/* Active Session Header */}
            <div className="mb-6 bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Session ID</p>
                  <p className="text-lg font-mono font-bold">{sessionId}</p>
                </div>
                <button
                  onClick={() => setMode("none")}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                >
                  Leave
                </button>
              </div>
            </div>

            {/* Video Component */}
            {mode === "call" && (
              <AgoraVideoCallReact
                sessionId={sessionId}
                userId={userId}
                userName={userName}
                appId={agoraConfig.appId}
                onCallEnd={() => setMode("none")}
              />
            )}

            {mode === "stream-host" && (
              <InteractiveLiveStreaming
                sessionId={sessionId}
                userId={userId}
                userName={userName}
                appId={agoraConfig.appId}
                isHost={true}
                onCallEnd={() => setMode("none")}
              />
            )}

            {mode === "stream-audience" && (
              <InteractiveLiveStreaming
                sessionId={sessionId}
                userId={userId}
                userName={userName}
                appId={agoraConfig.appId}
                isHost={false}
                onCallEnd={() => setMode("none")}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
