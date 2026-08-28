# Agora Video Integration Architecture

## Table of Contents
1. [Overview](#overview)
2. [What is Agora?](#what-is-agora)
3. [Architecture Flow](#architecture-flow)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Video Call Flow](#video-call-flow)
7. [Key Components](#key-components)
8. [Security & Authentication](#security--authentication)

---

## Overview

This document explains how Agora RTC (Real-Time Communication) is integrated into the learning system, enabling real-time video calling between teachers and students.

## What is Agora?

**Agora** is a real-time engagement platform that provides:
- **Video & Audio Calling**: HD video and crystal-clear audio
- **Real-Time Streaming**: Live broadcasting capabilities
- **Low Latency**: Sub-second latency worldwide
- **Scalability**: Supports millions of concurrent users

### Why Agora?
- ✅ Easy integration with React and FastAPI
- ✅ Built-in network optimization
- ✅ Cross-platform support (Web, iOS, Android)
- ✅ Secure token-based authentication
- ✅ Automatic quality adjustment based on network

---

## Architecture Flow

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Frontend  │         │   Backend   │         │    Agora     │
│   (React)   │         │  (FastAPI)  │         │   Servers    │
└──────┬──────┘         └──────┬──────┘         └──────┬───────┘
       │                       │                       │
       │  1. Request Token     │                       │
       │─────────────────────►│                       │
       │                       │                       │
       │                       │  2. Generate Token    │
       │                       │   (with credentials)  │
       │                       │                       │
       │  3. Return Token      │                       │
       │◄─────────────────────│                       │
       │                       │                       │
       │  4. Join Channel with Token                   │
       │──────────────────────────────────────────────►│
       │                       │                       │
       │  5. Establish WebRTC Connection              │
       │◄─────────────────────────────────────────────►│
       │                       │                       │
       │  6. Stream Video/Audio                        │
       │◄─────────────────────────────────────────────►│
       │                       │                       │
```

### Flow Steps:

1. **User initiates video call** in frontend
2. **Frontend requests token** from backend API
3. **Backend generates Agora token** using App ID and Certificate
4. **Frontend receives token** and channel info
5. **Frontend joins Agora channel** using token
6. **Agora establishes WebRTC connection** between participants
7. **Video/audio streams** directly through Agora's edge servers

---

## Backend Implementation

### Configuration (`backend/.env`)

```env
# Agora Configuration
AGORA_APP_ID=your_app_id_here
AGORA_APP_CERTIFICATE=your_app_certificate_here
```

### Token Generation (`backend/agora_utils.py`)

```python
def generate_agora_token(
    channel_name: str,      # Session/Channel ID
    uid: int = 0,           # User ID (0 = auto-assign)
    role: int = 1,          # 1 = Publisher, 2 = Subscriber
    expiration_time_in_seconds: int = 3600  # Token validity (1 hour)
) -> str:
    """
    Generates a secure token for Agora RTC
    - Uses App ID and Certificate from environment
    - Token expires after specified time
    - Different roles for different permissions
    """
```

**Roles:**
- **Publisher (1)**: Can send and receive video/audio (teachers & students)
- **Subscriber (2)**: Can only receive (observers)

### API Endpoint (`backend/routers/agora_router.py`)

```python
@router.post("/api/agora/token")
async def get_agora_token(
    request: TokenRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Protected endpoint - requires authentication
    
    Request:
    {
        "channel_name": "session_123",
        "uid": 12345,
        "role": 1
    }
    
    Response:
    {
        "token": "007eJxS...",
        "app_id": "12040a99...",
        "channel_name": "session_123",
        "uid": 12345,
        "expires_in": 3600
    }
    """
```

**Security Features:**
- ✅ Requires user authentication (JWT token)
- ✅ Validates user permissions
- ✅ Generates time-limited tokens
- ✅ Returns configuration safely

---

## Frontend Implementation

### 1. Agora SDK Integration

**Installation:**
```bash
npm install agora-rtc-react agora-rtc-sdk-ng
```

**Two Implementation Approaches:**

#### A. React Hooks Approach (`AgoraVideoCallReact.tsx`)

```tsx
import { 
  LocalUser, 
  RemoteUser, 
  useJoin, 
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useRemoteUsers 
} from "agora-rtc-react";

// Join channel
useJoin({
  appid: appId,
  channel: sessionId,
  token: token,
  uid: userId
}, calling);

// Create local tracks
const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
const { localCameraTrack } = useLocalCameraTrack(cameraOn);

// Publish tracks
usePublish([localMicrophoneTrack, localCameraTrack]);

// Get remote users
const remoteUsers = useRemoteUsers();
```

**Pros:**
- ✅ Declarative and React-friendly
- ✅ Built-in state management
- ✅ Less boilerplate code

#### B. Imperative Approach (`AgoraVideoCall.tsx`)

```tsx
// Create client
const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

// Join channel
await client.join(appId, channelName, token, uid);

// Create tracks
const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();

// Publish tracks
await client.publish([audioTrack, videoTrack]);

// Handle remote users
client.on('user-published', async (user, mediaType) => {
  await client.subscribe(user, mediaType);
});
```

**Pros:**
- ✅ More control over lifecycle
- ✅ Better for complex scenarios

### 2. Token Request Flow (`frontend/src/lib/agora.ts`)

```typescript
// Request token from backend
async function getAgoraToken(channelName: string, uid: number) {
  const response = await fetch('/api/agora/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      channel_name: channelName,
      uid: uid,
      role: 1  // Publisher
    })
  });
  
  return await response.json();
}
```

### 3. Component Integration

```tsx
// In StudentDashboard or TeacherDashboard
<AgoraVideoCallReact
  sessionId={session.id}          // Channel name
  userId={user.id}                // User ID
  userName={user.name}            // Display name
  appId={agoraConfig.appId}       // From token response
  token={agoraConfig.token}       // From token response
  onCallEnd={handleEndCall}       // Cleanup callback
/>
```

---

## Video Call Flow

### 1. **Session Creation**
```
Teacher creates session → Backend generates session_id → Used as channel_name
```

### 2. **Token Generation**
```
User clicks "Join" → Frontend requests token → Backend generates → Returns to frontend
```

### 3. **Channel Join**
```
Frontend receives token → Agora SDK joins channel → WebRTC connection established
```

### 4. **Media Publishing**
```
Access camera/mic → Create tracks → Publish to channel → Other users receive
```

### 5. **Remote Users**
```
Remote user joins → "user-published" event → Subscribe to their tracks → Display video
```

### 6. **Call End**
```
User clicks "End" → Unpublish tracks → Leave channel → Close tracks → Cleanup
```

---

## Key Components

### 1. **AgoraRTCProvider**
Provides Agora client context to child components
```tsx
<AgoraRTCProvider client={client}>
  <VideoCallBasics {...props} />
</AgoraRTCProvider>
```

### 2. **LocalUser**
Displays local user's video with controls
```tsx
<LocalUser
  audioTrack={localMicrophoneTrack}
  videoTrack={localCameraTrack}
  cameraOn={cameraOn}
  micOn={micOn}
/>
```

### 3. **RemoteUser**
Displays remote participant's video
```tsx
{remoteUsers.map((user) => (
  <RemoteUser key={user.uid} user={user} />
))}
```

### 4. **Controls**
- Microphone toggle (mute/unmute)
- Camera toggle (on/off)
- Call end button
- Fullscreen toggle

---

## Security & Authentication

### 1. **JWT Authentication**
```
Frontend → Backend: Requires valid JWT token
Backend validates user before generating Agora token
```

### 2. **Agora Token**
```
- Time-limited (default: 1 hour)
- Channel-specific (can't be reused for other channels)
- Role-based (publisher vs subscriber permissions)
- Generated server-side only
```

### 3. **Best Practices**
- ✅ Never expose App Certificate in frontend
- ✅ Always generate tokens server-side
- ✅ Use short expiration times
- ✅ Validate user permissions before token generation
- ✅ Use HTTPS in production

---

## Configuration Checklist

### Backend Setup:
- [ ] Install `agora-token-builder`: `pip install agora-token-builder`
- [ ] Set `AGORA_APP_ID` in `.env`
- [ ] Set `AGORA_APP_CERTIFICATE` in `.env`
- [ ] Ensure `/api/agora/token` endpoint is accessible

### Frontend Setup:
- [ ] Install packages: `npm install agora-rtc-react agora-rtc-sdk-ng`
- [ ] Import and use `AgoraVideoCallReact` component
- [ ] Handle token fetching from backend
- [ ] Implement call end cleanup

### Agora Dashboard:
- [ ] Create project at https://console.agora.io
- [ ] Enable RTC service
- [ ] Copy App ID and App Certificate
- [ ] Configure whitelist (if needed)

---

## Troubleshooting

### Common Issues:

**1. "Invalid App ID"**
- Check `AGORA_APP_ID` in `.env`
- Ensure no extra spaces or quotes

**2. "Token expired"**
- Token validity is 1 hour by default
- Request new token when expired

**3. "Camera/Microphone not accessible"**
- Browser requires HTTPS (except localhost)
- Check browser permissions
- Ensure device is not in use by another app

**4. "No remote users visible"**
- Verify both users joined same channel
- Check token role (must be publisher)
- Verify network connectivity

**5. "CORS errors"**
- Ensure backend allows frontend origin
- Check `FRONTEND_URL` in backend `.env`

---

## Additional Resources

- [Agora Documentation](https://docs.agora.io/)
- [Agora React SDK](https://www.npmjs.com/package/agora-rtc-react)
- [Token Generation Guide](https://docs.agora.io/en/video-calling/develop/authentication-workflow)
- [Best Practices](https://docs.agora.io/en/video-calling/develop/best-practices)

---

## Summary

**Agora Integration Flow:**
```
Frontend Request → Backend Authenticates → Backend Generates Token → 
Frontend Joins Channel → Agora Establishes WebRTC → Video Streaming
```

**Key Benefits:**
- 🔒 Secure token-based authentication
- 🚀 Low-latency real-time communication
- 📱 Cross-platform compatibility
- 🌐 Global edge server network
- 🎥 High-quality video and audio

**Security:**
- All tokens generated server-side
- Time-limited access
- User authentication required
- No sensitive credentials exposed to frontend
