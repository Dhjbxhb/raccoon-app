import { useState, useRef, useCallback, useEffect } from 'react';

// Filter presets - Snapchat-style categories
// Categories: None, Beauty, Raccoon Mask, Color Tones, Fun Effects
export const CAMERA_FILTERS = {
  // No filter (center default)
  none: { name: 'No Filter', icon: '⭕', premium: false, category: 'none' },
  
  // Beauty filters
  beauty: { name: 'Beauty', icon: '✨', premium: false, category: 'beauty' },
  smooth: { name: 'Smooth', icon: '🌸', premium: false, category: 'beauty' },
  glow: { name: 'Glow', icon: '💡', premium: false, category: 'beauty' },
  
  // Raccoon mask & animal filters
  raccoon: { name: 'Raccoon', icon: '🦝', premium: true, category: 'mask' },
  cat: { name: 'Cat', icon: '🐱', premium: true, category: 'mask' },
  dog: { name: 'Dog', icon: '🐶', premium: true, category: 'mask' },
  
  // Color tones
  warm: { name: 'Warm', icon: '🌅', premium: false, category: 'color' },
  cool: { name: 'Cool', icon: '❄️', premium: false, category: 'color' },
  vintage: { name: 'Vintage', icon: '📷', premium: false, category: 'color' },
  bw: { name: 'B&W', icon: '🖤', premium: false, category: 'color' },
  
  // Fun effects
  neon: { name: 'Neon', icon: '🌈', premium: true, category: 'fun' },
  sparkle: { name: 'Sparkle', icon: '💫', premium: true, category: 'fun' },
  vhs: { name: 'VHS', icon: '📼', premium: true, category: 'fun' },
  comic: { name: 'Comic', icon: '💥', premium: true, category: 'fun' },
  dreamy: { name: 'Dreamy', icon: '☁️', premium: true, category: 'fun' },
};

export const useCameraFilters = (videoRef, canvasRef) => {
  const [currentFilter, setCurrentFilter] = useState('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const animationRef = useRef(null);
  const contextRef = useRef(null);

  // Apply CSS filter effects - optimized for real-time performance
  const getFilterStyle = useCallback((filter) => {
    switch (filter) {
      // Beauty filters
      case 'beauty':
        return 'brightness(1.08) contrast(1.05) saturate(1.15)';
      case 'smooth':
        return 'brightness(1.1) contrast(0.92) saturate(1.08) blur(0.4px)';
      case 'glow':
        return 'brightness(1.15) contrast(1.02) saturate(1.1)';
      
      // Mask filters (color overlay effect)
      case 'raccoon':
        return 'contrast(1.15) brightness(1.02) saturate(0.9)';
      case 'cat':
        return 'brightness(1.05) contrast(1.1) saturate(1.2)';
      case 'dog':
        return 'brightness(1.08) contrast(1.05) sepia(0.1)';
      
      // Color tone filters
      case 'warm':
        return 'brightness(1.08) sepia(0.25) saturate(1.4) contrast(1.02)';
      case 'cool':
        return 'brightness(1.05) saturate(0.85) hue-rotate(15deg) contrast(1.08)';
      case 'vintage':
        return 'sepia(0.45) contrast(1.15) brightness(0.92) saturate(0.75)';
      case 'bw':
        return 'grayscale(1) contrast(1.2) brightness(1.05)';
      
      // Fun effect filters
      case 'neon':
        return 'brightness(1.2) contrast(1.35) saturate(1.6)';
      case 'sparkle':
        return 'brightness(1.18) contrast(1.08) saturate(1.25)';
      case 'vhs':
        return 'brightness(1.05) contrast(1.25) saturate(1.3) hue-rotate(-5deg)';
      case 'comic':
        return 'contrast(1.5) brightness(1.1) saturate(1.4)';
      case 'dreamy':
        return 'brightness(1.12) contrast(0.9) saturate(1.15) blur(0.5px)';
      
      default:
        return 'none';
    }
  }, []);

  // Process video frame with canvas for advanced effects
  const processFrame = useCallback(() => {
    if (!videoRef?.current || !canvasRef?.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    // Draw video frame
    ctx.save();
    
    // Apply filter
    ctx.filter = getFilterStyle(currentFilter);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Add overlay effects based on filter
    if (currentFilter === 'sparkle') {
      // Add sparkle overlay
      const time = Date.now() / 1000;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + Math.sin(time * 3) * 0.03})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    if (currentFilter === 'neon') {
      // Add neon glow border
      ctx.globalCompositeOperation = 'screen';
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(124, 58, 237, 0.1)');
      gradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.1)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (currentFilter === 'raccoon') {
      // Draw raccoon mask overlay effect
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(50, 50, 50, 0.3)';
      // Simple mask effect around eyes area
      const eyeY = canvas.height * 0.35;
      const eyeWidth = canvas.width * 0.3;
      ctx.beginPath();
      ctx.ellipse(canvas.width * 0.35, eyeY, eyeWidth * 0.4, eyeWidth * 0.2, 0, 0, Math.PI * 2);
      ctx.ellipse(canvas.width * 0.65, eyeY, eyeWidth * 0.4, eyeWidth * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (currentFilter === 'bigHead') {
      // Apply a subtle zoom/distortion effect
      ctx.globalCompositeOperation = 'source-over';
      // This is a simplified version - real implementation would use face detection
    }

    ctx.restore();
    
    // Continue processing
    animationRef.current = requestAnimationFrame(processFrame);
  }, [videoRef, canvasRef, currentFilter, getFilterStyle]);

  // Start/stop filter processing
  useEffect(() => {
    if (currentFilter !== 'none' && videoRef?.current) {
      setIsProcessing(true);
      processFrame();
    } else {
      setIsProcessing(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentFilter, processFrame, videoRef]);

  // Change filter
  const changeFilter = useCallback((filterKey) => {
    setCurrentFilter(filterKey);
  }, []);

  // Get stream from canvas for WebRTC
  const getFilteredStream = useCallback(() => {
    if (!canvasRef?.current) return null;
    try {
      return canvasRef.current.captureStream(30);
    } catch (e) {
      console.error('Failed to capture canvas stream:', e);
      return null;
    }
  }, [canvasRef]);

  return {
    currentFilter,
    changeFilter,
    isProcessing,
    getFilteredStream,
    filters: CAMERA_FILTERS,
    getFilterStyle,
  };
};

export default useCameraFilters;
