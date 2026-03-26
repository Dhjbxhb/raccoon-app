import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useMatching } from '@/hooks/useMatching';
import { useChat } from '@/hooks/useChat';
import { useWebRTC } from '@/hooks/useWebRTC';
import { toast } from 'sonner';
import { 
  ArrowLeft, Send, Loader2, Trophy, 
  Sparkles, Filter, X, MessageCircle
} from 'lucide-react';
import MatchTopBar from '@/components/match/MatchTopBar';
import ReportModal from '@/components/match/ReportModal';
import MatchingFilters from '@/components/MatchingFilters';
import TruthOrDareGame from '@/components/TruthOrDareGame';
import RaccoonFeudGame from '@/components/RaccoonFeudGame';
import CameraFilterSelector from '@/components/CameraFilterSelector';
import { CAMERA_FILTERS } from '@/hooks/useCameraFilters';
import '@/styles/match.css';

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
  const { 
    state, 
    partner, 
    sessionId, 
    isSkipping,
    startMatching, 
    skipMatch, 
    blockUser,
    endSession,
    setAutoRejoin
  } = useMatching(socket);
  const { messages, partnerTyping, sendMessage, startTyping, stopTyping, clearMessages } = useChat(socket, sessionId);
  
  // Form states
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [currentFact, setCurrentFact] = useState(0);
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [matchingFilters, setMatchingFilters] = useState({ gender: 'any', country: 'ANY' });
  const [showCameraFilters, setShowCameraFilters] = useState(false);
  const [showChat, setShowChat] = useState(true);
  
  // Refs
  const messagesEndRef = useRef(null);
  const filterTouchStart = useRef(null);
  const localPanelRef = useRef(null);
  
  // Game states
  const [showTruthOrDare, setShowTruthOrDare] = useState(false);
  const [showFeud, setShowFeud] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [partnerScore, setPartnerScore] = useState(0);
  
  // Session duration tracking
  const [sessionDuration, setSessionDuration] = useState(0);
  const sessionStartRef = useRef(null);

  // WebRTC hook - AUTO START when matched
  const {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    currentFilter,
    endCall,
    changeFilter,
    getFilterStyle
  } = useWebRTC(socket, sessionId, partner?.user_id, true);

  const isPremium = user?.premium_status;
  const filterKeys = Object.keys(CAMERA_FILTERS);
  
  // Reset UI state when match changes (prevents stale state)
  useEffect(() => {
    if (state !== 'matched') {
      // Clean up game states
      setShowTruthOrDare(false);
      setShowFeud(false);
      setMyScore(0);
      setPartnerScore(0);
      setShowCameraFilters(false);
      setMessageInput('');
      setSessionDuration(0);
      
      // Clear chat messages for new match
      if (clearMessages) clearMessages();
    }
  }, [state, clearMessages]);

  // Track session duration
  useEffect(() => {
    if (state === 'matched' && partner) {
      sessionStartRef.current = Date.now();
      const interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      }, 1000);
      return () => {
        clearInterval(interval);
        setSessionDuration(0);
        sessionStartRef.current = null;
      };
    }
  }, [state, partner]);
  
  // Get current filter index for swipe navigation
  const getCurrentFilterIndex = useCallback(() => {
    return filterKeys.indexOf(currentFilter) || 0;
  }, [filterKeys, currentFilter]);

  // Handle filter change from swipe component
  const handleFilterSelect = useCallback((filterKey) => {
    changeFilter(filterKey);
  }, [changeFilter]);

  // Handle swipe on video area for filter changes
  const handleVideoSwipeStart = useCallback((e) => {
    const touch = e.touches ? e.touches[0] : e;
    filterTouchStart.current = { x: touch.clientX, time: Date.now() };
  }, []);

  const handleVideoSwipeEnd = useCallback((e) => {
    if (!filterTouchStart.current) return;
    
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const deltaX = touch.clientX - filterTouchStart.current.x;
    const deltaTime = Date.now() - filterTouchStart.current.time;
    
    // Quick swipe detection (less than 300ms and more than 50px)
    if (deltaTime < 300 && Math.abs(deltaX) > 50) {
      const currentIdx = getCurrentFilterIndex();
      let newIndex;
      
      if (deltaX > 0) {
        newIndex = currentIdx - 1;
        if (newIndex < 0) newIndex = filterKeys.length - 1;
      } else {
        newIndex = currentIdx + 1;
        if (newIndex >= filterKeys.length) newIndex = 0;
      }
      
      const newFilterKey = filterKeys[newIndex];
      const filter = CAMERA_FILTERS[newFilterKey];
      
      if (filter.premium && !isPremium) {
        toast.info('Premium filter - upgrade to unlock');
        navigate('/premium');
      } else {
        changeFilter(newFilterKey);
        setShowCameraFilters(true);
        setTimeout(() => setShowCameraFilters(false), 2000);
      }
    }
    
    filterTouchStart.current = null;
  }, [getCurrentFilterIndex, filterKeys, isPremium, changeFilter, navigate]);

  // Navigation effects
  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start matching when idle
  useEffect(() => {
    if (state === 'idle' && user) {
      startMatching(matchingFilters.gender, matchingFilters.country);
    }
  }, [state, user, matchingFilters, startMatching]);

  // Rotate raccoon facts during search
  useEffect(() => {
    if (state !== 'searching') return;
    const interval = setInterval(() => {
      setCurrentFact(prev => (prev + 1) % RACCOON_FACTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [state]);

  // Handle matching filters
  const handleApplyFilters = (filters) => {
    setMatchingFilters(filters);
    if (state === 'searching') startMatching(filters.gender, filters.country);
    toast.success('Filters applied!');
  };

  // Message handlers
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

  // ========== SKIP LOGIC ==========
  const handleSkip = useCallback(() => {
    if (isSkipping) return; // Prevent double-skip
    
    // End WebRTC call first
    endCall();
    
    // Trigger skip (hook handles state reset and auto-rejoin)
    skipMatch();
    
    // Show feedback
    toast.info('Finding next match...', { duration: 1500 });
  }, [isSkipping, endCall, skipMatch]);

  // Block user
  const handleBlock = useCallback(() => {
    if (window.confirm('Block this user? You won\'t be matched again.')) {
      endCall();
      blockUser();
      toast.success('User blocked');
    }
  }, [endCall, blockUser]);

  // Handle back navigation - clean exit
  const handleBackToDashboard = useCallback(() => {
    // Disable auto-rejoin when leaving
    setAutoRejoin(false);
    
    // End any active call
    endCall();
    
    // End session if active
    endSession();
    
    // Navigate
    navigate('/dashboard');
  }, [setAutoRejoin, endCall, endSession, navigate]);

  // ========== CONNECTING STATE ==========
  if (!connected) {
    return (
      <div className="match-container">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-[#7c3aed] animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Connecting...</p>
          </div>
        </div>
      </div>
    );
  }

  // ========== SEARCHING STATE ==========
  if (state === 'searching') {
    return (
      <div className="match-container">
        {/* Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#050508] via-[#0a0510] to-[#1a0a2e]/40" />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
        </div>

        {/* Nav buttons */}
        <button 
          onClick={() => navigate('/dashboard')} 
          className="absolute top-4 left-4 p-3 hover:bg-white/10 rounded-full z-20"
          data-testid="back-from-search"
        >
          <ArrowLeft size={20} className="text-white/60" />
        </button>
        <button 
          onClick={() => setShowFilters(true)} 
          className="absolute top-4 right-4 p-3 hover:bg-white/10 rounded-full z-20"
          data-testid="open-filters-search"
        >
          <Filter size={20} className="text-white/60" />
        </button>

        {/* Filters Modal */}
        <MatchingFilters
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          onApply={handleApplyFilters}
          isPremium={isPremium}
          onPremiumRequired={() => navigate('/premium')}
          initialFilters={matchingFilters}
        />

        {/* Search UI */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-32 h-32 mx-auto mb-8 rounded-full overflow-hidden bg-[#7c3aed]/20 animate-pulse">
            <img 
              src="https://customer-assets.emergentagent.com/job_realtime-raccoon/artifacts/818jgnvw_Screenshot%202026-03-22%20at%202.50.16%E2%80%AFPM.png"
              alt="Raccoon" 
              className="w-full h-full object-cover scale-150" 
              style={{ objectPosition: 'center 30%' }}
            />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">
            {isSkipping ? 'Skipping...' : 'Finding a Match'}
          </h2>
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
    <div className="match-container" data-testid="match-page">
      {/* ===== TOP BAR ===== */}
      <MatchTopBar
        partner={partner}
        sessionDuration={sessionDuration}
        onReport={() => setShowReportModal(true)}
        onSkip={handleSkip}
        onBack={handleBackToDashboard}
        isSearching={state === 'searching'}
        isSkipping={isSkipping}
      />

      {/* ===== VIDEO AREA ===== */}
      {/* Desktop: Left=Me, Right=Stranger | Mobile: Top=Stranger, Bottom=Me */}
      <div className="match-videos">
        
        {/* LOCAL VIDEO PANEL (Me) */}
        {/* Desktop: order-1 (LEFT) | Mobile: order-2 (BOTTOM) */}
        <div 
          ref={localPanelRef}
          className="video-panel video-panel--local"
          onTouchStart={handleVideoSwipeStart}
          onTouchEnd={handleVideoSwipeEnd}
          data-testid="local-video-panel"
        >
          {/* My Video */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-panel__video video-panel__video--mirrored"
            style={{ filter: getFilterStyle(currentFilter) }}
          />
          
          {/* My Label */}
          <div className="video-panel__label video-panel__label--top-left">
            <div className="video-panel__indicator bg-green-500" />
            <span>You</span>
          </div>

          {/* Active Filter Badge */}
          {currentFilter !== 'none' && (
            <div className="video-panel__filter-badge">
              <span>{CAMERA_FILTERS[currentFilter]?.icon}</span>
              <span>{CAMERA_FILTERS[currentFilter]?.name}</span>
            </div>
          )}

          {/* Camera Filter Controls */}
          <div className="video-panel__filter-controls">
            {showCameraFilters ? (
              <div className="relative">
                <CameraFilterSelector
                  currentFilter={currentFilter}
                  onFilterChange={handleFilterSelect}
                  isPremium={isPremium}
                  onPremiumRequired={() => navigate('/premium')}
                  visible={true}
                />
                <button 
                  onClick={() => setShowCameraFilters(false)}
                  className="absolute -top-2 -right-2 p-1.5 bg-black/80 hover:bg-black rounded-full z-30"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCameraFilters(true)}
                className={`video-panel__filter-btn ${currentFilter !== 'none' ? 'video-panel__filter-btn--active' : ''}`}
                data-testid="open-camera-filters"
              >
                <Sparkles size={22} />
              </button>
            )}
          </div>

          {/* Swipe Hint */}
          {!showCameraFilters && currentFilter === 'none' && (
            <div className="video-panel__swipe-hint">
              ← Swipe for filters →
            </div>
          )}

          {/* Raccoon Feud Game Overlay (on MY side only) */}
          {showFeud && (
            <div className="match-game-overlay">
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

        {/* REMOTE VIDEO PANEL (Stranger) */}
        {/* Desktop: order-2 (RIGHT) | Mobile: order-1 (TOP) */}
        <div 
          className="video-panel video-panel--remote"
          data-testid="remote-video-panel"
        >
          {/* Stranger Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-panel__video"
          />
          
          {/* Connecting Placeholder */}
          {!remoteStream && (
            <div className="video-panel__placeholder">
              <div className="video-panel__placeholder-content">
                <div className="video-panel__placeholder-avatar">
                  <Loader2 size={32} className="video-panel__spinner" />
                </div>
                <p className="video-panel__placeholder-text">
                  Connecting to {partner?.username}...
                </p>
              </div>
            </div>
          )}

          {/* Stranger Label */}
          <div className="video-panel__label video-panel__label--top-right">
            <div className="video-panel__indicator bg-blue-500" />
            <span>{partner?.username || 'Stranger'}</span>
          </div>
        </div>

        {/* Truth or Dare Game (Center Overlay) */}
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

      {/* ===== BOTTOM ACTION BAR ===== */}
      <div className="match-bottombar">
        <div className="match-bottombar__content">
          {/* Game & Filter Buttons */}
          <div className="match-bottombar__games">
            <div className="match-bottombar__game-btns">
              {/* Matching Filters */}
              <button
                onClick={() => setShowFilters(true)}
                className="match-bottombar__game-btn"
                data-testid="filters-btn"
              >
                <Filter size={12} />
                <span className="hidden xs:inline">Filters</span>
              </button>
              
              {/* Raccoon Feud */}
              <button
                onClick={() => {
                  if (!isPremium) { navigate('/premium'); return; }
                  setShowFeud(!showFeud);
                  setShowTruthOrDare(false);
                }}
                className={`match-bottombar__game-btn ${showFeud ? 'match-bottombar__game-btn--active' : ''}`}
                data-testid="feud-btn"
              >
                <Trophy size={12} />
                <span>Feud</span>
                {!isPremium && <span className="text-yellow-400 text-[10px]">👑</span>}
              </button>

              {/* Truth or Dare */}
              <button
                onClick={() => {
                  if (!isPremium) { navigate('/premium'); return; }
                  setShowTruthOrDare(!showTruthOrDare);
                  setShowFeud(false);
                }}
                className={`match-bottombar__game-btn ${showTruthOrDare ? 'match-bottombar__game-btn--active' : ''}`}
                data-testid="tod-btn"
              >
                <Sparkles size={12} />
                <span>T/D</span>
                {!isPremium && <span className="text-yellow-400 text-[10px]">👑</span>}
              </button>
            </div>

            {/* Scores (when games active) */}
            {(showFeud || showTruthOrDare) && (
              <div className="match-bottombar__scores">
                <div className="match-bottombar__score match-bottombar__score--me">
                  <span className="text-gray-400">You:</span>
                  <span className="text-[#ffd700] font-bold ml-1">{myScore}</span>
                </div>
                <div className="match-bottombar__score">
                  <span className="text-gray-400">{partner?.username?.slice(0, 6)}:</span>
                  <span className="text-white font-bold ml-1">{partnerScore}</span>
                </div>
              </div>
            )}

            {/* Chat Toggle */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`match-bottombar__chat-toggle ${showChat ? 'match-bottombar__chat-toggle--active' : ''}`}
              data-testid="chat-toggle"
            >
              <MessageCircle size={16} />
            </button>
          </div>

          {/* Chat Input */}
          {showChat && (
            <form onSubmit={handleSendMessage} className="match-bottombar__chat">
              <input
                type="text"
                value={messageInput}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="match-bottombar__input"
                data-testid="message-input"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="match-bottombar__send"
                data-testid="send-button"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ===== CHAT MESSAGES OVERLAY (Desktop only) ===== */}
      {showChat && messages.length > 0 && (
        <div className="match-chat">
          <div className="match-chat__header">
            <div className="match-chat__title">
              <MessageCircle size={14} className="text-[#7c3aed]" />
              <span>Chat</span>
              <span className="text-gray-500">• {messages.length} messages</span>
            </div>
          </div>
          
          <div className="match-chat__messages">
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.user_id || msg.sender_id === user?.guest_id;
              return (
                <div 
                  key={index} 
                  className={`match-chat__message ${isOwn ? 'match-chat__message--own' : 'match-chat__message--partner'}`}
                >
                  {msg.content}
                </div>
              );
            })}
            {partnerTyping && (
              <div className="match-chat__typing">
                <div className="match-chat__typing-dot" />
                <div className="match-chat__typing-dot" />
                <div className="match-chat__typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ===== MODALS ===== */}
      <MatchingFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        isPremium={isPremium}
        onPremiumRequired={() => navigate('/premium')}
        initialFilters={matchingFilters}
      />

      {showReportModal && partner && (
        <ReportModal 
          partner={partner}
          sessionId={sessionId}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            // Optional: Could skip after report
          }}
        />
      )}
    </div>
  );
};

export default Match;
