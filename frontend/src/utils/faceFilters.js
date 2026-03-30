/**
 * Real Face Filters System - Snapchat/TikTok Style
 * 
 * Uses MediaPipe Face Mesh for real-time face tracking with:
 * - 468 face landmarks
 * - Real-time face-attached overlays
 * - Face distortion effects
 * - Canvas rendering for WebRTC output
 * 
 * RULES:
 * - First 3 filters are FREE
 * - Remaining filters are PREMIUM
 * - Filters are applied to outgoing WebRTC stream
 * - Both local and remote users see the SAME filter
 */

// Face landmark indices for key features
export const FACE_LANDMARKS = {
  // Eyes
  leftEye: {
    center: 159,
    inner: 133,
    outer: 33,
    top: 159,
    bottom: 145,
    iris: 468, // Left iris center
  },
  rightEye: {
    center: 386,
    inner: 362,
    outer: 263,
    top: 386,
    bottom: 374,
    iris: 473, // Right iris center
  },
  // Eyebrows
  leftEyebrow: {
    inner: 107,
    middle: 66,
    outer: 105,
  },
  rightEyebrow: {
    inner: 336,
    middle: 296,
    outer: 334,
  },
  // Nose
  nose: {
    tip: 1,
    bridge: 6,
    leftNostril: 129,
    rightNostril: 358,
    bottom: 2,
  },
  // Mouth
  mouth: {
    upperLipTop: 13,
    upperLipBottom: 14,
    lowerLipTop: 17,
    lowerLipBottom: 18,
    leftCorner: 61,
    rightCorner: 291,
    center: 13,
  },
  // Face contour
  face: {
    chin: 152,
    leftCheek: 234,
    rightCheek: 454,
    foreheadCenter: 10,
    leftTemple: 127,
    rightTemple: 356,
    jawLeft: 172,
    jawRight: 397,
  },
  // Full contour indices for face outline
  silhouette: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
  ]
};

// ============================================================
// FILTER DEFINITIONS - 12 Real Face Filters
// ============================================================

export const FACE_FILTERS = {
  // === FREE FILTERS (First 3) ===
  
  none: {
    id: 'none',
    name: 'None',
    icon: '⭕',
    premium: false,
    order: 0,
    type: 'none',
    description: 'No filter applied'
  },

  beauty: {
    id: 'beauty',
    name: 'Beauty',
    icon: '✨',
    premium: false,
    order: 1,
    type: 'beauty',
    settings: {
      smoothing: 0.4,
      brighten: 0.12,
      eyeEnlarge: 1.08,
      faceSlim: 0.03,
      skinTone: 'warm'
    },
    description: 'Smooth skin, subtle glow, slightly larger eyes'
  },

  cuteface: {
    id: 'cuteface',
    name: 'Cute Face',
    icon: '🥰',
    premium: false,
    order: 2,
    type: 'cute',
    settings: {
      eyeEnlarge: 1.25,
      faceSlim: 0.08,
      cheekBlush: true,
      sparkles: true,
      softGlow: true
    },
    description: 'Kawaii style - big eyes, soft cheeks, sparkles'
  },

  // === PREMIUM FILTERS ===

  raccoon: {
    id: 'raccoon',
    name: 'Raccoon',
    icon: '🦝',
    premium: true,
    order: 3,
    type: 'mask',
    overlay: 'raccoon',
    settings: {
      eyeMask: true,
      nosePaint: true,
      whiskers: false
    },
    description: 'Raccoon eye mask overlay'
  },

  bigeyes: {
    id: 'bigeyes',
    name: 'Big Eyes',
    icon: '👀',
    premium: true,
    order: 4,
    type: 'distortion',
    settings: {
      eyeEnlarge: 1.5,
      irisEnlarge: 1.3
    },
    description: 'Exaggerated anime-style big eyes'
  },

  bignose: {
    id: 'bignose',
    name: 'Big Nose',
    icon: '👃',
    premium: true,
    order: 5,
    type: 'distortion',
    settings: {
      noseEnlarge: 1.6
    },
    description: 'Funny enlarged nose effect'
  },

  beard: {
    id: 'beard',
    name: 'Beard',
    icon: '🧔',
    premium: true,
    order: 6,
    type: 'overlay',
    overlay: 'beard',
    description: 'Realistic beard overlay'
  },

  cartoon: {
    id: 'cartoon',
    name: 'Cartoon',
    icon: '🎨',
    premium: true,
    order: 7,
    type: 'stylize',
    settings: {
      posterize: 6,
      edgeDetect: true,
      colorBoost: 1.4,
      outline: true
    },
    description: 'Cartoon/comic book style'
  },

  stretch: {
    id: 'stretch',
    name: 'Face Stretch',
    icon: '😵',
    premium: true,
    order: 8,
    type: 'distortion',
    settings: {
      verticalStretch: 1.3,
      horizontalStretch: 0.85
    },
    description: 'Stretched/warped face effect'
  },

  bigsmile: {
    id: 'bigsmile',
    name: 'Big Smile',
    icon: '😁',
    premium: true,
    order: 9,
    type: 'distortion',
    settings: {
      mouthWiden: 1.4,
      mouthCurve: 0.3,
      cheekLift: 0.15
    },
    description: 'Exaggerated happy smile'
  },

  angry: {
    id: 'angry',
    name: 'Angry Face',
    icon: '😠',
    premium: true,
    order: 10,
    type: 'expression',
    settings: {
      eyebrowAngle: -15,
      mouthCurve: -0.2,
      redTint: 0.15,
      veinOverlay: true
    },
    description: 'Angry expression with red tint'
  },

  cybermask: {
    id: 'cybermask',
    name: 'Cyber Mask',
    icon: '🤖',
    premium: true,
    order: 11,
    type: 'mask',
    overlay: 'cyber',
    settings: {
      neonGlow: true,
      glitchEffect: false,
      scanlines: true
    },
    description: 'Futuristic neon cyber mask'
  }
};

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

