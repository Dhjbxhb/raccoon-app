import React from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone, Maximize2, Minimize2 } from 'lucide-react';

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
  partnerUsername
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

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

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-32 sm:w-48 aspect-video bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <VideoOff size={24} className="text-gray-500" />
            </div>
          )}
        </div>

        {/* Partner name */}
        {remoteStream && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 rounded-full backdrop-blur-sm">
            <span className="text-white text-sm font-medium">{partnerUsername}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-4">
          {/* Toggle Video */}
          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-full transition-all ${
              isVideoEnabled 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </button>

          {/* Toggle Audio */}
          <button
            onClick={onToggleAudio}
            className={`p-4 rounded-full transition-all ${
              isAudioEnabled 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
            }`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          {/* End Call */}
          <button
            onClick={onEndCall}
            className="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            title="End call"
          >
            <PhoneOff size={24} />
          </button>

          {/* Toggle Fullscreen */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-4 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all"
            title={isExpanded ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isExpanded ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
