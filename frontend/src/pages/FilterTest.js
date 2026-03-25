import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CameraFilterSelector from '@/components/CameraFilterSelector';
import { CAMERA_FILTERS } from '@/hooks/useCameraFilters';

/**
 * Test page to demonstrate camera filter selector
 * Shows the swipeable Snapchat-style filter UI with a live camera preview
 */
const FilterTest = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [currentFilter, setCurrentFilter] = useState('none');
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 1280, height: 720 },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Could not access camera. Please allow camera permissions.');
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Get CSS filter style
  const getFilterStyle = (filter) => {
    switch (filter) {
      case 'beauty': return 'brightness(1.08) contrast(1.05) saturate(1.15)';
      case 'smooth': return 'brightness(1.1) contrast(0.92) saturate(1.08) blur(0.4px)';
      case 'glow': return 'brightness(1.15) contrast(1.02) saturate(1.1)';
      case 'raccoon': return 'contrast(1.15) brightness(1.02) saturate(0.9)';
      case 'cat': return 'brightness(1.05) contrast(1.1) saturate(1.2)';
      case 'dog': return 'brightness(1.08) contrast(1.05) sepia(0.1)';
      case 'warm': return 'brightness(1.08) sepia(0.25) saturate(1.4) contrast(1.02)';
      case 'cool': return 'brightness(1.05) saturate(0.85) hue-rotate(15deg) contrast(1.08)';
      case 'vintage': return 'sepia(0.45) contrast(1.15) brightness(0.92) saturate(0.75)';
      case 'bw': return 'grayscale(1) contrast(1.2) brightness(1.05)';
      case 'neon': return 'brightness(1.2) contrast(1.35) saturate(1.6)';
      case 'sparkle': return 'brightness(1.18) contrast(1.08) saturate(1.25)';
      case 'vhs': return 'brightness(1.05) contrast(1.25) saturate(1.3) hue-rotate(-5deg)';
      case 'comic': return 'contrast(1.5) brightness(1.1) saturate(1.4)';
      case 'dreamy': return 'brightness(1.12) contrast(0.9) saturate(1.15) blur(0.5px)';
      default: return 'none';
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft size={20} className="text-white/60" />
          </button>
          <h1 className="text-lg font-bold">Camera Filter Test</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Main content */}
      <div className="pt-16 pb-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* Camera preview */}
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-900 mb-6">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <p className="text-red-400">{error}</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover transition-[filter] duration-200"
                style={{ 
                  filter: getFilterStyle(currentFilter),
                  transform: 'scaleX(-1)'
                }}
              />
            )}

            {/* Current filter badge */}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-xs font-medium flex items-center gap-2">
              <span>{CAMERA_FILTERS[currentFilter]?.icon}</span>
              <span>{CAMERA_FILTERS[currentFilter]?.name}</span>
            </div>

            {/* Swipe hint */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none">
              ← Swipe on filter selector →
            </div>
          </div>

          {/* Filter selector */}
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <p className="text-center text-sm text-gray-400 mb-3">
              Swipe left/right to change filters
            </p>
            <CameraFilterSelector
              currentFilter={currentFilter}
              onFilterChange={setCurrentFilter}
              isPremium={true} // Enable all filters for testing
              onPremiumRequired={() => console.log('Premium required')}
              visible={true}
            />
          </div>

          {/* Filter info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Total filters: {Object.keys(CAMERA_FILTERS).length}</p>
            <p className="mt-1">Categories: Beauty, Masks, Color Tones, Fun Effects</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterTest;