// Check if filter is free
export const isFilterFree = (filterId) => {
  const filter = getFilter(filterId);
  return !filter.premium;
};

// ============================================================
// FACE FILTER PROCESSOR CLASS
// ============================================================

export class FaceFilterProcessor {
  constructor() {
    this.faceMesh = null;
    this.isInitialized = false;
    this.isProcessing = false;
    this.currentFilter = 'none';
    this.landmarks = null;
    this.canvas = null;
    this.ctx = null;
    this.animationFrame = null;
    this.videoElement = null;
    this.onFrameCallback = null;
    
    // Performance tracking
    this.lastFrameTime = 0;
    this.targetFPS = 30;
    this.frameInterval = 1000 / this.targetFPS;
    
    // Reduce FaceMesh calls - process every Nth frame
    this.faceMeshFrameSkip = 2; // Process face every 2 frames
    this.frameCount = 0;
    this.lastFaceMeshTime = 0;
    this.faceMeshInterval = 50; // Min 50ms between face mesh calls
    
    // Cached overlay images
    this.overlayImages = {};
  }

  async init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });

    // Initialize MediaPipe Face Mesh
    try {
      const { FaceMesh } = await import('@mediapipe/face_mesh');
      
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults((results) => {
        this.handleFaceResults(results);
      });

      this.isInitialized = true;
      console.log('FaceFilterProcessor initialized with MediaPipe');
      return true;
    } catch (error) {
      console.error('Failed to initialize FaceMesh:', error);
      // Fallback to basic processing without face tracking
      this.isInitialized = true;
      return true;
    }
  }

  setFilter(filterId) {
    this.currentFilter = filterId;
    console.log('Filter changed to:', filterId);
  }

  handleFaceResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      this.landmarks = results.multiFaceLandmarks[0];
    } else {
      this.landmarks = null;
    }
  }

  // Main processing loop with OPTIMIZED frame handling
  async startProcessing(video, onFrame) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.videoElement = video;
    this.onFrameCallback = onFrame;
    this.frameCount = 0;

    const processFrame = async (timestamp) => {
      if (!this.isProcessing) return;

      // FPS limiting
      const elapsed = timestamp - this.lastFrameTime;
      if (elapsed >= this.frameInterval) {
        this.lastFrameTime = timestamp;
        this.frameCount++;
        
        await this.processVideoFrame(timestamp);
        this.onFrameCallback?.();
      }

      this.animationFrame = requestAnimationFrame(processFrame);
    };

    this.animationFrame = requestAnimationFrame(processFrame);
  }

  async processVideoFrame(timestamp) {
    if (!this.canvas || !this.ctx || !this.videoElement) return;

    const video = this.videoElement;
    const { videoWidth, videoHeight } = video;
    
    if (!videoWidth || !videoHeight) return;

    // Resize canvas if needed
    if (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
    }

    // Draw base video frame
    this.ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

    // If no filter, just return
    if (this.currentFilter === 'none') return;

    // OPTIMIZATION: Only call FaceMesh every Nth frame and with minimum interval
    const shouldProcessFace = this.faceMesh && 
                              this.isInitialized && 
                              (this.frameCount % this.faceMeshFrameSkip === 0) &&
                              (timestamp - this.lastFaceMeshTime >= this.faceMeshInterval);
    
    if (shouldProcessFace) {
      this.lastFaceMeshTime = timestamp;
      try {
        await this.faceMesh.send({ image: video });
      } catch (e) {
        // Silently handle send errors
      }
    }

    // Apply filter effects based on cached landmarks
    const filter = getFilter(this.currentFilter);
    
    if (this.landmarks) {
      this.applyFilterWithLandmarks(filter, videoWidth, videoHeight);
    } else {
      // Fallback: apply filter without landmarks (basic effects only)
      this.applyBasicFilter(filter, videoWidth, videoHeight);
    }
  }

  // Apply filter effects using face landmarks
  applyFilterWithLandmarks(filter, width, height) {
    const ctx = this.ctx;
    const landmarks = this.landmarks;

    switch (filter.type) {
      case 'beauty':
        this.applyBeautyFilter(filter.settings, width, height);
        break;

      case 'cute':
        this.applyCuteFilter(filter.settings, width, height);
        break;

      case 'mask':
        this.applyMaskOverlay(filter.overlay, width, height);
        break;

      case 'distortion':
        this.applyDistortion(filter.settings, width, height);
        break;

      case 'overlay':
        this.applyOverlay(filter.overlay, width, height);
        break;

      case 'stylize':
        this.applyStylize(filter.settings, width, height);
        break;

      case 'expression':
        this.applyExpression(filter.settings, width, height);
        break;

      default:
        break;
    }
  }

  // Get landmark position in canvas coordinates
  getLandmarkPos(index) {
    if (!this.landmarks || !this.landmarks[index]) return null;
    const lm = this.landmarks[index];
    return {
      x: lm.x * this.canvas.width,
      y: lm.y * this.canvas.height,
      z: lm.z
    };
  }

  // Calculate distance between two landmarks
  getLandmarkDistance(idx1, idx2) {
    const p1 = this.getLandmarkPos(idx1);
    const p2 = this.getLandmarkPos(idx2);
    if (!p1 || !p2) return 0;
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  // ============================================================
  // FILTER IMPLEMENTATIONS
  // ============================================================

  applyBeautyFilter(settings, width, height) {
    const ctx = this.ctx;
    
    // Soft glow overlay
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = settings.skinTone === 'warm' 
      ? 'rgba(255, 220, 180, 0.08)'
      : 'rgba(255, 240, 245, 0.08)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Subtle brightness boost on face area
    if (this.landmarks) {
      const faceCenter = this.getLandmarkPos(FACE_LANDMARKS.nose.tip);
      if (faceCenter) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const gradient = ctx.createRadialGradient(
          faceCenter.x, faceCenter.y, 0,
          faceCenter.x, faceCenter.y, width * 0.3
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${settings.brighten})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }
  }

  applyCuteFilter(settings, width, height) {
    const ctx = this.ctx;

    // Soft pink glow
    if (settings.softGlow) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255, 200, 220, 0.12)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Cheek blush
    if (settings.cheekBlush && this.landmarks) {
      const leftCheek = this.getLandmarkPos(FACE_LANDMARKS.face.leftCheek);
      const rightCheek = this.getLandmarkPos(FACE_LANDMARKS.face.rightCheek);
      
      if (leftCheek && rightCheek) {
        const blushRadius = width * 0.06;
        
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        
        // Left cheek blush
        const leftGrad = ctx.createRadialGradient(
          leftCheek.x, leftCheek.y + blushRadius * 0.3, 0,
          leftCheek.x, leftCheek.y + blushRadius * 0.3, blushRadius
        );
        leftGrad.addColorStop(0, 'rgba(255, 150, 150, 0.35)');
        leftGrad.addColorStop(1, 'rgba(255, 150, 150, 0)');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(0, 0, width, height);
        
        // Right cheek blush
        const rightGrad = ctx.createRadialGradient(
          rightCheek.x, rightCheek.y + blushRadius * 0.3, 0,
          rightCheek.x, rightCheek.y + blushRadius * 0.3, blushRadius
        );
        rightGrad.addColorStop(0, 'rgba(255, 150, 150, 0.35)');
        rightGrad.addColorStop(1, 'rgba(255, 150, 150, 0)');
        ctx.fillStyle = rightGrad;
        ctx.fillRect(0, 0, width, height);
        
        ctx.restore();
      }
    }

    // Sparkles
    if (settings.sparkles && this.landmarks) {
      this.drawSparkles(width, height);
    }
  }

  drawSparkles(width, height) {
    const ctx = this.ctx;
    const time = Date.now() / 1000;
    
    // Get face position for sparkle placement
    const leftEye = this.getLandmarkPos(FACE_LANDMARKS.leftEye.outer);
    const rightEye = this.getLandmarkPos(FACE_LANDMARKS.rightEye.outer);
    const forehead = this.getLandmarkPos(FACE_LANDMARKS.face.foreheadCenter);
    
    if (!leftEye || !rightEye || !forehead) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Sparkle positions around face
    const sparklePositions = [
      { x: leftEye.x - 20, y: leftEye.y - 15 },
      { x: rightEye.x + 20, y: rightEye.y - 15 },
      { x: forehead.x - 30, y: forehead.y - 10 },
      { x: forehead.x + 30, y: forehead.y - 10 },
      { x: forehead.x, y: forehead.y - 25 },
    ];

    sparklePositions.forEach((pos, i) => {
      const phase = time * 3 + i * 1.2;
      const alpha = 0.4 + Math.sin(phase) * 0.3;
      const size = 3 + Math.sin(phase * 0.5) * 2;
      
      // Draw 4-point star sparkle
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const angle = (j * Math.PI / 2) + phase * 0.2;
        const r = j % 2 === 0 ? size : size * 0.3;
        const x = pos.x + Math.cos(angle) * r;
        const y = pos.y + Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  }

  applyMaskOverlay(overlayType, width, height) {
    const ctx = this.ctx;
    
    switch (overlayType) {
      case 'raccoon':
        this.drawRaccoonMask(width, height);
        break;
      case 'cyber':
        this.drawCyberMask(width, height);
        break;
      default:
        break;
    }
  }

  drawRaccoonMask(width, height) {
    const ctx = this.ctx;
    
    const leftEye = this.getLandmarkPos(FACE_LANDMARKS.leftEye.center);
    const rightEye = this.getLandmarkPos(FACE_LANDMARKS.rightEye.center);
    const nose = this.getLandmarkPos(FACE_LANDMARKS.nose.tip);
    const leftOuter = this.getLandmarkPos(FACE_LANDMARKS.leftEye.outer);
    const rightOuter = this.getLandmarkPos(FACE_LANDMARKS.rightEye.outer);
    
    if (!leftEye || !rightEye || !nose || !leftOuter || !rightOuter) return;

    const eyeDistance = this.getLandmarkDistance(
      FACE_LANDMARKS.leftEye.center,
      FACE_LANDMARKS.rightEye.center
    );
    
    const maskWidth = eyeDistance * 0.55;
    const maskHeight = eyeDistance * 0.22;
    
    // Calculate face rotation angle
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    // Left eye mask
    ctx.save();
    ctx.translate(leftEye.x, leftEye.y);
    ctx.rotate(angle - 0.1);
    ctx.fillStyle = 'rgba(25, 25, 25, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, maskWidth, maskHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right eye mask
    ctx.save();
    ctx.translate(rightEye.x, rightEye.y);
    ctx.rotate(angle + 0.1);
    ctx.fillStyle = 'rgba(25, 25, 25, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, maskWidth, maskHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Nose stripe
    const noseWidth = eyeDistance * 0.08;
    ctx.fillStyle = 'rgba(25, 25, 25, 0.75)';
    ctx.beginPath();
    const noseTop = this.getLandmarkPos(FACE_LANDMARKS.nose.bridge);
    if (noseTop) {
      ctx.moveTo(noseTop.x - noseWidth, noseTop.y);
      ctx.lineTo(noseTop.x + noseWidth, noseTop.y);
      ctx.lineTo(nose.x + noseWidth * 0.8, nose.y);
      ctx.lineTo(nose.x - noseWidth * 0.8, nose.y);
      ctx.closePath();
      ctx.fill();
    }

    // Nose tip (pink)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
    ctx.beginPath();
    ctx.ellipse(nose.x, nose.y + 5, eyeDistance * 0.05, eyeDistance * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawCyberMask(width, height) {
    const ctx = this.ctx;
    const time = Date.now() / 1000;
    
    const leftEye = this.getLandmarkPos(FACE_LANDMARKS.leftEye.center);
    const rightEye = this.getLandmarkPos(FACE_LANDMARKS.rightEye.center);
    const forehead = this.getLandmarkPos(FACE_LANDMARKS.face.foreheadCenter);
    const chin = this.getLandmarkPos(FACE_LANDMARKS.face.chin);
    
    if (!leftEye || !rightEye || !forehead || !chin) return;

    const eyeDistance = this.getLandmarkDistance(
      FACE_LANDMARKS.leftEye.center,
      FACE_LANDMARKS.rightEye.center
    );

    ctx.save();

    // Neon glow effect around eyes
    const glowColors = [
      'rgba(124, 58, 237, 0.6)',  // Purple
      'rgba(59, 130, 246, 0.6)',  // Blue
      'rgba(6, 182, 212, 0.6)',   // Cyan
    ];
    const colorIndex = Math.floor(time) % glowColors.length;

    // Left eye cyber frame
    ctx.strokeStyle = glowColors[colorIndex];
    ctx.lineWidth = 3;
    ctx.shadowColor = glowColors[colorIndex];
    ctx.shadowBlur = 15;
    
    const frameWidth = eyeDistance * 0.4;
    const frameHeight = eyeDistance * 0.18;

    // Draw angular cyber frames
    ctx.beginPath();
    ctx.moveTo(leftEye.x - frameWidth, leftEye.y - frameHeight);
    ctx.lineTo(leftEye.x + frameWidth * 0.2, leftEye.y - frameHeight);
    ctx.lineTo(leftEye.x + frameWidth * 0.4, leftEye.y);
    ctx.lineTo(leftEye.x + frameWidth * 0.2, leftEye.y + frameHeight);
    ctx.lineTo(leftEye.x - frameWidth, leftEye.y + frameHeight);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightEye.x + frameWidth, rightEye.y - frameHeight);
    ctx.lineTo(rightEye.x - frameWidth * 0.2, rightEye.y - frameHeight);
    ctx.lineTo(rightEye.x - frameWidth * 0.4, rightEye.y);
    ctx.lineTo(rightEye.x - frameWidth * 0.2, rightEye.y + frameHeight);
    ctx.lineTo(rightEye.x + frameWidth, rightEye.y + frameHeight);
    ctx.closePath();
    ctx.stroke();

    // Circuit lines
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    
    // Forehead circuit
    ctx.beginPath();
    ctx.moveTo(forehead.x - eyeDistance * 0.4, forehead.y);
    ctx.lineTo(forehead.x - eyeDistance * 0.2, forehead.y - 10);
    ctx.lineTo(forehead.x + eyeDistance * 0.2, forehead.y - 10);
    ctx.lineTo(forehead.x + eyeDistance * 0.4, forehead.y);
    ctx.stroke();

    // Scanline effect
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + Math.sin(time * 10) * 0.02})`;
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1);
    }

    ctx.restore();
  }

  applyDistortion(settings, width, height) {
    // For distortion effects, we need to manipulate the image data
    // This is a simplified version - full distortion would require WebGL
    
    if (settings.eyeEnlarge && settings.eyeEnlarge > 1) {
      this.enlargeEyes(settings.eyeEnlarge, width, height);
    }
    
    if (settings.noseEnlarge && settings.noseEnlarge > 1) {
      this.enlargeNose(settings.noseEnlarge, width, height);
    }

    if (settings.mouthWiden) {
      this.widenMouth(settings, width, height);
    }

    if (settings.verticalStretch || settings.horizontalStretch) {
      this.stretchFace(settings, width, height);
    }
  }

  enlargeEyes(scale, width, height) {
    const ctx = this.ctx;
    const leftEye = this.getLandmarkPos(FACE_LANDMARKS.leftEye.center);
    const rightEye = this.getLandmarkPos(FACE_LANDMARKS.rightEye.center);
    
    if (!leftEye || !rightEye) return;

    const eyeDistance = this.getLandmarkDistance(
      FACE_LANDMARKS.leftEye.center,
      FACE_LANDMARKS.rightEye.center
    );
    const eyeRadius = eyeDistance * 0.15;
    const enlargedRadius = eyeRadius * scale;

    // Draw enlarged eye regions (simplified - true distortion needs WebGL)
    [leftEye, rightEye].forEach(eye => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, enlargedRadius, 0, Math.PI * 2);
      ctx.clip();
      
      // Scale from center
      ctx.translate(eye.x, eye.y);
      ctx.scale(scale, scale);
      ctx.translate(-eye.x, -eye.y);
      
      ctx.drawImage(this.canvas, 0, 0);
      ctx.restore();
    });
  }

  enlargeNose(scale, width, height) {
    const ctx = this.ctx;
    const nose = this.getLandmarkPos(FACE_LANDMARKS.nose.tip);
    const bridge = this.getLandmarkPos(FACE_LANDMARKS.nose.bridge);
    
    if (!nose || !bridge) return;

    const noseHeight = Math.abs(nose.y - bridge.y);
    const noseRadius = noseHeight * 0.8;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(nose.x, (nose.y + bridge.y) / 2, noseRadius, noseHeight, 0, 0, Math.PI * 2);
    ctx.clip();
    
    ctx.translate(nose.x, nose.y);
    ctx.scale(scale, scale);
    ctx.translate(-nose.x, -nose.y);
    
    ctx.drawImage(this.canvas, 0, 0);
    ctx.restore();
  }

  widenMouth(settings, width, height) {
    const ctx = this.ctx;
    const leftCorner = this.getLandmarkPos(FACE_LANDMARKS.mouth.leftCorner);
    const rightCorner = this.getLandmarkPos(FACE_LANDMARKS.mouth.rightCorner);
    const mouthCenter = this.getLandmarkPos(FACE_LANDMARKS.mouth.center);
    
    if (!leftCorner || !rightCorner || !mouthCenter) return;

    // Draw smile curve
    if (settings.mouthCurve > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(150, 50, 50, 0.3)';
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      ctx.moveTo(leftCorner.x, leftCorner.y);
      ctx.quadraticCurveTo(
        mouthCenter.x,
        mouthCenter.y + settings.mouthCurve * 30,
        rightCorner.x,
        rightCorner.y
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  stretchFace(settings, width, height) {
    // Simplified stretch effect - draws stretched overlay
    const ctx = this.ctx;
    const chin = this.getLandmarkPos(FACE_LANDMARKS.face.chin);
    const forehead = this.getLandmarkPos(FACE_LANDMARKS.face.foreheadCenter);
    
    if (!chin || !forehead) return;

    const faceCenter = {
      x: (chin.x + forehead.x) / 2,
      y: (chin.y + forehead.y) / 2
    };

    const vStretch = settings.verticalStretch || 1;
    const hStretch = settings.horizontalStretch || 1;

    // Apply stretch transform to face region
    ctx.save();
    ctx.translate(faceCenter.x, faceCenter.y);
    ctx.scale(hStretch, vStretch);
    ctx.translate(-faceCenter.x, -faceCenter.y);
    ctx.globalAlpha = 0.7;
    ctx.drawImage(this.canvas, 0, 0);
    ctx.restore();
  }

  applyOverlay(overlayType, width, height) {
    const ctx = this.ctx;
    
    switch (overlayType) {
      case 'beard':
        this.drawBeard(width, height);
        break;
      default:
        break;
    }
  }

  drawBeard(width, height) {
    const ctx = this.ctx;
    const chin = this.getLandmarkPos(FACE_LANDMARKS.face.chin);
    const leftJaw = this.getLandmarkPos(FACE_LANDMARKS.face.jawLeft);
    const rightJaw = this.getLandmarkPos(FACE_LANDMARKS.face.jawRight);
    const mouthBottom = this.getLandmarkPos(FACE_LANDMARKS.mouth.lowerLipBottom);
    const leftCheek = this.getLandmarkPos(FACE_LANDMARKS.face.leftCheek);
    const rightCheek = this.getLandmarkPos(FACE_LANDMARKS.face.rightCheek);
    
    if (!chin || !leftJaw || !rightJaw || !mouthBottom) return;

    ctx.save();
    
    // Main beard shape
    ctx.fillStyle = 'rgba(40, 30, 25, 0.75)';
    ctx.beginPath();
    ctx.moveTo(leftCheek ? leftCheek.x : leftJaw.x, mouthBottom.y - 10);
    ctx.lineTo(leftJaw.x, leftJaw.y);
    ctx.quadraticCurveTo(chin.x, chin.y + 30, rightJaw.x, rightJaw.y);
    ctx.lineTo(rightCheek ? rightCheek.x : rightJaw.x, mouthBottom.y - 10);
    ctx.closePath();
    ctx.fill();

    // Beard texture (hair-like strokes)
    ctx.strokeStyle = 'rgba(30, 20, 15, 0.4)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 50; i++) {
      const x = leftJaw.x + Math.random() * (rightJaw.x - leftJaw.x);
      const y = mouthBottom.y + Math.random() * (chin.y - mouthBottom.y + 20);
      const length = 5 + Math.random() * 10;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 3, y + length);
      ctx.stroke();
    }

    // Mustache
    const leftMouthCorner = this.getLandmarkPos(FACE_LANDMARKS.mouth.leftCorner);
    const rightMouthCorner = this.getLandmarkPos(FACE_LANDMARKS.mouth.rightCorner);
    const upperLip = this.getLandmarkPos(FACE_LANDMARKS.mouth.upperLipTop);
    const nose = this.getLandmarkPos(FACE_LANDMARKS.nose.tip);
    
    if (leftMouthCorner && rightMouthCorner && upperLip && nose) {
      ctx.fillStyle = 'rgba(40, 30, 25, 0.8)';
      ctx.beginPath();
      ctx.moveTo(leftMouthCorner.x - 10, upperLip.y);
      ctx.quadraticCurveTo(nose.x, nose.y + 5, rightMouthCorner.x + 10, upperLip.y);
      ctx.lineTo(rightMouthCorner.x + 5, upperLip.y + 8);
      ctx.quadraticCurveTo(nose.x, upperLip.y + 5, leftMouthCorner.x - 5, upperLip.y + 8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  applyStylize(settings, width, height) {
    const ctx = this.ctx;
    
    // Cartoon effect - posterize and add outlines
    if (settings.posterize) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const levels = settings.posterize;
      const step = 255 / levels;
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / step) * step;     // R
        data[i + 1] = Math.round(data[i + 1] / step) * step; // G
        data[i + 2] = Math.round(data[i + 2] / step) * step; // B
      }
      
      ctx.putImageData(imageData, 0, 0);
    }

    // Color boost
    if (settings.colorBoost && settings.colorBoost > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = `hsl(0, ${(settings.colorBoost - 1) * 100}%, 50%)`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Outline effect on face
    if (settings.outline && this.landmarks) {
      this.drawFaceOutline(width, height);
    }
  }

  drawFaceOutline(width, height) {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    // Draw face silhouette
    ctx.beginPath();
    FACE_LANDMARKS.silhouette.forEach((idx, i) => {
      const pos = this.getLandmarkPos(idx);
      if (pos) {
        if (i === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      }
    });
    ctx.closePath();
    ctx.stroke();

    // Eye outlines
    const leftEye = this.getLandmarkPos(FACE_LANDMARKS.leftEye.center);
    const rightEye = this.getLandmarkPos(FACE_LANDMARKS.rightEye.center);
    const eyeDistance = this.getLandmarkDistance(
      FACE_LANDMARKS.leftEye.center,
      FACE_LANDMARKS.rightEye.center
    );
    const eyeSize = eyeDistance * 0.12;

    if (leftEye) {
      ctx.beginPath();
      ctx.ellipse(leftEye.x, leftEye.y, eyeSize, eyeSize * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (rightEye) {
      ctx.beginPath();
      ctx.ellipse(rightEye.x, rightEye.y, eyeSize, eyeSize * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  applyExpression(settings, width, height) {
    const ctx = this.ctx;

    // Red tint for angry
    if (settings.redTint) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(255, 100, 100, ${settings.redTint})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Vein overlay effect
    if (settings.veinOverlay && this.landmarks) {
      const forehead = this.getLandmarkPos(FACE_LANDMARKS.face.foreheadCenter);
      const leftTemple = this.getLandmarkPos(FACE_LANDMARKS.face.leftTemple);
      const rightTemple = this.getLandmarkPos(FACE_LANDMARKS.face.rightTemple);
      
      if (forehead && leftTemple && rightTemple) {
        ctx.save();
        ctx.strokeStyle = 'rgba(180, 50, 50, 0.4)';
        ctx.lineWidth = 2;
        
        // Pulsing animation
        const time = Date.now() / 1000;
        const pulse = 0.3 + Math.sin(time * 4) * 0.2;
        ctx.globalAlpha = pulse;
        
        // Draw vein lines
        ctx.beginPath();
        ctx.moveTo(forehead.x - 20, forehead.y - 15);
        ctx.quadraticCurveTo(leftTemple.x + 10, forehead.y, leftTemple.x, leftTemple.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(forehead.x + 20, forehead.y - 15);
        ctx.quadraticCurveTo(rightTemple.x - 10, forehead.y, rightTemple.x, rightTemple.y);
        ctx.stroke();
        
        ctx.restore();
      }
    }

    // Angry eyebrow effect
    if (settings.eyebrowAngle) {
      // Draw angry eyebrow lines
      const leftBrow = this.getLandmarkPos(FACE_LANDMARKS.leftEyebrow.middle);
      const rightBrow = this.getLandmarkPos(FACE_LANDMARKS.rightEyebrow.middle);
      
      if (leftBrow && rightBrow) {
        ctx.save();
        ctx.strokeStyle = 'rgba(80, 40, 40, 0.5)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        const angleRad = (settings.eyebrowAngle * Math.PI) / 180;
        const browLength = 30;
        
        // Left eyebrow - angled down toward center
        ctx.beginPath();
        ctx.moveTo(leftBrow.x - browLength, leftBrow.y + Math.sin(-angleRad) * browLength);
        ctx.lineTo(leftBrow.x + browLength * 0.5, leftBrow.y + Math.sin(angleRad) * browLength * 0.5);
        ctx.stroke();
        
        // Right eyebrow - angled down toward center
        ctx.beginPath();
        ctx.moveTo(rightBrow.x + browLength, rightBrow.y + Math.sin(-angleRad) * browLength);
        ctx.lineTo(rightBrow.x - browLength * 0.5, rightBrow.y + Math.sin(angleRad) * browLength * 0.5);
        ctx.stroke();
        
        ctx.restore();
      }
    }
  }

  // Fallback for when face tracking isn't available
  applyBasicFilter(filter, width, height) {
    const ctx = this.ctx;
    
    switch (filter.type) {
      case 'beauty':
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(255, 220, 200, 0.1)';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        break;
        
      case 'cute':
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(255, 200, 220, 0.15)';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        break;
        
      default:
        // No effect without face tracking for mask/distortion filters
        break;
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
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.landmarks = null;
    this.isInitialized = false;
  }
}

export default {
  FACE_FILTERS,
  FACE_LANDMARKS,
  getOrderedFilters,
  getFreeFilters,
  getPremiumFilters,
  getFilter,
  isFilterFree,
  FaceFilterProcessor
};
