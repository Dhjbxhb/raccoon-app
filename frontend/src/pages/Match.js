import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useMatching } from '@/hooks/useMatching';
import { useChat } from '@/hooks/useChat';
import { useWebRTC } from '@/hooks/useWebRTC';
import { toast } from 'sonner';
import { 
  ArrowLeft, Send, SkipForward, UserX, Loader2, Star, Globe, Trophy, 
  Sparkles, Gamepad2, Video, VideoOff, Mic, MicOff, PhoneOff, 
  Lock, Crown, Filter, Flag, X, Maximize2, Minimize2 
} from 'lucide-react';
import MatchingFilters from '@/components/MatchingFilters';
import TruthOrDareGame from '@/components/TruthOrDareGame';
import RaccoonFeudGame from '@/components/RaccoonFeudGame';
import { CAMERA_FILTERS } from '@/hooks/useCameraFilters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Raccoon facts for the loading screen
const RACCOON_FACTS = [
  "Raccoons are extremely intelligent animals",
  "They can remember solutions for up to 3 years",
  "Raccoons have very sensitive hands like humans",
  "They are great problem solvers",
  "Raccoons can run up to 15 mph"
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
  const [showFilters, setShowFilters] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [matchingFilters, setMatchingFilters] = useState({ gender: 'any', country: 'ANY' });
  const [showFilterSelector, setShowFilterSelector] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Game states
  const [showTruthOrDare, setShowTruthOrDare] = useState(false);
  const [showFeud, setShowFeud] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [partnerScore, setPartnerScore] = useState(0);

  // WebRTC hook - AUTO START when matched
  const {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    error: webrtcError,
    currentFilter,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
    changeFilter,
    getFilterStyle
  } = useWebRTC(socket, sessionId, partner?.user_id, true);

  const isPremium = user?.premium_status;

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
      startMatching(matchingFilters.gender, matchingFilters.country);
    }
  }, [state, user]);

  // Rotate raccoon facts
  useEffect(() => {
    if (state !== 'searching') return;
    const interval = setInterval(() => {
      setCurrentFact(prev => (prev + 1) % RACCOON_FACTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [state]);

  const handleApplyFilters = (filters) => {
    setMatchingFilters(filters);
    if (state === 'searching') {
      startMatching(filters.gender, filters.country);
    }
    toast.success('Filters applied!');
  };

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
    endCall();
    skipMatch();
    toast.info('Finding next match...');
  };

  const handleBlock = () => {
    if (window.confirm('Block this user? You won\'t be matched again.')) {
      endCall();
      blockUser();
      toast.success('User blocked');
    }
  };

  const handlePremiumFeature = (feature) => {
    if (!isPremium) {
      toast.info(`${feature} is a Premium feature`);
      navigate('/premium');
    }
  };

  const handleFilterSelect = (filterKey) => {
    const filter = CAMERA_FILTERS[filterKey];
    if (filter.premium && !isPremium) {
      handlePremiumFeature('Camera filters');
      return;
    }
    changeFilter(filterKey);
    setShowFilterSelector(false);
  };

  // Connecting state
  if (!connected) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#7c3aed] animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Connecting...</p>
        </div>
      </div>
    );
  }

  // Searching state
  if (state === 'searching') {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center relative overflow-hidden px-4">
        {/* Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#050508] via-[#0a0510] to-[#1a0a2e]/40" />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-40"
            style={{
              background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
              filter: 'blur(80px)',
              animation: 'pulse 4s ease-in-out infinite'
            }}
          />
        </div>

        {/* Back & Filter buttons */}
        <button
          onClick={() => navigate('/dashboard')}
          className="absolute top-4 left-4 p-3 hover:bg-white/10 rounded-full z-20"
        >
          <ArrowLeft size={20} className="text-white/60" />
        </button>
        <button
          onClick={() => setShowFilters(true)}
          className="absolute top-4 right-4 p-3 hover:bg-white/10 rounded-full z-20"
        >
          <Filter size={20} className="text-white/60" />
        </button>

        <MatchingFilters
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          onApply={handleApplyFilters}
          isPremium={isPremium}
          onPremiumRequired={() => navigate('/premium')}
          initialFilters={matchingFilters}
        />

        {/* Content */}
        <div className="relative z-10 text-center">
          <div className="w-32 h-32 mx-auto mb-8 rounded-full overflow-hidden bg-[#7c3aed]/20 animate-pulse">
            <img 
              src="https://customer-assets.emergentagent.com/job_realtime-raccoon/artifacts/818jgnvw_Screenshot%202026-03-22%20at%202.50.16%E2%80%AFPM.png"
              alt="Raccoon"
              className="w-full h-full object-cover scale-150"
              style={{ objectPosition: 'center 30%' }}
            />
          </div>
          <h2 className="text-2xl font-bold mb-2">Finding a Match</h2>
          <p className="text-gray-400 text-sm mb-8 transition-opacity duration-300">
            {RACCOON_FACTS[currentFact]}
          </p>
          <div className="flex justify-center gap-2">
            {[0,1,2,3,4].map(i => (
              <span key={i} className="text-xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>🦝</span>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.6; } }
        `}</style>
      </div>
    );
  }

  // MATCHED STATE - Main Chat & Video UI
  return (
    <div className="h-screen bg-[#050508] text-white flex flex-col overflow-hidden">
      {/* Header - Compact for mobile */}
      <div className="relative z-20 px-3 py-2 md:px-6 md:py-3 border-b border-white/10 bg-black/50 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Back button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/10 rounded-xl"
            data-testid="back-button"
          >
            <ArrowLeft size={18} className="text-white/60" />
          </button>
          
          {/* Center: Partner info */}
          {partner && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-lg flex items-center justify-center text-sm font-bold">
                {partner.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm">{partner.username}</span>
                  {partner.premium && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Globe size={10} />
                  <span>{partner.country || 'Unknown'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Right: Action buttons */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={handleSkip}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs md:text-sm flex items-center gap-1"
              data-testid="skip-button"
            >
              <SkipForward size={14} />
              <span className="hidden sm:inline">Skip</span>
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="p-1.5 md:p-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg"
              data-testid="report-button"
            >
              <Flag size={14} />
            </button>
            <button
              onClick={handleBlock}
              className="p-1.5 md:p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg"
              data-testid="block-button"
            >
              <UserX size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* VIDEO SECTION - Always visible, large and centered */}
        <div className={`${videoExpanded ? 'fixed inset-0 z-50' : 'relative lg:w-1/2 xl:w-3/5'} bg-black flex-shrink-0`}>
          {/* Remote Video (Main) */}
          <div className="relative w-full h-48 sm:h-64 lg:h-full">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Placeholder if no remote stream */}
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#7c3aed]/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Video size={32} className="text-[#7c3aed]" />
                  </div>
                  <p className="text-gray-400 text-sm">Waiting for {partner?.username}...</p>
                </div>
              </div>
            )}

            {/* Local Video (PIP) with filter */}
            <div className="absolute bottom-4 right-4 w-24 sm:w-32 aspect-video bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ filter: getFilterStyle(currentFilter) }}
              />
              {currentFilter !== 'none' && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#7c3aed]/80 rounded text-[8px] text-white">
                  {CAMERA_FILTERS[currentFilter]?.icon}
                </div>
              )}
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <VideoOff size={20} className="text-gray-500" />
                </div>
              )}
            </div>

            {/* Video Controls */}
            <div className="absolute bottom-4 left-4 right-24 sm:right-36 flex items-center gap-2">
              {/* Filter Button */}
              <button
                onClick={() => setShowFilterSelector(!showFilterSelector)}
                className={`p-2.5 rounded-full transition-all ${
                  currentFilter !== 'none' ? 'bg-[#7c3aed] text-white' : 'bg-black/50 text-white hover:bg-black/70'
                }`}
                data-testid="filter-btn"
              >
                <Sparkles size={18} />
              </button>

              {/* Video Toggle */}
              <button
                onClick={toggleVideo}
                className={`p-2.5 rounded-full transition-all ${
                  isVideoEnabled ? 'bg-black/50 text-white' : 'bg-red-500/80 text-white'
                }`}
                data-testid="toggle-video-btn"
              >
                {isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              {/* Audio Toggle */}
              <button
                onClick={toggleAudio}
                className={`p-2.5 rounded-full transition-all ${
                  isAudioEnabled ? 'bg-black/50 text-white' : 'bg-red-500/80 text-white'
                }`}
                data-testid="toggle-audio-btn"
              >
                {isAudioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              {/* End Call */}
              <button
                onClick={endCall}
                className="p-2.5 bg-red-500 hover:bg-red-600 rounded-full text-white"
                data-testid="end-call-btn"
              >
                <PhoneOff size={18} />
              </button>

              {/* Fullscreen */}
              <button
                onClick={() => setVideoExpanded(!videoExpanded)}
                className="p-2.5 bg-black/50 hover:bg-black/70 rounded-full text-white"
              >
                {videoExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>

            {/* Connection status */}
            {connectionState === 'connecting' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-400 text-xs flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Connecting...
              </div>
            )}
          </div>

          {/* Filter Selector Overlay */}
          {showFilterSelector && (
            <div className="absolute bottom-20 left-4 right-4 bg-black/90 backdrop-blur-xl rounded-xl p-3 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles size={14} className="text-[#7c3aed]" /> Filters
                </span>
                <button onClick={() => setShowFilterSelector(false)} className="p-1 hover:bg-white/10 rounded">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
                {Object.entries(CAMERA_FILTERS).map(([key, filter]) => (
                  <button
                    key={key}
                    onClick={() => handleFilterSelect(key)}
                    className={`p-2 rounded-lg transition-all flex flex-col items-center ${
                      currentFilter === key ? 'bg-[#7c3aed] text-white' : 'bg-white/5 hover:bg-white/10 text-white'
                    } ${filter.premium && !isPremium ? 'opacity-50' : ''}`}
                  >
                    <span className="text-lg">{filter.icon}</span>
                    <span className="text-[8px] mt-0.5 truncate w-full text-center">{filter.name}</span>
                    {filter.premium && !isPremium && <Lock size={8} className="text-yellow-400 mt-0.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CHAT SECTION */}
        <div className="flex-1 flex flex-col lg:w-1/2 xl:w-2/5 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }}
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10" data-testid="chat-messages">
            {messages.length === 0 && partner && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3 animate-bounce">👋</div>
                <p className="text-gray-400 text-sm">Say hi to <span className="text-white font-semibold">{partner.username}</span>!</p>
              </div>
            )}
            
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.user_id || msg.sender_id === user?.guest_id;
              return (
                <div key={index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] ${isOwn ? 'order-2' : ''}`}>
                    {!isOwn && (
                      <div className="flex items-center gap-2 mb-1 ml-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-full flex items-center justify-center text-[8px] font-bold">
                          {msg.sender_username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-500">{msg.sender_username}</span>
                      </div>
                    )}
                    <div className={`relative px-4 py-2.5 rounded-2xl ${
                      isOwn
                        ? 'bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white rounded-br-md shadow-[0_4px_20px_rgba(124,58,237,0.3)]'
                        : 'bg-white/[0.06] border border-white/10 text-white rounded-bl-md'
                    }`}>
                      <p className="break-words text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {partnerTyping && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Game buttons & Input */}
          <div className="relative z-10 p-3 border-t border-white/10 bg-black/30 backdrop-blur-xl flex-shrink-0">
            {/* Game buttons row */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => {
                  if (!isPremium) {
                    handlePremiumFeature('Truth or Dare');
                  } else {
                    setShowTruthOrDare(!showTruthOrDare);
                    setShowFeud(false);
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  showTruthOrDare ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50' : 'bg-white/5 text-gray-300 border border-white/10'
                }`}
                data-testid="tod-btn"
              >
                <Sparkles size={14} />
                <span>Truth/Dare</span>
                {!isPremium && <Lock size={10} className="text-yellow-400" />}
              </button>
              <button
                onClick={() => {
                  if (!isPremium) {
                    handlePremiumFeature('Raccoon Feud');
                  } else {
                    setShowFeud(!showFeud);
                    setShowTruthOrDare(false);
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  showFeud ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' : 'bg-white/5 text-gray-300 border border-white/10'
                }`}
                data-testid="feud-btn"
              >
                <Trophy size={14} />
                <span>Feud</span>
                {!isPremium && <Lock size={10} className="text-yellow-400" />}
              </button>
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1 bg-white/[0.06] border border-white/10 focus:border-[#7c3aed]/50 rounded-xl h-11 px-4 text-white placeholder:text-gray-500 outline-none text-sm"
                data-testid="message-input"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="p-3 bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] rounded-xl disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
                data-testid="send-button"
              >
                <Send size={18} className="text-white" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Game Overlays - Positioned to not cover video */}
      <TruthOrDareGame
        isOpen={showTruthOrDare}
        onClose={() => setShowTruthOrDare(false)}
        myScore={myScore}
        partnerScore={partnerScore}
        onScoreUpdate={(points) => setMyScore(prev => prev + points)}
        isPremium={isPremium}
      />

      <RaccoonFeudGame
        isOpen={showFeud}
        onClose={() => setShowFeud(false)}
        myScore={myScore}
        partnerScore={partnerScore}
        partnerUsername={partner?.username || 'Partner'}
        onScoreUpdate={(points) => setMyScore(prev => prev + points)}
        isPremium={isPremium}
      />

      {/* Report Modal */}
      {showReportModal && partner && (
        <ReportModal 
          partner={partner}
          sessionId={sessionId}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

// Report Modal Component
const ReportModal = ({ partner, sessionId, onClose }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const REPORT_REASONS = [
    'Inappropriate behavior',
    'Harassment',
    'Spam',
    'Fake profile',
    'Underage user',
    'Scam/Fraud',
    'Hate speech',
    'Other'
  ];

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('raccoon_token');
      const response = await fetch(`${API_URL}/api/reports/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reported_id: partner.user_id || partner.guest_id,
          reason,
          details: details || null,
          session_id: sessionId
        })
      });

      if (response.ok) {
        toast.success('Report submitted. Thank you!');
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to submit report');
      }
    } catch (error) {
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gradient-to-br from-[#1a1a2e] to-[#0a0a15] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Flag size={20} className="text-orange-400" />
              Report User
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`p-2.5 rounded-lg text-xs transition-all text-left ${
                  reason === r
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Additional details (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-gray-600 outline-none resize-none h-20 text-sm"
          />
        </div>

        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default Match;
