import { useState, useRef, useCallback, useEffect } from 'react';

// Filter presets
export const CAMERA_FILTERS = {
  none: { name: 'None', icon: '🚫', premium: false },
  beauty: { name: 'Beauty', icon: '✨', premium: true },
  smooth: { name: 'Smooth Skin', icon: '🌸', premium: true },
  warm: { name: 'Warm Glow', icon: '🌅', premium: true },
  cool: { name: 'Cool Tone', icon: '❄️', premium: true },
  vintage: { name: 'Vintage', icon: '📷', premium: true },
  raccoon: { name: 'Raccoon', icon: '🦝', premium: true },
  bigHead: { name: 'Big Head', icon: '🎭', premium: true },
  glasses: { name: 'Cool Glasses', icon: '😎', premium: true },
  sparkle: { name: 'Sparkle', icon: '💫', premium: true },
  neon: { name: 'Neon Glow', icon: '🌈', premium: true },
};

export const useCameraFilters = (videoRef, canvasRef) => {
  const [currentFilter, setCurrentFilter] = useState('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const animationRef = useRef(null);
  const contextRef = useRef(null);

  // Apply CSS filter effects
  const getFilterStyle = useCallback((filter) => {
    switch (filter) {
      case 'beauty':
        return 'brightness(1.05) contrast(1.1) saturate(1.1) blur(0.3px)';
      case 'smooth':
        return 'brightness(1.08) contrast(0.95) saturate(1.05) blur(0.5px)';
      case 'warm':
        return 'brightness(1.1) sepia(0.2) saturate(1.3) contrast(1.05)';
      case 'cool':
        return 'brightness(1.05) saturate(0.9) hue-rotate(10deg) contrast(1.1)';
      case 'vintage':
        return 'sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.8)';
      case 'neon':
        return 'brightness(1.2) contrast(1.3) saturate(1.5)';
      case 'sparkle':
        return 'brightness(1.15) contrast(1.05) saturate(1.2)';
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
