/**
 * Enhanced WebSocket utility for real-time communication with the backend
 * Features: Auto-reconnect, heartbeat/ping-pong, connection state management
 */

const WS_BASE_URL = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000').replace(/\/+$/, '')

// Configuration constants
const PING_INTERVAL = 15000        // Send ping every 15 seconds
const PONG_TIMEOUT = 10000         // Wait 10 seconds for pong response
const RECONNECT_DELAY_BASE = 1000  // Base delay for reconnection (1 second)
const MAX_RECONNECT_DELAY = 30000  // Maximum delay between reconnects (30 seconds)
const MAX_RECONNECT_ATTEMPTS = 10  // Maximum number of reconnection attempts

export type ConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'reconnecting'

export interface WebSocketMessage {
  type: string
  data?: any
  message?: string
  timestamp?: string
}

export interface WebSocketManagerOptions {
  onStateChange?: (state: ConnectionState) => void
  onReconnectAttempt?: (attempt: number, maxAttempts: number) => void
  onMaxReconnectReached?: () => void
}

export class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private pingInterval: NodeJS.Timeout | null = null
  private pongTimeout: NodeJS.Timeout | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private isIntentionallyClosed = false
  private connectionState: ConnectionState = 'disconnected'
  private lastPongTime: number = Date.now()
  private options: WebSocketManagerOptions

  constructor(private url: string, options: WebSocketManagerOptions = {}) {
    this.options = options
  }

  private setState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      console.log(`WebSocket state changed: ${state}`)
      this.options.onStateChange?.(state)
      this.notifyListeners('connectionStateChange', { state })
    }
  }

  getState(): ConnectionState {
    return this.connectionState
  }

  getUrl(): string {
    return this.url
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Don't connect if already connected or connecting
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        if (this.ws.readyState === WebSocket.OPEN) {
          resolve()
        }
        return
      }

      try {
        this.isIntentionallyClosed = false
        this.setState('connecting')
        
        console.log(`Connecting to WebSocket: ${this.url}`)
        this.ws = new WebSocket(this.url)
        
        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.log('WebSocket connection timeout')
            this.ws.close()
            reject(new Error('Connection timeout'))
          }
        }, 10000) // 10 second connection timeout

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout)
          console.log('WebSocket connected:', this.url)
          this.reconnectAttempts = 0
          this.lastPongTime = Date.now()
          this.setState('connected')
          
          // Start ping/pong heartbeat
          this.startHeartbeat()
          
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            
            // Handle pong response
            if (message.type === 'pong') {
              this.lastPongTime = Date.now()
              this.clearPongTimeout()
              return
            }
            
            // Handle ping from server
            if (message.type === 'ping') {
              this.send({ type: 'pong', timestamp: new Date().toISOString() })
              return
            }
            
            // Debug logging for important messages
            if (message.type === 'student_leave' || message.type === 'student_update') {
              console.log(`🔔 [WebSocket] Received ${message.type}:`, JSON.stringify(message.data))
            }
            
            this.notifyListeners(message.type, message.data || message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout)
          console.error('WebSocket error:', error)
          // Don't reject here, let onclose handle the reconnection
        }

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout)
          console.log(`WebSocket closed: code=${event.code}, reason=${event.reason || 'No reason provided'}`)
          
          this.stopHeartbeat()
          
          if (this.isIntentionallyClosed) {
            this.setState('disconnected')
            return
          }
          
          // Attempt reconnection
          this.attemptReconnect()
        }
      } catch (error) {
        this.setState('disconnected')
        reject(error)
      }
    })
  }

  private startHeartbeat(): void {
    this.stopHeartbeat() // Clear any existing heartbeat
    
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Check if we received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPongTime
        if (timeSinceLastPong > PING_INTERVAL + PONG_TIMEOUT) {
          console.log('Connection appears dead (no pong received), attempting reconnect')
          this.handleConnectionLoss()
          return
        }
        
        // Send ping
        this.send({ type: 'ping', timestamp: new Date().toISOString() })
        
        // Set pong timeout
        this.pongTimeout = setTimeout(() => {
          console.log('Pong timeout - connection may be lost')
          // Don't immediately close, just log - next ping will check
        }, PONG_TIMEOUT)
      }
    }, PING_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    this.clearPongTimeout()
  }

  private clearPongTimeout(): void {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout)
      this.pongTimeout = null
    }
  }

  private handleConnectionLoss(): void {
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    if (!this.isIntentionallyClosed) {
      this.attemptReconnect()
    }
  }

  private attemptReconnect(): void {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.isIntentionallyClosed) {
      this.setState('disconnected')
      return
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached')
      this.setState('disconnected')
      this.options.onMaxReconnectReached?.()
      this.notifyListeners('maxReconnectReached', {})
      return
    }

    this.reconnectAttempts++
    this.setState('reconnecting')
    
    // Exponential backoff with jitter
    const delay = Math.min(
      RECONNECT_DELAY_BASE * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000,
      MAX_RECONNECT_DELAY
    )
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${Math.round(delay)}ms...`)
    this.options.onReconnectAttempt?.(this.reconnectAttempts, MAX_RECONNECT_ATTEMPTS)
    this.notifyListeners('reconnecting', { attempt: this.reconnectAttempts, maxAttempts: MAX_RECONNECT_ATTEMPTS })

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(err => {
        console.error('Reconnection failed:', err)
        // Will trigger onclose which will attempt reconnect again
      })
    }, delay)
  }

  send(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data))
        return true
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
        return false
      }
    } else {
      console.warn('WebSocket is not open. Cannot send message. State:', this.ws?.readyState)
      return false
    }
  }

  on(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)
    
    // Return unsubscribe function
    return () => this.off(eventType, callback)
  }

  off(eventType: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  private notifyListeners(eventType: string, data: any): void {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in listener for ${eventType}:`, error)
        }
      })
    }
    
    // Also notify 'all' listeners
    const allCallbacks = this.listeners.get('*')
    if (allCallbacks) {
      allCallbacks.forEach(callback => {
        try {
          callback({ type: eventType, data })
        } catch (error) {
          console.error('Error in wildcard listener:', error)
        }
      })
    }
  }

  disconnect(): void {
    console.log('Intentionally disconnecting WebSocket')
    this.isIntentionallyClosed = true
    this.setState('disconnecting')
    
    this.stopHeartbeat()
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    
    this.setState('disconnected')
    this.listeners.clear()
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  // Reset reconnection attempts (useful when user manually triggers reconnect)
  resetReconnection(): void {
    this.reconnectAttempts = 0
    this.isIntentionallyClosed = false
  }

  // Force reconnect (close current connection and reconnect)
  async forceReconnect(): Promise<void> {
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.reconnectAttempts = 0
    this.isIntentionallyClosed = false
    
    return this.connect()
  }
}

// Create WebSocket connections for teacher and student
export function createTeacherWebSocket(
  sessionId: string, 
  teacherId: string,
  options?: WebSocketManagerOptions
): WebSocketManager {
  const url = `${WS_BASE_URL}/ws/session/${sessionId}/teacher/${teacherId}`
  return new WebSocketManager(url, options)
}

export function createStudentWebSocket(
  sessionId: string, 
  studentId: string,
  options?: WebSocketManagerOptions
): WebSocketManager {
  const url = `${WS_BASE_URL}/ws/session/${sessionId}/student/${studentId}`
  return new WebSocketManager(url, options)
}

// Utility function to create a session-specific WebSocket
export function createSessionWebSocket(
  sessionId: string,
  options?: WebSocketManagerOptions
): WebSocketManager {
  return new WebSocketManager(`${WS_BASE_URL}/ws/${sessionId}`, options)
}
