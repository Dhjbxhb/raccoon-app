/**
 * Face-Focused Filters System
 * 
 * RULES:
 * - First 3 filters (None, Beauty, Warm Glow) are FREE
 * - All other filters are PREMIUM
 * - Filters affect the FACE/camera feed - NOT the background
 * - Filters are applied via canvas processing → WebRTC pipeline
 * - BOTH users see the SAME filtered video
 * 
 * Pipeline: camera → canvas → apply filter → captureStream → WebRTC
 */

// ============================================================
// FACE FILTER DEFINITIONS
// ============================================================

export const FACE_FILTERS = {
  // === FREE FILTERS (First 3) ===
  
  none: {
    id: 'none',
    name: 'None',
    icon: '⭕',
    premium: false,
    order: 0,
    css: 'none',
    description: 'Original camera view'
  },

  beauty: {
    id: 'beauty',
    name: 'Beauty',
    icon: '✨',
    premium: false,
    order: 1,
    css: 'brightness(1.08) contrast(0.98) saturate(1.12) blur(0.2px)',
    description: 'Soft skin + slight brightness'
  },

  warm: {
    id: 'warm',
    name: 'Warm Glow',
    icon: '🌅',
    premium: false,
    order: 2,
    css: 'brightness(1.06) sepia(0.12) saturate(1.2) contrast(1.02)',
    description: 'Warm face tone enhancement'
  },

  // === PREMIUM FILTERS ===

  cool: {
    id: 'cool',
    name: 'Cool',
    icon: '❄️',
    premium: true,
    order: 3,
    css: 'brightness(1.04) saturate(0.9) hue-rotate(8deg) contrast(1.05)',
    description: 'Slight blue tone on face'
  },

  vintage: {
    id: 'vintage',
    name: 'Vintage',
    icon: '📷',
    premium: true,
    order: 4,
    css: 'sepia(0.22) contrast(1.08) brightness(0.98) saturate(0.88)',
    hasOverlay: true,
    overlayType: 'vignette',
    description: 'Soft sepia on face'
  },

  noir: {
    id: 'noir',
    name: 'B&W',
    icon: '🖤',
    premium: true,
    order: 5,
    css: 'grayscale(1) contrast(1.12) brightness(1.02)',
    description: 'Clean black & white'
  },

  glow: {
    id: 'glow',
    name: 'Soft Glow',
    icon: '💫',
    premium: true,
    order: 6,
    css: 'brightness(1.12) contrast(0.94) saturate(1.08) blur(0.3px)',
    description: 'Light blur + glow effect'
  },

  neon: {
    id: 'neon',
    name: 'Neon',
    icon: '🌈',
    premium: true,
    order: 7,
    css: 'brightness(1.08) contrast(1.18) saturate(1.35)',
    hasOverlay: true,
    overlayType: 'neonEdge',
    description: 'Subtle glow edges'
  },

  dreamy: {
    id: 'dreamy',
    name: 'Dreamy',
    icon: '☁️',
    premium: true,
    order: 8,
    css: 'brightness(1.1) contrast(0.88) saturate(1.05) blur(0.4px)',
    hasOverlay: true,
    overlayType: 'softVignette',
    description: 'Soft cinematic blur'
  }
};

// ============================================================
// FILTER HELPERS
// ============================================================

