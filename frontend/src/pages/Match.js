import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useMatching } from '@/hooks/useMatching';
import { useChat } from '@/hooks/useChat';
import { useWebRTC } from '@/hooks/useWebRTC';
import { toast } from 'sonner';
import { ArrowLeft, Send, SkipForward, Ban, Loader2, Star, Globe, Trophy, Sparkles, Gamepad2, Video } from 'lucide-react';
import VideoChat from '@/components/VideoChat';

// Raccoon facts for the loading screen
const RACCOON_FACTS = [
  "Raccoons are extremely intelligent animals",
  "They can remember solutions for up to 3 years",
  "Raccoons have very sensitive hands like humans",
  "They are great problem solvers",
  "Raccoons can run up to 15 mph",
  "Their name means 'one who scratches with hands'",
  "They can rotate their back feet 180 degrees",
  "Raccoons have excellent night vision",
  "Baby raccoons are called 'kits'",
  "They wash their food before eating it",
  "Raccoons are mostly nocturnal creatures",
  "They can make over 50 different sounds",
  "A group of raccoons is called a 'gaze'",
  "They're native to North America",
  "Raccoons can live up to 20 years in captivity"
];

const Match = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const { state, partner, sessionId, startMatching, skipMatch, blockUser } = useMatching(socket);
  const { messages, partnerTyping, sendMessage, startTyping, stopTyping } = useChat(socket, sessionId);
  
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [currentFact, setCurrentFact] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  const [showGames, setShowGames] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const messagesEndRef = useRef(null);

  // WebRTC hook
  const {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    error: webrtcError,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio
  } = useWebRTC(socket, sessionId, partner?.user_id);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (state === 'idle' && user) {
      startMatching('any');
    }
  }, [state, user]);

  // Rotate raccoon facts every 3 seconds
  useEffect(() => {
    if (state !== 'searching') return;
    
    const interval = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setCurrentFact(prev => (prev + 1) % RACCOON_FACTS.length);
        setFactVisible(true);
      }, 300);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [state]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput);
      setMessageInput('');
      stopTyping();
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    
    if (!typingTimeout) {
      startTyping();
    }
    
    clearTimeout(typingTimeout);
    const timeout = setTimeout(() => {
      stopTyping();
      setTypingTimeout(null);
    }, 1000);
    
    setTypingTimeout(timeout);
  };

  const handleSkip = () => {
    skipMatch();
    toast.info('Skipped to next match');
  };

  const handleBlock = () => {
    if (window.confirm('Block this user? You won\'t be matched again.')) {
      blockUser();
      toast.success('User blocked');
    }
  };

  // Connecting state
  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#7c3aed] animate-spin mx-auto mb-4" />
          <p className="text-white text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Connecting...
          </p>
        </div>
      </div>
    );
  }

  // Searching state - enhanced UI
  if (state === 'searching') {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Cinematic Background */}
        <div className="fixed inset-0 z-0">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.1) saturate(0.5)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#050508] via-[#0a0510]/95 to-[#1a0a2e]/40" />
        </div>

        {/* Animated glow layers */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(124,58,237,0.1) 50%, transparent 70%)',
              animation: 'breathe 4s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(76,29,149,0.2) 0%, transparent 60%)',
              animation: 'breathe 4s ease-in-out infinite 1s'
            }}
          />
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="absolute top-6 left-6 p-3 hover:bg-white/10 rounded-full transition-all z-20"
          data-testid="back-button"
        >
          <ArrowLeft size={22} className="text-white/50 hover:text-white/80 transition-colors" />
        </button>

        {/* Main content */}
        <div className="relative z-10 text-center px-6">
          {/* Raccoon with clean circular mask and glow */}
          <div className="relative mb-12">
            {/* Outer breathing glow */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.5) 0%, rgba(124,58,237,0.2) 50%, transparent 70%)',
                filter: 'blur(50px)',
                animation: 'breathe 3s ease-in-out infinite'
              }}
            />
            
            {/* Raccoon container with circular mask */}
            <div 
              className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto rounded-full overflow-hidden"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)'
              }}
            >
              <img 
                src="https://customer-assets.emergentagent.com/job_realtime-raccoon/artifacts/818jgnvw_Screenshot%202026-03-22%20at%202.50.16%E2%80%AFPM.png"
                alt="Cool Raccoon"
                className="w-full h-full object-cover scale-150"
                style={{
                  objectPosition: 'center 30%',
                  animation: 'float 4s ease-in-out infinite',
                  filter: 'drop-shadow(0 0 40px rgba(124,58,237,0.5))'
                }}
              />
            </div>
          </div>

          {/* Title with clean typography */}
          <h2 
            className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Finding a Match
          </h2>

          {/* Rotating facts */}
          <div className="h-12 mb-10 max-w-md mx-auto">
            <p 
              className="text-gray-500 text-sm sm:text-base transition-all duration-500 leading-relaxed"
              style={{ 
                fontFamily: 'Manrope, sans-serif',
                opacity: factVisible ? 1 : 0,
                transform: factVisible ? 'translateY(0)' : 'translateY(8px)'
              }}
            >
              {RACCOON_FACTS[currentFact]}
            </p>
          </div>

          {/* Raccoon emoji wave - cleaner spacing */}
          <div className="flex items-center justify-center gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <span 
                key={i}
                className="text-2xl opacity-80"
                style={{ 
                  animation: 'raccoonWave 2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`
                }}
              >
                🦝
              </span>
            ))}
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) scale(1.5); }
            50% { transform: translateY(-12px) scale(1.5); }
          }
          @keyframes breathe {
            0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
          }
          @keyframes raccoonWave {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  // Matched state - Chat UI
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 backdrop-blur-md bg-black/50">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/10 rounded-full transition-all"
            data-testid="back-button"
          >
            <ArrowLeft size={20} />
          </button>
          
          {partner && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {partner.username}
                  </span>
                  {partner.premium && <Star size={16} className="text-yellow-400 fill-yellow-400" />}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Globe size={12} />
                  <span>{partner.country}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center gap-2"
                  data-testid="skip-button"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <SkipForward size={18} />
                  Skip
                </button>
                <button
                  onClick={handleBlock}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all flex items-center gap-2"
                  data-testid="block-button"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <Ban size={18} />
                  Block
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch justify-center p-6 gap-6">
        {/* Left Sidebar - Games & Video */}
        <div className={`${showGames || showVideo ? 'flex' : 'hidden lg:flex'} flex-col w-full lg:w-80 gap-4`}>
          {/* Video Chat Section */}
          {showVideo ? (
            <div className="flex-1">
              <VideoChat
                localVideoRef={localVideoRef}
                remoteVideoRef={remoteVideoRef}
                localStream={localStream}
                remoteStream={remoteStream}
                isVideoEnabled={isVideoEnabled}
                isAudioEnabled={isAudioEnabled}
                connectionState={connectionState}
                error={webrtcError}
                onStartCall={startCall}
                onEndCall={() => {
                  endCall();
                  setShowVideo(false);
                }}
                onToggleVideo={toggleVideo}
                onToggleAudio={toggleAudio}
                partnerUsername={partner?.username}
              />
              <button
                onClick={() => setShowVideo(false)}
                className="lg:hidden mt-4 w-full py-2 text-center text-gray-400 text-sm bg-white/5 rounded-xl"
              >
                Back to Chat
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <Gamepad2 size={20} className="text-[#7c3aed]" />
                Play Together
              </h3>

              {/* Video Call Button */}
              <button
                onClick={() => {
                  setShowVideo(true);
                  setShowGames(false);
                }}
                className="p-4 bg-gradient-to-br from-[#7c3aed]/30 to-[#4c1d95]/30 border border-[#7c3aed]/50 rounded-xl hover:border-[#7c3aed] transition-all text-left group"
                data-testid="video-call-btn"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-lg flex items-center justify-center">
                    <Video size={20} className="text-white" />
                  </div>
                  <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Video Chat</span>
                </div>
                <p className="text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Start a video call!
                </p>
              </button>
              
              {/* Raccoon Feud */}
              <button
                onClick={() => navigate('/game/feud')}
                className="p-4 bg-gradient-to-br from-[#1a237e]/50 to-[#0d1442]/50 border border-[#ffd700]/30 rounded-xl hover:border-[#ffd700]/60 transition-all text-left group"
                data-testid="play-feud-btn"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#ffd700] to-[#ff8c00] rounded-lg flex items-center justify-center">
                    <Trophy size={20} className="text-[#1a237e]" />
                  </div>
                  <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Raccoon Feud</span>
                </div>
                <p className="text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Guess the top answers!
                </p>
              </button>
              
              {/* Truth or Dare */}
              <button
                onClick={() => navigate('/game/truth-or-dare')}
                className="p-4 bg-gradient-to-br from-[#4a1a6b]/50 to-[#2d1b4e]/50 border border-pink-500/30 rounded-xl hover:border-pink-500/60 transition-all text-left group"
                data-testid="play-tod-btn"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Truth or Dare</span>
                </div>
                <p className="text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Spin the bottle!
                </p>
              </button>
              
              {/* Mobile toggle */}
              <button
                onClick={() => setShowGames(false)}
                className="lg:hidden mt-2 text-center text-gray-400 text-sm"
              >
                Back to Chat
              </button>
            </>
          )}
        </div>

        {/* Chat Box */}
        <div className={`${showGames ? 'hidden lg:flex' : 'flex'} flex-col w-full max-w-4xl h-[600px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden`}>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
            {messages.length === 0 && partner && (
              <div className="text-center text-gray-500 py-12">
                <p style={{ fontFamily: 'Manrope, sans-serif' }}>Say hi to {partner.username}! 👋</p>
              </div>
            )}
            
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === user.user_id || msg.sender_id === user.guest_id;
              return (
                <div
                  key={index}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                      isOwn
                        ? 'bg-[#7c3aed] text-white'
                        : 'bg-white/10 text-white'
                    }`}
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    {!isOwn && (
                      <div className="flex items-center gap-1 mb-1 text-xs text-gray-300">
                        <span className="font-semibold">{msg.sender_username}</span>
                        {msg.premium && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                      </div>
                    )}
                    <p className="break-words">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            
            {partnerTyping && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 bg-white/10 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
            <div className="flex gap-3">
              {/* Mobile game toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowGames(true);
                  setShowVideo(false);
                }}
                className="lg:hidden p-3 bg-[#7c3aed]/20 hover:bg-[#7c3aed]/30 rounded-xl transition-all"
              >
                <Gamepad2 size={20} className="text-[#7c3aed]" />
              </button>
              {/* Mobile video toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowVideo(true);
                  setShowGames(false);
                }}
                className="lg:hidden p-3 bg-[#7c3aed]/20 hover:bg-[#7c3aed]/30 rounded-xl transition-all"
              >
                <Video size={20} className="text-[#7c3aed]" />
              </button>
              <input
                type="text"
                value={messageInput}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1 bg-black/50 border border-white/10 focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/50 rounded-xl h-12 px-4 text-white placeholder:text-white/30 outline-none transition-all"
                data-testid="message-input"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="px-6 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.4)]"
                data-testid="send-button"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                <Send size={18} />
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Match;
