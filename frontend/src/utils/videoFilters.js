/**
 * Video Filters Engine - Real-time camera filter processing
 * 
 * Features:
 * - CSS filter-based for performance
 * - Canvas overlay effects for advanced filters
 * - 60fps processing target
 * - Mobile-optimized
 */

// Filter definitions with CSS values and canvas overlays
export const VIDEO_FILTERS = {
  // === NO FILTER ===
  none: {
    id: 'none',
    name: 'None',
    icon: '⭕',
    category: 'basic',
    premium: false,
    css: 'none',
    overlay: null
  },

  // === BEAUTY FILTERS ===
  beauty: {
    id: 'beauty',
    name: 'Beauty',
    icon: '✨',
    category: 'beauty',
    premium: false,
    css: 'brightness(1.08) contrast(1.02) saturate(1.12)',
    overlay: null
  },
  smooth: {
    id: 'smooth',
    name: 'Smooth',
    icon: '🌸',
    category: 'beauty',
    premium: false,
    css: 'brightness(1.1) contrast(0.95) saturate(1.08) blur(0.3px)',
    overlay: null
  },
  glow: {
    id: 'glow',
    name: 'Glow',
    icon: '💫',
    category: 'beauty',
    premium: false,
    css: 'brightness(1.15) contrast(1.0) saturate(1.1)',
    overlay: {
      type: 'radialGradient',
      color: 'rgba(255, 255, 255, 0.08)',
      blend: 'screen'
    }
  },

  // === COLOR TONE / CINEMATIC FILTERS ===
  warm: {
    id: 'warm',
    name: 'Warm',
    icon: '🌅',
    category: 'cinematic',
    premium: false,
    css: 'brightness(1.05) sepia(0.2) saturate(1.3) contrast(1.02)',
    overlay: null
  },
  cool: {
    id: 'cool',
    name: 'Cool',
    icon: '❄️',
    category: 'cinematic',
    premium: false,
    css: 'brightness(1.05) saturate(0.9) hue-rotate(12deg) contrast(1.05)',
    overlay: null
  },
  vintage: {
    id: 'vintage',
    name: 'Vintage',
    icon: '📷',
    category: 'cinematic',
    premium: false,
    css: 'sepia(0.35) contrast(1.1) brightness(0.95) saturate(0.8)',
    overlay: {
      type: 'vignette',
      color: 'rgba(0, 0, 0, 0.2)',
      blend: 'multiply'
    }
  },
  noir: {
    id: 'noir',
    name: 'B&W',
    icon: '🖤',
    category: 'cinematic',
    premium: false,
    css: 'grayscale(1) contrast(1.15) brightness(1.05)',
    overlay: null
  },
  cinematic: {
    id: 'cinematic',
    name: 'Cinema',
    icon: '🎬',
    category: 'cinematic',
    premium: true,
    css: 'contrast(1.2) saturate(1.25) brightness(0.98)',
    overlay: {
      type: 'letterbox',
      color: 'rgba(0, 0, 0, 0.9)',
      size: 0.08
    }
  },

  // === FUN / RACCOON-INSPIRED EFFECTS ===
  raccoon: {
    id: 'raccoon',
    name: 'Raccoon',
    icon: '🦝',
    category: 'fun',
    premium: true,
    css: 'contrast(1.1) brightness(1.02) saturate(0.95)',
    overlay: {
      type: 'raccoonMask',
      color: 'rgba(30, 30, 30, 0.4)',
      blend: 'multiply'
    }
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    icon: '🌈',
    category: 'fun',
    premium: true,
    css: 'brightness(1.15) contrast(1.3) saturate(1.5)',
    overlay: {
      type: 'gradient',
      colors: ['rgba(124, 58, 237, 0.1)', 'rgba(236, 72, 153, 0.1)', 'rgba(59, 130, 246, 0.1)'],
      blend: 'screen'
    }
  },
  sparkle: {
    id: 'sparkle',
    name: 'Sparkle',
    icon: '✨',
    category: 'fun',
    premium: true,
    css: 'brightness(1.12) contrast(1.05) saturate(1.2)',
    overlay: {
      type: 'sparkle',
      color: 'rgba(255, 255, 255, 0.1)',
      blend: 'screen',
      animated: true
    }
  },
  vhs: {
    id: 'vhs',
    name: 'VHS',
    icon: '📼',
    category: 'fun',
    premium: true,
    css: 'brightness(1.05) contrast(1.2) saturate(1.2) hue-rotate(-3deg)',
    overlay: {
      type: 'scanlines',
      color: 'rgba(255, 255, 255, 0.03)',
      blend: 'overlay'
    }
  },
  dreamy: {
    id: 'dreamy',
    name: 'Dreamy',
    icon: '☁️',
    category: 'fun',
    premium: true,
    css: 'brightness(1.1) contrast(0.9) saturate(1.1) blur(0.4px)',
    overlay: {
      type: 'radialGradient',
      color: 'rgba(255, 255, 255, 0.12)',
      blend: 'screen'
    }
  }
};

