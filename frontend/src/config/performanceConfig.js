/**
 * Performance Optimization Configuration
 * 
 * This module provides performance settings and utilities
 * for optimizing the video call experience.
 */

// Detect device capabilities
export const detectDeviceCapabilities = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : isMobile;
  const hasLowMemory = navigator.deviceMemory ? navigator.deviceMemory <= 4 : false;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowNetwork = connection ? ['slow-2g', '2g', '3g'].includes(connection.effectiveType) : false;
  
  return {
    isMobile,
    isLowEnd,
    hasLowMemory,
    isSlowNetwork,
    cores: navigator.hardwareConcurrency || 2,
    memory: navigator.deviceMemory || 4,
    connectionType: connection?.effectiveType || 'unknown'
  };
};

// Performance mode settings
export const PERFORMANCE_MODES = {
  high: {
    name: 'High Quality',
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 30 }
    },
    bitrate: 2500000 // 2.5 Mbps
  },
  
  balanced: {
    name: 'Balanced',
    video: {
      width: { ideal: 854, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 24, max: 30 }
    },
    bitrate: 1500000 // 1.5 Mbps
  },
  
  performance: {
    name: 'Performance',
    video: {
      width: { ideal: 640, max: 854 },
      height: { ideal: 360, max: 480 },
      frameRate: { ideal: 20, max: 24 }
    },
    bitrate: 800000 // 800 Kbps
  },
  
  low: {
    name: 'Data Saver',
    video: {
      width: { ideal: 480, max: 640 },
      height: { ideal: 270, max: 360 },
      frameRate: { ideal: 15, max: 20 }
    },
    bitrate: 400000 // 400 Kbps
  }
};

// Auto-detect best performance mode
export const getAutoPerformanceMode = () => {
  const caps = detectDeviceCapabilities();
  
  if (caps.isSlowNetwork || (caps.isLowEnd && caps.hasLowMemory)) {
    return 'low';
  }
  
  if (caps.isLowEnd || caps.isMobile) {
    return 'performance';
  }
  
  if (caps.cores >= 8 && !caps.isMobile) {
    return 'high';
  }
  
  return 'balanced';
};

// Bitrate settings for WebRTC
export const getBitrateSettings = (mode) => {
  const settings = PERFORMANCE_MODES[mode] || PERFORMANCE_MODES.balanced;
  return {
    maxBitrate: settings.bitrate,
    minBitrate: settings.bitrate * 0.3,
    startBitrate: settings.bitrate * 0.7
  };
};

// Apply bitrate constraints to RTCPeerConnection
export const applyBitrateConstraints = async (peerConnection, targetBitrate) => {
  if (!peerConnection) return;
  
  const senders = peerConnection.getSenders();
  for (const sender of senders) {
    if (sender.track?.kind === 'video') {
      const params = sender.getParameters();
      if (!params.encodings) {
        params.encodings = [{}];
      }
      
      params.encodings[0].maxBitrate = targetBitrate;
      
      try {
        await sender.setParameters(params);
      } catch (e) {
        console.warn('Failed to set bitrate:', e);
      }
    }
  }
};

// Debounce utility for socket events
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle utility for frequent events
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// RAF-based throttle for animation
export const rafThrottle = (callback) => {
  let requestId = null;
  let lastArgs = null;
  
  const later = () => {
    requestId = null;
    callback(...lastArgs);
  };
  
  return function(...args) {
    lastArgs = args;
    if (requestId === null) {
      requestId = requestAnimationFrame(later);
    }
  };
};

// Memory cleanup helper
export const cleanupStream = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      track.enabled = false;
    });
  }
};

export default {
  detectDeviceCapabilities,
  PERFORMANCE_MODES,
  getAutoPerformanceMode,
  getBitrateSettings,
  applyBitrateConstraints,
  debounce,
  throttle,
  rafThrottle,
  cleanupStream
};
