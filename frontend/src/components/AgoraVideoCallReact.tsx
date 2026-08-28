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
} from "agora-rtc-react";
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react";
import { useState, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from "lucide-react";

// Agora client configuration
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

interface AgoraVideoCallProps {
  sessionId: string;
  userId: string;
  userName: string;
  appId: string;
  token?: string | null;
  onCallEnd?: () => void;
}

/**
 * Main Agora Video Call Component
 * Wraps the Basics component with AgoraRTCProvider
 */
export default function AgoraVideoCallReact({
  sessionId,
  userId,
  userName,
  appId,
  token = null,
  onCallEnd,
}: AgoraVideoCallProps) {
  return (
    <AgoraRTCProvider client={client}>
      <VideoCallBasics
        sessionId={sessionId}
        userId={userId}
        userName={userName}
        appId={appId}
        token={token}
        onCallEnd={onCallEnd}
      />
    </AgoraRTCProvider>
  );
}

/**
 * Video Call Basics Component
 * Handles joining, publishing, and displaying video
 */
function VideoCallBasics({
  sessionId,
  userId,
  userName,
  appId,
  token = null,
  onCallEnd,
}: AgoraVideoCallProps) {
  // State management
  const [calling, setCalling] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Create local tracks
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn);

  // Publish local tracks
  usePublish([localMicrophoneTrack, localCameraTrack]);

  // Get remote users and connection status
  const remoteUsers = useRemoteUsers();
  const isConnected = useIsConnected();

  // Handle call end
  const handleLeaveCall = () => {
    setCalling(false);
    if (onCallEnd) {
      onCallEnd();
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`bg-gray-900 rounded-lg overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50" : "relative"
      }`}
    >
      {/* Connection Status */}
      <div className="absolute top-4 left-4 z-10">
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isConnected
              ? "bg-green-500 text-white"
              : "bg-yellow-500 text-gray-900"
          }`}
        >
          {isConnected ? "Connected" : "Connecting..."}
        </div>
      </div>

      {/* Fullscreen Toggle */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
      >
        {isFullscreen ? (
          <Minimize2 className="w-5 h-5 text-white" />
        ) : (
          <Maximize2 className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Video Grid */}
      <div
        className={`grid gap-2 p-4 ${
          remoteUsers.length === 0
            ? "grid-cols-1"
            : remoteUsers.length === 1
            ? "grid-cols-2"
            : remoteUsers.length <= 4
            ? "grid-cols-2"
            : "grid-cols-3"
        }`}
        style={{ minHeight: isFullscreen ? "calc(100vh - 100px)" : "500px" }}
      >
        {/* Local User Video */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <LocalUser
            audioTrack={localMicrophoneTrack}
            cameraOn={cameraOn}
            micOn={micOn}
            videoTrack={localCameraTrack}
            cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
          >
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-3 py-1 rounded-full text-white text-sm">
              {userName} (You)
            </div>
          </LocalUser>
          
          {/* Local user status indicators */}
          <div className="absolute top-2 right-2 flex gap-2">
            {!cameraOn && (
              <div className="bg-red-500 p-1.5 rounded-full">
                <VideoOff className="w-4 h-4 text-white" />
              </div>
            )}
            {!micOn && (
              <div className="bg-red-500 p-1.5 rounded-full">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Remote Users Videos */}
        {remoteUsers.map((user) => (
          <div
            key={user.uid}
            className="relative bg-gray-800 rounded-lg overflow-hidden"
          >
            <RemoteUser
              user={user}
              cover="https://www.agora.io/en/wp-content/uploads/2022/10/3d-spatial-audio-icon.svg"
            >
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-3 py-1 rounded-full text-white text-sm">
                User {user.uid}
              </div>
            </RemoteUser>
          </div>
        ))}

        {/* Empty state when no remote users */}
        {remoteUsers.length === 0 && (
          <div className="bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Waiting for others to join...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-center gap-4">
        {/* Microphone Toggle */}
        <button
          onClick={() => setMicOn(!micOn)}
          className={`p-4 rounded-full transition-all ${
            micOn
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
          title={micOn ? "Mute microphone" : "Unmute microphone"}
        >
          {micOn ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={() => setCameraOn(!cameraOn)}
          className={`p-4 rounded-full transition-all ${
            cameraOn
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
          title={cameraOn ? "Turn off camera" : "Turn on camera"}
        >
          {cameraOn ? (
            <Video className="w-6 h-6" />
          ) : (
            <VideoOff className="w-6 h-6" />
          )}
        </button>

        {/* End Call */}
        <button
          onClick={handleLeaveCall}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          title="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>

      {/* Participant Count */}
      <div className="absolute bottom-20 left-4 bg-black bg-opacity-50 px-3 py-1 rounded-full text-white text-sm">
        {remoteUsers.length + 1} participant{remoteUsers.length !== 0 ? "s" : ""}
      </div>
    </div>
  );
}