// Get ordered filter list
export const getOrderedFilters = () => {
  return Object.values(FACE_FILTERS).sort((a, b) => a.order - b.order);
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
  return FACE_FILTERS[filterId] || FACE_FILTERS.none;
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

// ============================================================
// OVERLAY RENDERING (for filters that need canvas overlays)
// ============================================================

export const renderOverlay = (ctx, filter, width, height) => {
  if (!filter?.hasOverlay || !filter.overlayType) return;
  
  ctx.save();
  
  switch (filter.overlayType) {
    case 'vignette': {
      // Subtle vignette - darker edges, faces centered
      ctx.globalCompositeOperation = 'multiply';
      const vGradient = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.7
      );
      vGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      vGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.98)');
      vGradient.addColorStop(1, 'rgba(200, 180, 160, 0.85)');
      ctx.fillStyle = vGradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    
    case 'softVignette': {
      // Very soft vignette for dreamy effect
      ctx.globalCompositeOperation = 'multiply';
      const svGradient = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.35,
        width / 2, height / 2, Math.max(width, height) * 0.8
      );
      svGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      svGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.98)');
      svGradient.addColorStop(1, 'rgba(240, 230, 255, 0.92)');
      ctx.fillStyle = svGradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    
    case 'neonEdge': {
      // Subtle neon glow on edges (not background effect)
      ctx.globalCompositeOperation = 'screen';
      
      // Top edge glow
      const topGlow = ctx.createLinearGradient(0, 0, 0, height * 0.15);
      topGlow.addColorStop(0, 'rgba(124, 58, 237, 0.12)');
      topGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, width, height * 0.15);
      
      // Bottom edge glow
      const bottomGlow = ctx.createLinearGradient(0, height * 0.85, 0, height);
      bottomGlow.addColorStop(0, 'transparent');
      bottomGlow.addColorStop(1, 'rgba(236, 72, 153, 0.1)');
      ctx.fillStyle = bottomGlow;
      ctx.fillRect(0, height * 0.85, width, height * 0.15);
      
      // Side glow accents
      const leftGlow = ctx.createLinearGradient(0, 0, width * 0.08, 0);
      leftGlow.addColorStop(0, 'rgba(59, 130, 246, 0.08)');
      leftGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = leftGlow;
      ctx.fillRect(0, 0, width * 0.08, height);
      
      const rightGlow = ctx.createLinearGradient(width * 0.92, 0, width, 0);
      rightGlow.addColorStop(0, 'transparent');
      rightGlow.addColorStop(1, 'rgba(59, 130, 246, 0.08)');
      ctx.fillStyle = rightGlow;
      ctx.fillRect(width * 0.92, 0, width * 0.08, height);
      break;
    }
    
    default:
      break;
  }
  
  ctx.restore();
};

// ============================================================
// FACE FILTER PROCESSOR CLASS
// ============================================================

export class FaceFilterProcessor {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.currentFilter = 'none';
    this.isProcessing = false;
    this.animationFrame = null;
    this.videoElement = null;
    this.onFrameCallback = null;
    
    // Performance: target 30 FPS
    this.targetFPS = 30;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    console.log('FaceFilterProcessor initialized');
    return true;
  }

  setFilter(filterId) {
    this.currentFilter = filterId;
    console.log('Filter changed to:', filterId);
  }

  // Start processing loop
  startProcessing(video, onFrame) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.videoElement = video;
    this.onFrameCallback = onFrame;

    const processFrame = (timestamp) => {
      if (!this.isProcessing) return;

      // FPS limiting
      const elapsed = timestamp - this.lastFrameTime;
      if (elapsed >= this.frameInterval) {
        this.lastFrameTime = timestamp;
        this.processVideoFrame();
        this.onFrameCallback?.();
      }

      this.animationFrame = requestAnimationFrame(processFrame);
    };

    this.animationFrame = requestAnimationFrame(processFrame);
  }

  processVideoFrame() {
    if (!this.canvas || !this.ctx || !this.videoElement) return;

    const video = this.videoElement;
    const { videoWidth, videoHeight } = video;
    
    if (!videoWidth || !videoHeight) return;

    // Resize canvas if needed
    if (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
    }

    const filter = getFilter(this.currentFilter);

    // Apply CSS filter and draw
    this.ctx.filter = filter.css;
    this.ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    
    // Reset filter before overlay
    this.ctx.filter = 'none';
    
    // Apply overlay effect if needed
    if (filter.hasOverlay) {
      renderOverlay(this.ctx, filter, videoWidth, videoHeight);
    }
  }

  stopProcessing() {
    this.isProcessing = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  getCanvasStream(frameRate = 30) {
    if (!this.canvas) return null;
    return this.canvas.captureStream(frameRate);
  }

  destroy() {
    this.stopProcessing();
    this.canvas = null;
    this.ctx = null;
    this.videoElement = null;
  }
}

export default {
  FACE_FILTERS,
  getOrderedFilters,
  getFreeFilters,
  getPremiumFilters,
  getFilter,
  getCSSFilter,
  isFilterFree,
  renderOverlay,
  FaceFilterProcessor
};
