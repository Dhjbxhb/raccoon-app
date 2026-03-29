/**
 * Video Filters Engine - Premium Face-Focused Filters
 * 
 * RULES:
 * - First 3 filters are FREE (None, Beauty, Warm Cinematic)
 * - Raccoon Identity is premium but as a special identity filter
 * - All other filters are PREMIUM
 * - Filters are applied to the video track via canvas processing
 * - Both local and remote users see the filtered video
 */

// ============================================================
// FILTER DEFINITIONS
// ============================================================

export const VIDEO_FILTERS = {
  // === FREE FILTERS (First 3) ===
  
  // 1. No filter
  none: {
    id: 'none',
    name: 'None',
    icon: '⭕',
    category: 'free',
    premium: false,
    order: 0,
    css: 'none',
    description: 'Original camera view'
  },

  // 2. Beauty / Smooth Face Enhancement (FREE)
  beauty: {
    id: 'beauty',
    name: 'Beauty',
    icon: '✨',
    category: 'free',
    premium: false,
    order: 1,
    css: 'brightness(1.08) contrast(0.98) saturate(1.1) blur(0.2px)',
    description: 'Soft skin enhancement'
  },

  // 3. Warm Cinematic Face Tone (FREE)
  warm: {
    id: 'warm',
    name: 'Warm Glow',
    icon: '🌅',
    category: 'free',
    premium: false,
    order: 2,
    css: 'brightness(1.06) sepia(0.15) saturate(1.25) contrast(1.03)',
    description: 'Warm cinematic face tone'
  },

  // === PREMIUM FILTERS ===

  // Raccoon Identity Effect (PREMIUM - Special)
  raccoon: {
    id: 'raccoon',
    name: 'Raccoon',
    icon: '🦝',
    category: 'identity',
    premium: true,
    order: 3,
    css: 'contrast(1.12) brightness(1.0) saturate(0.92)',
    hasOverlay: true,
    overlayType: 'raccoonMask',
    description: 'Raccoon eye mask effect'
  },

  // Cool Tone (PREMIUM)
  cool: {
    id: 'cool',
    name: 'Cool',
    icon: '❄️',
    category: 'cinematic',
    premium: true,
    order: 4,
    css: 'brightness(1.04) saturate(0.88) hue-rotate(10deg) contrast(1.06)',
    description: 'Cool blue face tone'
  },

  // Glow / Soft Light (PREMIUM)
  glow: {
    id: 'glow',
    name: 'Soft Glow',
    icon: '💫',
    category: 'beauty',
    premium: true,
    order: 5,
    css: 'brightness(1.12) contrast(0.95) saturate(1.08) blur(0.3px)',
    description: 'Dreamy soft glow effect'
  },

  // Vintage Film (PREMIUM)
  vintage: {
    id: 'vintage',
    name: 'Vintage',
    icon: '📷',
    category: 'cinematic',
    premium: true,
    order: 6,
    css: 'sepia(0.25) contrast(1.1) brightness(0.96) saturate(0.85)',
    hasOverlay: true,
    overlayType: 'vignette',
    description: 'Classic film look'
  },

  // Black & White (PREMIUM)
  noir: {
    id: 'noir',
    name: 'B&W',
    icon: '🖤',
    category: 'cinematic',
    premium: true,
    order: 7,
    css: 'grayscale(1) contrast(1.15) brightness(1.02)',
    description: 'Dramatic black & white'
  },

  // Cinematic Widescreen (PREMIUM)
  cinema: {
    id: 'cinema',
    name: 'Cinema',
    icon: '🎬',
    category: 'cinematic',
    premium: true,
    order: 8,
    css: 'contrast(1.18) saturate(1.2) brightness(0.98)',
    hasOverlay: true,
    overlayType: 'letterbox',
    description: 'Cinematic movie look'
  },

  // Neon Glow (PREMIUM)
  neon: {
    id: 'neon',
    name: 'Neon',
    icon: '🌈',
    category: 'fun',
    premium: true,
    order: 9,
    css: 'brightness(1.1) contrast(1.25) saturate(1.45)',
    hasOverlay: true,
    overlayType: 'neonGlow',
    description: 'Vibrant neon colors'
  },

  // VHS Retro (PREMIUM)
  vhs: {
    id: 'vhs',
    name: 'VHS',
    icon: '📼',
    category: 'fun',
    premium: true,
    order: 10,
    css: 'brightness(1.04) contrast(1.2) saturate(1.15) hue-rotate(-3deg)',
    hasOverlay: true,
    overlayType: 'scanlines',
    description: 'Retro VHS effect'
  },

  // Dreamy Soft (PREMIUM)
  dreamy: {
    id: 'dreamy',
    name: 'Dreamy',
    icon: '☁️',
    category: 'beauty',
    premium: true,
    order: 11,
    css: 'brightness(1.1) contrast(0.88) saturate(1.05) blur(0.4px)',
    description: 'Soft dreamy atmosphere'
  }
};

// Filter categories for organized display
export const FILTER_CATEGORIES = {
  free: { name: 'Free', order: 0 },
  identity: { name: 'Identity', order: 1 },
  beauty: { name: 'Beauty', order: 2 },
  cinematic: { name: 'Cinematic', order: 3 },
  fun: { name: 'Fun', order: 4 }
};

