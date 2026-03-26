/**
 * WebRTC Configuration for the Raccoon App
 * 
 * Includes:
 * - STUN servers for NAT traversal
 * - TURN server structure for fallback (requires credentials in production)
 * - Media constraints for optimal video/audio
 * - ICE configuration options
 */

// Free public STUN servers
const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
  'stun:stun4.l.google.com:19302',
  'stun:stun.services.mozilla.com',
  'stun:stun.stunprotocol.org:3478'
];

// TURN server configuration (placeholder - in production, use your own TURN server)
// Services like Twilio, Xirsys, or self-hosted coturn
const TURN_SERVERS = [
  // Uncomment and configure for production:
  // {
  //   urls: 'turn:your-turn-server.com:3478',
  //   username: 'your-username',
  //   credential: 'your-credential'
  // },
  // {
  //   urls: 'turn:your-turn-server.com:443?transport=tcp',
  //   username: 'your-username',
  //   credential: 'your-credential'
  // }
];

// Full ICE server configuration
export const ICE_SERVERS = {
  iceServers: [
    // STUN servers for NAT discovery
    ...STUN_SERVERS.map(url => ({ urls: url })),
    
    // TURN servers for relay fallback
    ...TURN_SERVERS
  ],
  iceCandidatePoolSize: 10
};

// Media constraints for video capture
export const VIDEO_CONSTRAINTS = {
  video: {
    width: { ideal: 1280, min: 640, max: 1920 },
    height: { ideal: 720, min: 480, max: 1080 },
    frameRate: { ideal: 30, min: 15, max: 60 },
    facingMode: 'user',
    aspectRatio: { ideal: 16 / 9 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1
  }
};

// Mobile-optimized constraints (lower resolution for better performance)
export const MOBILE_VIDEO_CONSTRAINTS = {
  video: {
    width: { ideal: 640, min: 320, max: 1280 },
    height: { ideal: 480, min: 240, max: 720 },
    frameRate: { ideal: 24, min: 15, max: 30 },
    facingMode: 'user'
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

// Audio-only constraints
export const AUDIO_ONLY_CONSTRAINTS = {
  video: false,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

// SDP offer options
export const OFFER_OPTIONS = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
  voiceActivityDetection: true
};

// Connection timeout in milliseconds
export const CONNECTION_TIMEOUT = 30000;

// ICE gathering timeout
export const ICE_GATHERING_TIMEOUT = 10000;

// Reconnection attempts
export const MAX_RECONNECTION_ATTEMPTS = 3;
export const RECONNECTION_DELAY = 2000;

// Detect if user is on mobile
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Get appropriate media constraints based on device
export const getMediaConstraints = () => {
  return isMobile() ? MOBILE_VIDEO_CONSTRAINTS : VIDEO_CONSTRAINTS;
};

// Camera filter CSS styles
export const FILTER_STYLES = {
  none: 'none',
  
  // Beauty filters
  beauty: 'brightness(1.08) contrast(1.05) saturate(1.15)',
  smooth: 'brightness(1.1) contrast(0.92) saturate(1.08) blur(0.4px)',
  glow: 'brightness(1.15) contrast(1.02) saturate(1.1)',
  
  // Mask filters (CSS approximation)
  raccoon: 'contrast(1.15) brightness(1.02) saturate(0.9)',
  cat: 'brightness(1.05) contrast(1.1) saturate(1.2)',
  dog: 'brightness(1.08) contrast(1.05) sepia(0.1)',
  
  // Color tone filters
  warm: 'brightness(1.08) sepia(0.25) saturate(1.4) contrast(1.02)',
  cool: 'brightness(1.05) saturate(0.85) hue-rotate(15deg) contrast(1.08)',
  vintage: 'sepia(0.45) contrast(1.15) brightness(0.92) saturate(0.75)',
  bw: 'grayscale(1) contrast(1.2) brightness(1.05)',
  
  // Fun effect filters
  neon: 'brightness(1.2) contrast(1.35) saturate(1.6)',
  sparkle: 'brightness(1.18) contrast(1.08) saturate(1.25)',
  vhs: 'brightness(1.05) contrast(1.25) saturate(1.3) hue-rotate(-5deg)',
  comic: 'contrast(1.5) brightness(1.1) saturate(1.4)',
  dreamy: 'brightness(1.12) contrast(0.9) saturate(1.15) blur(0.5px)'
};

export default ICE_SERVERS;
