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
  Sparkles, Filter, Flag, X, ChevronLeft, ChevronRight, MessageCircle
} from 'lucide-react';
import MatchingFilters from '@/components/MatchingFilters';
import TruthOrDareGame from '@/components/TruthOrDareGame';
import RaccoonFeudGame from '@/components/RaccoonFeudGame';
import { CAMERA_FILTERS } from '@/hooks/useCameraFilters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  const [showCameraFilters, setShowCameraFilters] = useState(false);
  const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
  const [showChat, setShowChat] = useState(true);
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
    currentFilter,
    startCall,
    endCall,
    changeFilter,
    getFilterStyle
  } = useWebRTC(socket, sessionId, partner?.user_id, true);

  const isPremium = user?.premium_status;
  const filterKeys = Object.keys(CAMERA_FILTERS);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (state === 'idle' && user) {
      startMatching(matchingFilters.gender, matchingFilters.country);
    }
  }, [state, user]);

  useEffect(() => {
    if (state !== 'searching') return;
    const interval = setInterval(() => {
      setCurrentFact(prev => (prev + 1) % RACCOON_FACTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [state]);

  const handleApplyFilters = (filters) => {
    setMatchingFilters(filters);
    if (state === 'searching') startMatching(filters.gender, filters.country);
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
    if (!typingTimeout) startTyping();
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

  const handleFilterChange = (direction) => {
    let newIndex = selectedFilterIndex + direction;
    if (newIndex < 0) newIndex = filterKeys.length - 1;
    if (newIndex >= filterKeys.length) newIndex = 0;
    
    const filterKey = filterKeys[newIndex];
    const filter = CAMERA_FILTERS[filterKey];
    
    if (filter.premium && !isPremium) {
      toast.info('Premium filter - upgrade to unlock');
      navigate('/premium');
      return;
    }
    
    setSelectedFilterIndex(newIndex);
    changeFilter(filterKey);
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
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#050508] via-[#0a0510] to-[#1a0a2e]/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
        </div>

        <button onClick={() => navigate('/dashboard')} className="absolute top-4 left-4 p-3 hover:bg-white/10 rounded-full z-20">
          <ArrowLeft size={20} className="text-white/60" />
        </button>
        <button onClick={() => setShowFilters(true)} className="absolute top-4 right-4 p-3 hover:bg-white/10 rounded-full z-20">
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

        <div className="relative z-10 text-center">
          <div className="w-32 h-32 mx-auto mb-8 rounded-full overflow-hidden bg-[#7c3aed]/20 animate-pulse">
            <img 
              src="https://customer-assets.emergentagent.com/job_realtime-raccoon/artifacts/818jgnvw_Screenshot%202026-03-22%20at%202.50.16%E2%80%AFPM.png"
              alt="Raccoon" className="w-full h-full object-cover scale-150" style={{ objectPosition: 'center 30%' }}
            />
          </div>
          <h2 className="text-2xl font-bold mb-2">Finding a Match</h2>
          <p className="text-gray-400 text-sm mb-8">{RACCOON_FACTS[currentFact]}</p>
          <div className="flex justify-center gap-2">
            {[0,1,2,3,4].map(i => (
              <span key={i} className="text-xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>🦝</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ========== MATCHED STATE ==========
  return (
    <div className="h-screen bg-[#050508] text-white flex flex-col overflow-hidden">
      {/* TOP BAR - Stranger info + Report/Skip */}
      <div className="relative z-30 px-3 py-2 md:px-4 md:py-2.5 bg-black/80 backdrop-blur-xl border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Back */}
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-lg" data-testid="back-button">
            <ArrowLeft size={18} className="text-white/60" />
          </button>
          
          {/* Stranger Info - Center */}
          {partner && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-xl flex items-center justify-center text-sm font-bold shadow-lg">
                {partner.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{partner.username}</span>
                  {partner.premium && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Globe size={11} />
                  <span>{partner.country || 'Unknown'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Report + Skip */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
              data-testid="report-button"
            >
              <Flag size={14} />
              <span className="hidden sm:inline">Report</span>
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)]"
              data-testid="skip-button"
            >
              <SkipForward size={14} />
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - Split Video Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* ===== DESKTOP: LEFT = MY VIDEO | MOBILE: BOTTOM = MY VIDEO ===== */}
        <div className="order-2 lg:order-1 flex-1 lg:flex-1 relative bg-gradient-to-br from-gray-900 to-black">
          {/* My Video */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: getFilterStyle(currentFilter) }}
          />
          
          {/* My label */}
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-xs font-medium flex items-center gap-2 z-10">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            You
          </div>

          {/* Camera Filter Selector - Snapchat style */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            {showCameraFilters ? (
              <div className="flex items-center gap-3 bg-black/70 backdrop-blur-xl rounded-full px-4 py-2 border border-white/10">
                <button onClick={() => handleFilterChange(-1)} className="p-2 hover:bg-white/10 rounded-full">
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-2 min-w-[120px] justify-center">
                  <span className="text-2xl">{CAMERA_FILTERS[filterKeys[selectedFilterIndex]]?.icon}</span>
                  <span className="text-sm font-medium">{CAMERA_FILTERS[filterKeys[selectedFilterIndex]]?.name}</span>
                </div>
                <button onClick={() => handleFilterChange(1)} className="p-2 hover:bg-white/10 rounded-full">
                  <ChevronRight size={20} />
                </button>
                <button onClick={() => setShowCameraFilters(false)} className="p-1.5 hover:bg-white/10 rounded-full ml-2">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCameraFilters(true)}
                className={`p-3 rounded-full transition-all ${currentFilter !== 'none' ? 'bg-[#7c3aed]' : 'bg-black/60 hover:bg-black/80'} backdrop-blur-sm`}
              >
                <Sparkles size={20} />
              </button>
            )}
          </div>

          {/* RACCOON FEUD - Overlays MY SIDE only */}
          {showFeud && (
            <div className="absolute inset-0 z-30">
              <RaccoonFeudGame
                isOpen={showFeud}
                onClose={() => setShowFeud(false)}
                myScore={myScore}
                partnerScore={partnerScore}
                partnerUsername={partner?.username || 'Stranger'}
                onScoreUpdate={(points) => setMyScore(prev => prev + points)}
                isPremium={isPremium}
                isOverlay={true}
              />
            </div>
          )}
        </div>

        {/* ===== DESKTOP: RIGHT = STRANGER VIDEO | MOBILE: TOP = STRANGER VIDEO ===== */}
        <div className="order-1 lg:order-2 flex-1 lg:flex-1 relative bg-gradient-to-br from-black to-gray-900">
          {/* Stranger Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Waiting placeholder */}
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
              <div className="text-center">
                <div className="w-20 h-20 bg-[#7c3aed]/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Loader2 size={36} className="text-[#7c3aed] animate-spin" />
                </div>
                <p className="text-gray-400 text-sm">Connecting to {partner?.username}...</p>
              </div>
            </div>
          )}

          {/* Stranger label */}
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-xs font-medium flex items-center gap-2 z-10">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            {partner?.username}
          </div>
        </div>

        {/* CENTER - Truth or Dare Bottle (overlays center between both videos) */}
        {showTruthOrDare && (
          <TruthOrDareGame
            isOpen={showTruthOrDare}
            onClose={() => setShowTruthOrDare(false)}
            myScore={myScore}
            partnerScore={partnerScore}
            onScoreUpdate={(points) => setMyScore(prev => prev + points)}
            isPremium={isPremium}
            isMobile={window.innerWidth < 1024}
          />
        )}
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="relative z-30 bg-black/90 backdrop-blur-xl border-t border-white/10 flex-shrink-0 safe-area-bottom">
        <div className="max-w-7xl mx-auto px-3 py-3">
          {/* Game & Filter Buttons */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Matching Filters */}
              <button
                onClick={() => setShowFilters(true)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium flex items-center gap-2 transition-all"
              >
                <Filter size={14} />
                Filters
              </button>
              
              {/* Raccoon Feud */}
              <button
                onClick={() => {
                  if (!isPremium) { navigate('/premium'); return; }
                  setShowFeud(!showFeud);
                  setShowTruthOrDare(false);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                  showFeud ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' : 'bg-white/5 hover:bg-white/10 border border-white/10'
                }`}
                data-testid="feud-btn"
              >
                <Trophy size={14} />
                Feud
                {!isPremium && <span className="text-yellow-400">👑</span>}
              </button>

              {/* Truth or Dare */}
              <button
                onClick={() => {
                  if (!isPremium) { navigate('/premium'); return; }
                  setShowTruthOrDare(!showTruthOrDare);
                  setShowFeud(false);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                  showTruthOrDare ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50' : 'bg-white/5 hover:bg-white/10 border border-white/10'
                }`}
                data-testid="tod-btn"
              >
                <Sparkles size={14} />
                Truth/Dare
                {!isPremium && <span className="text-yellow-400">👑</span>}
              </button>
            </div>

            {/* Score Display when games active */}
            {(showFeud || showTruthOrDare) && (
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-[#7c3aed]/20 rounded-lg text-xs">
                  <span className="text-gray-400">You:</span>
                  <span className="text-[#ffd700] font-bold ml-1">{myScore}</span>
                </div>
                <div className="px-3 py-1.5 bg-white/5 rounded-lg text-xs">
                  <span className="text-gray-400">{partner?.username}:</span>
                  <span className="text-white font-bold ml-1">{partnerScore}</span>
                </div>
              </div>
            )}

            {/* Chat Toggle */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-lg transition-all ${showChat ? 'bg-[#7c3aed] text-white' : 'bg-white/5 text-gray-400'}`}
            >
              <MessageCircle size={18} />
            </button>
          </div>

          {/* Chat Input */}
          {showChat && (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 focus:border-[#7c3aed]/50 rounded-xl h-11 px-4 text-white placeholder:text-gray-500 outline-none text-sm"
                data-testid="message-input"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="px-5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl disabled:opacity-40 transition-all font-medium text-sm"
                data-testid="send-button"
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Chat Messages Overlay (slides in from side) */}
      {showChat && messages.length > 0 && (
        <div className="absolute bottom-28 right-4 w-80 max-h-64 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden z-20 hidden lg:block">
          <div className="max-h-64 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.user_id || msg.sender_id === user?.guest_id;
              return (
                <div key={index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-[#7c3aed] text-white rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            {partnerTyping && (
              <div className="flex justify-start">
                <div className="px-3 py-2 bg-white/10 rounded-2xl rounded-bl-sm">
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
        </div>
      )}

      {/* Matching Filters Modal */}
      <MatchingFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        isPremium={isPremium}
        onPremiumRequired={() => navigate('/premium')}
        initialFilters={matchingFilters}
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

// Report Modal
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
    'Nudity/Sexual content',
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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#0a0a15] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Flag size={20} className="text-orange-400" />
              Report User
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-400">Why are you reporting {partner.username}?</p>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`p-3 rounded-xl text-sm transition-all text-left ${
                  reason === r
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                    : 'bg-white/5 text-gray-300 border border-transparent hover:bg-white/10'
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
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Match;