// Get ordered filter list
export const getOrderedFilters = () => {
  return Object.values(VIDEO_FILTERS).sort((a, b) => a.order - b.order);
};

// Get free filters only
export const getFreeFilters = () => {
  return getOrderedFilters().filter(f => !f.premium);
};

// Get premium filters only
export const getPremiumFilters = () => {
  return getOrderedFilters().filter(f => f.premium);
};

// Get filter by ID
export const getFilter = (filterId) => {
  return VIDEO_FILTERS[filterId] || VIDEO_FILTERS.none;
};

// Get CSS filter string
export const getCSSFilter = (filterId) => {
  const filter = getFilter(filterId);
  return filter.css;
};

// Check if filter is free
export const isFilterFree = (filterId) => {
  const filter = getFilter(filterId);
  return !filter.premium;
};

/**
 * Render overlay effects on canvas
 * Used for filters that need more than CSS (raccoon mask, vignette, etc.)
 */
export const renderOverlay = (ctx, filter, width, height) => {
  if (!filter?.hasOverlay || !filter.overlayType) return;
  
  ctx.save();
  
  switch (filter.overlayType) {
    case 'raccoonMask': {
      // Premium raccoon eye mask effect
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(30, 30, 30, 0.35)';
      
      const eyeY = height * 0.36;
      const eyeWidth = width * 0.22;
      const eyeHeight = height * 0.09;
      
      // Left eye mask
      ctx.beginPath();
      ctx.ellipse(width * 0.33, eyeY, eyeWidth, eyeHeight, -0.12, 0, Math.PI * 2);
      ctx.fill();
      
      // Right eye mask  
      ctx.beginPath();
      ctx.ellipse(width * 0.67, eyeY, eyeWidth, eyeHeight, 0.12, 0, Math.PI * 2);
      ctx.fill();
      
      // Nose stripe
      ctx.beginPath();
      ctx.moveTo(width * 0.46, height * 0.44);
      ctx.lineTo(width * 0.54, height * 0.44);
      ctx.lineTo(width * 0.52, height * 0.54);
      ctx.lineTo(width * 0.48, height * 0.54);
      ctx.closePath();
      ctx.fill();
      break;
    }
    
    case 'vignette': {
      ctx.globalCompositeOperation = 'multiply';
      const vGradient = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.25,
        width / 2, height / 2, Math.max(width, height) * 0.75
      );
      vGradient.addColorStop(0, 'transparent');
      vGradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      ctx.fillStyle = vGradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    
    case 'letterbox': {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
      const barHeight = height * 0.08;
      ctx.fillRect(0, 0, width, barHeight);
      ctx.fillRect(0, height - barHeight, width, barHeight);
      break;
    }
    
    case 'neonGlow': {
      ctx.globalCompositeOperation = 'screen';
      const neonGradient = ctx.createLinearGradient(0, 0, width, height);
      neonGradient.addColorStop(0, 'rgba(124, 58, 237, 0.08)');
      neonGradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.06)');
      neonGradient.addColorStop(1, 'rgba(59, 130, 246, 0.08)');
      ctx.fillStyle = neonGradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    
    case 'scanlines': {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }
      break;
    }
    
    default:
      break;
  }
  
  ctx.restore();
};

/**
 * VideoFilterProcessor - Canvas-based filter processing
 * Processes video frames and outputs to canvas for WebRTC capture
 */
export class VideoFilterProcessor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.currentFilter = 'none';
    this.isProcessing = false;
    this.animationFrame = null;
    this.targetFPS = 30; // Target 30fps for performance
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / this.targetFPS;
  }
  
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d', { 
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
  }
  
  setFilter(filterId) {
    this.currentFilter = filterId;
  }
  
  // Process a video frame with the current filter
  processFrame(video, timestamp = 0) {
    if (!this.canvas || !this.ctx || !video) return;
    
    // FPS limiting
    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed < this.frameInterval) return;
    this.lastFrameTime = timestamp;
    
    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) return;
    
    // Resize canvas if needed
    if (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
    }
    
    const filter = getFilter(this.currentFilter);
    
    // Apply CSS filter
    this.ctx.filter = filter.css;
    this.ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    
    // Reset filter before overlay
    this.ctx.filter = 'none';
    
    // Apply overlay effect if needed
    if (filter.hasOverlay) {
      renderOverlay(this.ctx, filter, videoWidth, videoHeight);
    }
  }
  
  // Start continuous processing loop
  startProcessing(video, onFrame) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    const loop = (timestamp) => {
      if (!this.isProcessing) return;
      
      this.processFrame(video, timestamp);
      onFrame?.();
      
      this.animationFrame = requestAnimationFrame(loop);
    };
    
    this.animationFrame = requestAnimationFrame(loop);
  }
  
  stopProcessing() {
    this.isProcessing = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  // Get the canvas stream for WebRTC
  getCanvasStream(frameRate = 30) {
    if (!this.canvas) return null;
    return this.canvas.captureStream(frameRate);
  }
  
  destroy() {
    this.stopProcessing();
    this.canvas = null;
    this.ctx = null;
  }
}

export default {
  VIDEO_FILTERS,
  FILTER_CATEGORIES,
  getOrderedFilters,
  getFreeFilters,
  getPremiumFilters,
  getFilter,
  getCSSFilter,
  isFilterFree,
  renderOverlay,
  VideoFilterProcessor
};