// Filter categories for organized display
export const FILTER_CATEGORIES = {
  basic: { name: 'Basic', order: 0 },
  beauty: { name: 'Beauty', order: 1 },
  cinematic: { name: 'Cinematic', order: 2 },
  fun: { name: 'Fun', order: 3 }
};

// Get ordered filter list
export const getOrderedFilters = () => {
  return Object.values(VIDEO_FILTERS).sort((a, b) => {
    const catOrderA = FILTER_CATEGORIES[a.category]?.order || 99;
    const catOrderB = FILTER_CATEGORIES[b.category]?.order || 99;
    return catOrderA - catOrderB;
  });
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

/**
 * Canvas overlay renderer for advanced effects
 * Called by the video filter component when overlay is needed
 */
export const renderOverlay = (ctx, filter, width, height, time = 0) => {
  if (!filter?.overlay) return;
  
  const { type, color, blend, colors, size, animated } = filter.overlay;
  
  ctx.save();
  if (blend) ctx.globalCompositeOperation = blend;
  
  switch (type) {
    case 'radialGradient': {
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    
    case 'vignette': {
      const vGradient = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.8
      );
      vGradient.addColorStop(0, 'transparent');
      vGradient.addColorStop(1, color);
      ctx.fillStyle = vGradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    
    case 'gradient': {
      if (colors && colors.length >= 2) {
        const lGradient = ctx.createLinearGradient(0, 0, width, height);
        colors.forEach((c, i) => lGradient.addColorStop(i / (colors.length - 1), c));
        ctx.fillStyle = lGradient;
        ctx.fillRect(0, 0, width, height);
      }
      break;
    }
    
    case 'letterbox': {
      const barHeight = height * (size || 0.1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, barHeight);
      ctx.fillRect(0, height - barHeight, width, barHeight);
      break;
    }
    
    case 'scanlines': {
      ctx.fillStyle = color;
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }
      break;
    }
    
    case 'sparkle': {
      // Animated sparkle effect
      const sparkleOpacity = animated 
        ? 0.05 + Math.sin(time * 3) * 0.03
        : 0.08;
      ctx.fillStyle = color.replace('0.1', sparkleOpacity.toString());
      ctx.fillRect(0, 0, width, height);
      break;
    }
    
    case 'raccoonMask': {
      // Simple raccoon eye mask effect
      ctx.fillStyle = color;
      const eyeY = height * 0.35;
      const eyeWidth = width * 0.25;
      const eyeHeight = height * 0.1;
      
      // Left eye mask
      ctx.beginPath();
      ctx.ellipse(width * 0.32, eyeY, eyeWidth, eyeHeight, -0.15, 0, Math.PI * 2);
      ctx.fill();
      
      // Right eye mask  
      ctx.beginPath();
      ctx.ellipse(width * 0.68, eyeY, eyeWidth, eyeHeight, 0.15, 0, Math.PI * 2);
      ctx.fill();
      
      // Nose stripe
      ctx.beginPath();
      ctx.moveTo(width * 0.45, height * 0.42);
      ctx.lineTo(width * 0.55, height * 0.42);
      ctx.lineTo(width * 0.52, height * 0.55);
      ctx.lineTo(width * 0.48, height * 0.55);
      ctx.closePath();
      ctx.fill();
      break;
    }
    
    default:
      break;
  }
  
  ctx.restore();
};

/**
 * Performance-optimized filter application
 * Uses CSS filters for speed, canvas overlays only when needed
 */
export class VideoFilterEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animationFrame = null;
    this.currentFilter = 'none';
    this.isProcessing = false;
    this.startTime = Date.now();
  }
  
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d', { 
      alpha: false,
      desynchronized: true // Better performance
    });
  }
  
  setFilter(filterId) {
    this.currentFilter = filterId;
  }
  
  // Process a single frame with overlay (for filters that need canvas)
  processFrame(video) {
    if (!this.canvas || !this.ctx || !video) return;
    
    const filter = getFilter(this.currentFilter);
    if (!filter.overlay) return; // No canvas processing needed
    
    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) return;
    
    // Resize canvas if needed
    if (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
    }
    
    // Apply CSS filter
    this.ctx.filter = filter.css;
    this.ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    
    // Apply overlay
    const time = (Date.now() - this.startTime) / 1000;
    renderOverlay(this.ctx, filter, videoWidth, videoHeight, time);
  }
  
  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.canvas = null;
    this.ctx = null;
    this.isProcessing = false;
  }
}

export default {
  VIDEO_FILTERS,
  FILTER_CATEGORIES,
  getOrderedFilters,
  getFilter,
  getCSSFilter,
  renderOverlay,
  VideoFilterEngine
};
