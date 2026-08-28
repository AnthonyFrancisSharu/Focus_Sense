import AgoraRTC, { 
  IAgoraRTCClient, 
  IAgoraRTCRemoteUser, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack 
} from 'agora-rtc-sdk-ng'

export interface AgoraConfig {
  appId: string
  token: string
  channel: string
  uid: number
}

export class AgoraClient {
  private client: IAgoraRTCClient | null = null
  private localAudioTrack: IMicrophoneAudioTrack | null = null
  private localVideoTrack: ICameraVideoTrack | null = null
  private remoteUsers: Map<string, IAgoraRTCRemoteUser> = new Map()

  constructor() {
    // Create Agora client
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
  }

  async join(config: AgoraConfig): Promise<void> {
    if (!this.client) throw new Error('Client not initialized')

    // Set up event listeners
    this.client.on('user-published', this.handleUserPublished.bind(this))
    this.client.on('user-unpublished', this.handleUserUnpublished.bind(this))
    this.client.on('user-joined', this.handleUserJoined.bind(this))
    this.client.on('user-left', this.handleUserLeft.bind(this))

    // Join the channel
    await this.client.join(config.appId, config.channel, config.token, config.uid)
    
    // Create and publish local tracks
    await this.createLocalTracks()
    await this.publishLocalTracks()
  }

  async createLocalTracks(): Promise<void> {
    try {
      [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks()
    } catch (error) {
      console.error('Failed to create local tracks:', error)
      throw error
    }
  }

  async publishLocalTracks(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized')
    
    const tracks = []
    if (this.localAudioTrack) tracks.push(this.localAudioTrack)
    if (this.localVideoTrack) tracks.push(this.localVideoTrack)

    if (tracks.length > 0) {
      await this.client.publish(tracks)
    }
  }

  playLocalVideo(elementId: string): void {
    if (this.localVideoTrack) {
      this.localVideoTrack.play(elementId)
    }
  }

  private async handleUserPublished(user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') {
    if (!this.client) return

    await this.client.subscribe(user, mediaType)
    this.remoteUsers.set(user.uid.toString(), user)

    if (mediaType === 'video') {
      // Video track will be played by the component
      console.log('Remote user published video:', user.uid)
    }

    if (mediaType === 'audio') {
      user.audioTrack?.play()
    }
  }

  private handleUserUnpublished(user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') {
    console.log('Remote user unpublished:', user.uid, mediaType)
  }

  private handleUserJoined(user: IAgoraRTCRemoteUser) {
    console.log('Remote user joined:', user.uid)
    this.remoteUsers.set(user.uid.toString(), user)
  }

  private handleUserLeft(user: IAgoraRTCRemoteUser) {
    console.log('Remote user left:', user.uid)
    this.remoteUsers.delete(user.uid.toString())
  }

  getRemoteUsers(): IAgoraRTCRemoteUser[] {
    return Array.from(this.remoteUsers.values())
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(enabled)
    }
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(enabled)
    }
  }

  async leave(): Promise<void> {
    // Close local tracks
    if (this.localAudioTrack) {
      this.localAudioTrack.close()
      this.localAudioTrack = null
    }

    if (this.localVideoTrack) {
      this.localVideoTrack.close()
      this.localVideoTrack = null
    }

    // Leave the channel
    if (this.client) {
      await this.client.leave()
      this.remoteUsers.clear()
    }
  }

  getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack
  }

  getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack
  }
}

// API helper to get Agora token
export async function getAgoraToken(channelName: string, uid: number = 0): Promise<AgoraConfig | null> {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) throw new Error('Not authenticated')

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    
    const response = await fetch(`${API_BASE_URL}/api/agora/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        channel_name: channelName,
        uid: uid,
        role: 1  // Publisher (can send and receive)
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to get Agora token')
    }

    const data = await response.json()
    
    return {
      appId: data.app_id,
      token: data.token,
      channel: data.channel_name,
      uid: data.uid
    }
  } catch (error) {
    console.error('Error getting Agora token:', error)
    return null
  }
}
