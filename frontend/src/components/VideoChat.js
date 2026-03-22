import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone, Maximize2, Minimize2, Sparkles, X } from 'lucide-react';
import { CAMERA_FILTERS } from '@/hooks/useCameraFilters';

const VideoChat = ({
  localVideoRef,
  remoteVideoRef,
  localStream,
  remoteStream,
  isVideoEnabled,
  isAudioEnabled,
  connectionState,
  error,
  onStartCall,
  onEndCall,
  onToggleVideo,
  onToggleAudio,
  partnerUsername,
  isPremium,
  onPremiumRequired
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('none');
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  // Get CSS filter style
  const getFilterStyle = (filter) => {
    switch (filter) {
      case 'beauty':
        return 'brightness(1.05) contrast(1.1) saturate(1.1)';
      case 'smooth':
        return 'brightness(1.08) contrast(0.95) saturate(1.05) blur(0.3px)';
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
      case 'raccoon':
        return 'contrast(1.2) brightness(0.95)';
      case 'bigHead':
        return 'brightness(1.1) contrast(1.1)';
      case 'glasses':
        return 'contrast(1.15) brightness(1.05) saturate(1.1)';
      default:
        return 'none';
    }
  };

  // Handle filter selection
  const handleFilterSelect = (filterKey) => {
    const filter = CAMERA_FILTERS[filterKey];
    if (filter.premium && !isPremium) {
      onPremiumRequired?.();
      return;
    }
    setCurrentFilter(filterKey);
  };

  // If no call is active and not connecting
  if (!localStream && !isConnecting) {
    return (
      <div className="p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#7c3aed]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video size={32} className="text-[#7c3aed]" />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Video Chat
          </h3>
          <p className="text-gray-400 text-sm mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Start a video call with {partnerUsername}
          </p>
          <button
            onClick={onStartCall}
            className="px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold transition-all flex items-center gap-2 mx-auto shadow-[0_0_20px_rgba(124,58,237,0.4)]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
            data-testid="start-video-call-btn"
          >
            <Phone size={20} />
            Start Video Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all ${
      isExpanded ? 'fixed inset-4 z-50' : 'relative'
    }`}>
      {/* Error display */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-20 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Connection status */}
      {isConnecting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-400 text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          Connecting...
        </div>
      )}

      {/* Filter selector overlay */}
      {showFilters && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <Sparkles size={20} className="text-[#7c3aed]" />
                Camera Filters
              </h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {Object.entries(CAMERA_FILTERS).map(([key, filter]) => (
                <button
                  key={key}
                  onClick={() => handleFilterSelect(key)}
                  className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 ${
                    currentFilter === key 
                      ? 'bg-[#7c3aed] text-white' 
                      : 'bg-white/5 hover:bg-white/10 text-white'
                  } ${filter.premium && !isPremium ? 'opacity-50' : ''}`}
                  data-testid={`filter-${key}`}
                >
                  <span className="text-2xl">{filter.icon}</span>
                  <span className="text-[10px] font-medium truncate w-full text-center">{filter.name}</span>
                  {filter.premium && !isPremium && (
                    <span className="text-[8px] text-yellow-400">PRO</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video container */}
      <div className={`relative ${isExpanded ? 'h-full' : 'aspect-video'}`}>
        {/* Remote video (main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-gray-900"
        />
        
        {/* No remote stream placeholder */}
        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#7c3aed]/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Video size={40} className="text-[#7c3aed]" />
              </div>
              <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Waiting for {partnerUsername}...
              </p>
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) with filter applied */}
        <div className="absolute bottom-20 right-4 w-32 sm:w-48 aspect-video bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ filter: getFilterStyle(currentFilter) }}
          />
          {/* Filter indicator */}
          {currentFilter !== 'none' && (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#7c3aed]/80 rounded text-[10px] text-white font-medium">
              {CAMERA_FILTERS[currentFilter]?.icon}
            </div>
          )}
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <VideoOff size={24} className="text-gray-500" />
            </div>
          )}
        </div>

        {/* Hidden canvas for filter processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Partner name */}
        {remoteStream && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 rounded-full backdrop-blur-sm">
            <span className="text-white text-sm font-medium">{partnerUsername}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-3">
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-full transition-all ${
              showFilters || currentFilter !== 'none'
                ? 'bg-[#7c3aed] text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title="Camera filters"
            data-testid="filter-button"
          >
            <Sparkles size={20} />
          </button>

          {/* Toggle Video */}
          <button
            onClick={onToggleVideo}
            className={`p-3 rounded-full transition-all ${
              isVideoEnabled 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            data-testid="toggle-video-btn"
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Toggle Audio */}
          <button
            onClick={onToggleAudio}
            className={`p-3 rounded-full transition-all ${
              isAudioEnabled 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
            }`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            data-testid="toggle-audio-btn"
          >
            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* End Call */}
          <button
            onClick={onEndCall}
            className="p-3 bg-red-500 hover:bg-red-600 rounded-full text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            title="End call"
            data-testid="end-call-btn"
          >
            <PhoneOff size={20} />
          </button>

          {/* Toggle Fullscreen */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all"
            title={isExpanded ? 'Exit fullscreen' : 'Fullscreen'}
            data-testid="fullscreen-btn"
          >
            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
