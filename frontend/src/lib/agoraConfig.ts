/**
 * Agora Configuration
 * Update these values with your Agora credentials
 */

export const agoraConfig = {
  // Get your App ID from https://console.agora.io
  appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || "",
  
  // Optional: For production, generate tokens from your backend
  // Leave empty to use without token (only for development)
  token: process.env.NEXT_PUBLIC_AGORA_TOKEN || null,
  
  // Token expiration time in seconds (default: 24 hours)
  tokenExpirationTime: 86400,
};

/**
 * Validate Agora configuration
 */
export function validateAgoraConfig(): { valid: boolean; error?: string } {
  if (!agoraConfig.appId) {
    return {
      valid: false,
      error: "Agora App ID is missing. Please set NEXT_PUBLIC_AGORA_APP_ID in .env.local",
    };
  }

  return { valid: true };
}

/**
 * Generate a unique channel name for a session
 */
export function generateChannelName(sessionId: string): string {
  return `session_${sessionId}`;
}

/**
 * Generate a numeric user ID from string ID
 */
export function generateNumericUserId(userId: string): number {
  // Convert string to numeric ID (simple hash)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
