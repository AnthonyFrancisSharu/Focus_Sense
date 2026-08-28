"use client";

import {
  LocalUser,
  RemoteUser,
  useIsConnected,
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useRemoteUsers,
  useRTCClient,
} from "agora-rtc-react";
import AgoraRTC, { AgoraRTCProvider, ClientConfig } from "agora-rtc-react";
import { useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from "lucide-react";

// Create client for Interactive Live Streaming
const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

interface InteractiveLiveStreamingProps {
  sessionId: string;
  userId: string;
  userName: string;
  appId: string;
  token?: string | null;
  isHost?: boolean; // true for host/teacher, false for audience/student
  onCallEnd?: () => void;
}

/**
 * Interactive Live Streaming Component
 * Perfect for teacher-led sessions with multiple students
 */
export default function InteractiveLiveStreaming({
  sessionId,
  userId,
  userName,
  appId,
  token = null,
  isHost = false,
  onCallEnd,
}: InteractiveLiveStreamingProps) {
  return (
    <AgoraRTCProvider client={client}>
      <LiveStreamingBasics
        sessionId={sessionId}
        userId={userId}
        userName={userName}
        appId={appId}
        token={token}
        isHost={isHost}
        onCallEnd={onCallEnd}
      />
    </AgoraRTCProvider>
  );
}

/**
 * Live Streaming Basics Component
 */
function LiveStreamingBasics({
  sessionId,
  userId,
  userName,
  appId,
  token = null,
  isHost = false,
  onCallEnd,
}: InteractiveLiveStreamingProps) {
  const [calling, setCalling] = useState(true);
  const [micOn, setMicOn] = useState(isHost); // Only host has mic on by default
  const [cameraOn, setCameraOn] = useState(isHost); // Only host has camera on by default
  const [role, setRole] = useState<"host" | "audience">(isHost ? "host" : "audience");

  const rtcClient = useRTCClient();

  // Set client role
  useState(() => {
    if (rtcClient) {
      rtcClient.setClientRole(role);
    }
  });

  // Join channel
  useJoin(
    {
      appid: appId,
      channel: sessionId,
      token: token || null,
      uid: parseInt(userId) || 0,
    },
    calling
  );

  // Create local tracks (only for hosts)
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn && role === "host");
  const { localCameraTrack } = useLocalCameraTrack(cameraOn && role === "host");

  // Publish local tracks (only hosts publish)
  usePublish(role === "host" ? [localMicrophoneTrack, localCameraTrack] : []);

  // Get remote users and connection status
  const remoteUsers = useRemoteUsers();
  const isConnected = useIsConnected();

  const handleLeaveCall = () => {
    setCalling(false);
    if (onCallEnd) {
      onCallEnd();
    }
  };

  const handleBecomeHost = async () => {
    if (rtcClient) {
      await rtcClient.setClientRole("host");
      setRole("host");
      setMicOn(true);
      setCameraOn(true);
    }
  };

  const handleBecomeAudience = async () => {
    if (rtcClient) {
      await rtcClient.setClientRole("audience");
      setRole("audience");
      setMicOn(false);
      setCameraOn(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-yellow-500"
            }`}
          />
          <span className="text-white font-medium">
            {isConnected ? "Live" : "Connecting..."}
          </span>
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{remoteUsers.length + 1}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              role === "host"
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white"
            }`}
          >
            {role === "host" ? "HOST" : "AUDIENCE"}
          </span>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="relative" style={{ minHeight: "500px" }}>
        {/* Host Video (Large) */}
        {role === "host" ? (
          <div className="w-full h-[500px] bg-gray-800">
            <LocalUser
              audioTrack={localMicrophoneTrack}
              cameraOn={cameraOn}
              micOn={micOn}
              videoTrack={localCameraTrack}
              cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
            >
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-4 py-2 rounded-lg text-white">
                <p className="font-semibold">{userName}</p>
                <p className="text-xs text-gray-300">Host (You)</p>
              </div>
            </LocalUser>
          </div>
        ) : (
          <div className="w-full h-[500px] bg-gray-800">
            {remoteUsers.length > 0 ? (
              <RemoteUser
                user={remoteUsers[0]}
                cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
              >
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-4 py-2 rounded-lg text-white">
                  <p className="font-semibold">Host</p>
                  <p className="text-xs text-gray-300">Teaching</p>
                </div>
              </RemoteUser>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Waiting for host to start streaming...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audience Thumbnails (Bottom right) */}
        {role === "host" && remoteUsers.length > 0 && (
          <div className="absolute bottom-4 right-4 flex flex-wrap gap-2 max-w-md">
            {remoteUsers.slice(0, 6).map((user) => (
              <div
                key={user.uid}
                className="w-32 h-24 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600"
              >
                <RemoteUser
                  user={user}
                  cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
                >
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 px-2 py-0.5 rounded text-white text-xs">
                    {user.uid}
                  </div>
                </RemoteUser>
              </div>
            ))}
            {remoteUsers.length > 6 && (
              <div className="w-32 h-24 bg-gray-700 rounded-lg flex items-center justify-center text-white">
                +{remoteUsers.length - 6}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center justify-center gap-4">
          {role === "host" ? (
            <>
              {/* Host Controls */}
              <button
                onClick={() => setMicOn(!micOn)}
                className={`p-4 rounded-full transition-all ${
                  micOn
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
                title={micOn ? "Mute" : "Unmute"}
              >
                {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>

              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={`p-4 rounded-full transition-all ${
                  cameraOn
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
                title={cameraOn ? "Turn off camera" : "Turn on camera"}
              >
                {cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>

              <button
                onClick={handleLeaveCall}
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                title="End stream"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={handleBecomeAudience}
                className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
              >
                Switch to Audience
              </button>
            </>
          ) : (
            <>
              {/* Audience Controls */}
              <button
                onClick={handleLeaveCall}
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                title="Leave"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={handleBecomeHost}
                className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
              >
                Request to Speak
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
