import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useMatching } from '@/hooks/useMatching';
import { useChat } from '@/hooks/useChat';
import { useWebRTC } from '@/hooks/useWebRTC';
import { toast } from 'sonner';
import { 
  ArrowLeft, Loader2, Trophy, 
  Sparkles, Filter, X, MessageCircle, Crown
} from 'lucide-react';
import MatchTopBar from '@/components/match/MatchTopBar';
import ReportModal from '@/components/match/ReportModal';
import ChatPanel from '@/components/match/ChatPanel';
import MatchingFilters from '@/components/MatchingFilters';
import FeudGame from '@/components/games/FeudGame';
import TruthOrDare from '@/components/games/TruthOrDare';
import UnoGame from '@/components/games/UnoGame';
import CameraFilters from '@/components/match/CameraFilters';
import { PremiumPromptModal } from '@/components/premium/PremiumGate';
import { VIDEO_FILTERS, getCSSFilter } from '@/utils/videoFilters';
import '@/styles/match.css';
import '@/styles/chat.css';
import '@/styles/filters.css';
import '@/styles/games.css';
import '@/styles/uno.css';

const RACCOON_FACTS = [
  "Raccoons are extremely intelligent animals",
  "They can remember solutions for up to 3 years",
  "Raccoons have very sensitive hands like humans",
  "They are great problem solvers",
  "Raccoons can run up to 15 mph"
];

/**
 * Match Page - Live video matching with games integration
 * 
 * CRITICAL RULES:
 * 1. VIDEO PRIORITY: Both video feeds must always remain visible
 * 2. GAME OVERLAY: Games appear ONLY over MY video panel
 * 3. CONFLICT PREVENTION: Only one game can run at a time
 * 4. STATE RESET: All game state resets on skip/disconnect/match change
 */
const Match = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
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
  const { messages, partnerTyping, sendMessage, retryMessage, startTyping, stopTyping, clearMessages, fetchHistory, MessageStatus } = useChat(socket, sessionId, user?.user_id || user?.guest_id);
  
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
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  // Refs
  const messagesEndRef = useRef(null);
  const filterTouchStart = useRef(null);
  const localPanelRef = useRef(null);
  const previousSessionRef = useRef(null);
  
  // ========== GAME STATE MANAGEMENT ==========
  // Single source of truth for active game
  const [activeGame, setActiveGame] = useState(null); // null | 'feud' | 'truthordare'
  const [gameSessionId, setGameSessionId] = useState(null);
  
  // Premium prompt modal state
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [premiumFeatureName, setPremiumFeatureName] = useState('');
  
  // Derived game visibility states
  const showFeud = activeGame === 'feud';
  const showTruthOrDare = activeGame === 'truthordare';
  const showUno = activeGame === 'uno';
  const isGameActive = activeGame !== null;
  
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
  const filterKeys = Object.keys(VIDEO_FILTERS);
  
  // Get live CSS filter style based on current filter
  const getLiveFilterStyle = useCallback((filterId) => {
    return getCSSFilter(filterId);
  }, []);
  
  // ========== RESPONSIVE HANDLER ==========
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ========== COMPLETE STATE RESET FUNCTION ==========
  const resetAllGameState = useCallback(() => {
    setActiveGame(null);
    setGameSessionId(null);
    setShowCameraFilters(false);
    setMessageInput('');
    setSessionDuration(0);
    if (clearMessages) clearMessages();
  }, [clearMessages]);
  
  // ========== SESSION CHANGE DETECTION ==========
  // Reset ALL state when match changes
  useEffect(() => {
    // Detect session change (new match or disconnect)
    if (sessionId !== previousSessionRef.current) {
      // Session changed - full reset
      resetAllGameState();
      previousSessionRef.current = sessionId;
    }
    
    // Also reset when leaving matched state
    if (state !== 'matched') {
      resetAllGameState();
    }
  }, [state, sessionId, resetAllGameState]);
  
  // ========== PREMIUM PROMPT HANDLERS ==========
  const showPremiumModal = useCallback((featureName) => {
    setPremiumFeatureName(featureName);
    setShowPremiumPrompt(true);
  }, []);

  const handlePremiumUpgrade = useCallback(() => {
    setShowPremiumPrompt(false);
    navigate('/premium');
  }, [navigate]);

  // ========== SOCKET EVENT CLEANUP ==========
  // Listen for game events to sync between players and clean up properly
  useEffect(() => {
    if (!socket) return;
    
    // ===== GAME START SYNC =====
    // When partner starts a game, open it for both players
    const handleFeudStarted = (data) => {
      // Both players receive this - open game UI for both
      setActiveGame('feud');
      setGameSessionId(sessionId);
    };
    
    const handleTodStarted = (data) => {
      // Both players receive this - open game UI for both
      setActiveGame('truthordare');
      setGameSessionId(sessionId);
    };
    
    const handleUnoStarted = (data) => {
      // Both players receive this - open UNO game UI for both
      setActiveGame('uno');
      setGameSessionId(sessionId);
    };
    
    // ===== GAME END =====
    const handleFeudEnded = () => {
      if (activeGame === 'feud') {
        setActiveGame(null);
        setGameSessionId(null);
      }
    };
    
    const handleTodEnded = () => {
      if (activeGame === 'truthordare') {
        setActiveGame(null);
        setGameSessionId(null);
      }
    };
    
    const handleUnoEnded = () => {
      if (activeGame === 'uno') {
        setActiveGame(null);
        setGameSessionId(null);
      }
    };
    
    const handleMatchEnded = () => {
      resetAllGameState();
    };
    
    const handlePartnerDisconnected = () => {
      resetAllGameState();
    };
    
    // Handle premium feature blocks from backend
    const handlePremiumFilterBlocked = (data) => {
      if (data.warnings && data.warnings.length > 0) {
        // Show toast for downgraded filters
        toast.info(
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-yellow-400" />
            <span>{data.warnings[0]}</span>
          </div>,
          { duration: 4000 }
        );
      }
    };
    
    // Handle premium required events (games, etc)
    const handlePremiumRequired = (data) => {
      const featureName = data.game || data.feature || 'This feature';
      showPremiumModal(featureName);
    };
    
    // Handle session restoration with active game
    const handleSessionRestored = (data) => {
      if (data.active_game && data.active_game.game_type) {
        if (data.active_game.game_type === 'feud') {
          setActiveGame('feud');
          setGameSessionId(sessionId);
        } else if (data.active_game.game_type === 'tod') {
          setActiveGame('truthordare');
          setGameSessionId(sessionId);
        } else if (data.active_game.game_type === 'uno') {
          setActiveGame('uno');
          setGameSessionId(sessionId);
        }
      }
    };
    
    // Register event handlers
    socket.on('feud_game_started', handleFeudStarted);
    socket.on('tod_game_started', handleTodStarted);
    socket.on('uno_game_started', handleUnoStarted);
    socket.on('feud_game_ended', handleFeudEnded);
    socket.on('tod_game_ended', handleTodEnded);
    socket.on('uno_game_ended', handleUnoEnded);
    socket.on('match_ended', handleMatchEnded);
    socket.on('partner_disconnected', handlePartnerDisconnected);
    socket.on('premium_filter_blocked', handlePremiumFilterBlocked);
    socket.on('premium_required', handlePremiumRequired);
    socket.on('session_restored', handleSessionRestored);
    
    return () => {
      socket.off('feud_game_started', handleFeudStarted);
      socket.off('tod_game_started', handleTodStarted);
      socket.off('uno_game_started', handleUnoStarted);
      socket.off('feud_game_ended', handleFeudEnded);
      socket.off('tod_game_ended', handleTodEnded);
      socket.off('uno_game_ended', handleUnoEnded);
      socket.off('match_ended', handleMatchEnded);
      socket.off('partner_disconnected', handlePartnerDisconnected);
      socket.off('premium_filter_blocked', handlePremiumFilterBlocked);
      socket.off('premium_required', handlePremiumRequired);
      socket.off('session_restored', handleSessionRestored);
    };
  }, [socket, activeGame, sessionId, resetAllGameState, showPremiumModal]);

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
    // Don't allow swipe if game is active
    if (isGameActive) return;
    const touch = e.touches ? e.touches[0] : e;
    filterTouchStart.current = { x: touch.clientX, time: Date.now() };
  }, [isGameActive]);

  const handleVideoSwipeEnd = useCallback((e) => {
    if (!filterTouchStart.current || isGameActive) return;
    
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
      const filter = VIDEO_FILTERS[newFilterKey];
      
      if (filter?.premium && !isPremium) {
        toast.info('Premium filter - upgrade to unlock');
        navigate('/premium');
      } else {
        changeFilter(newFilterKey);
        setShowCameraFilters(true);
        setTimeout(() => setShowCameraFilters(false), 2000);
      }
    }
    
    filterTouchStart.current = null;
  }, [getCurrentFilterIndex, filterKeys, isPremium, changeFilter, navigate, isGameActive]);

  // Navigation effects
  useEffect(() => {
    // Wait for auth to load before redirecting
    if (authLoading) return;
    if (!user) navigate('/login');
  }, [user, authLoading, navigate]);

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

  // ========== GAME CONTROL FUNCTIONS ==========
  // Start game - emits to backend, waits for confirmation
  const startGame = useCallback((gameType) => {
    console.log('=== START GAME CLICKED ===');
    console.log('gameType:', gameType);
    console.log('isPremium:', isPremium);
    console.log('isGameActive:', isGameActive);
    console.log('socket:', socket ? 'connected' : 'disconnected');
    console.log('sessionId:', sessionId);
    
    if (!isPremium) {
      console.log('BLOCKED: User is not premium');
      const gameNames = {
        'feud': 'Raccoon Feud',
        'truthordare': 'Truth or Dare',
        'uno': 'UNO'
      };
      showPremiumModal(gameNames[gameType] || gameType);
      return;
    }
    
    // Prevent starting another game
    if (isGameActive) {
      console.log('BLOCKED: Another game is already active');
      toast.info('Please close the current game first');
      return;
    }
    
    // Emit to backend - backend will send game_started to BOTH players
    if (socket && sessionId) {
      console.log('EMITTING game start event for:', gameType);
      if (gameType === 'feud') {
        socket.emit('start_feud_game');
      } else if (gameType === 'truthordare') {
        socket.emit('start_tod_game');
      } else if (gameType === 'uno') {
        socket.emit('start_uno_game');
      }
      toast.info(`Starting ${gameType === 'feud' ? 'Raccoon Feud' : gameType === 'truthordare' ? 'Truth or Dare' : 'UNO'}...`);
    } else {
      console.log('BLOCKED: socket or sessionId missing');
      console.log('socket:', !!socket, 'sessionId:', sessionId);
      toast.error('Cannot start game - connection issue');
    }
    // DO NOT set activeGame here - wait for backend confirmation
  }, [isPremium, isGameActive, sessionId, socket, showPremiumModal]);
  
  // Close game - safe cleanup (emit to backend to notify partner)
  const closeGame = useCallback(() => {
    if (socket && activeGame) {
      if (activeGame === 'feud') {
        socket.emit('end_feud_game');
      } else if (activeGame === 'truthordare') {
        socket.emit('end_tod_game');
      } else if (activeGame === 'uno') {
        socket.emit('end_uno_game');
      }
    }
    setActiveGame(null);
    setGameSessionId(null);
  }, [socket, activeGame]);
  
  // Toggle game with conflict prevention
  const toggleGame = useCallback((gameType) => {
    console.log('=== TOGGLE GAME ===');
    console.log('gameType:', gameType);
    console.log('activeGame:', activeGame);
    
    if (activeGame === gameType) {
      // Close current game
      console.log('Closing current game');
      closeGame();
    } else {
      // Start new game (closes any existing first)
      console.log('Starting new game');
      startGame(gameType);
    }
  }, [activeGame, closeGame, startGame]);

  // ========== SKIP LOGIC ==========
  const handleSkip = useCallback(() => {
    if (isSkipping) return; // Prevent double-skip
    
    // Reset game state first
    resetAllGameState();
    
    // End WebRTC call
    endCall();
    
    // Trigger skip (hook handles state reset and auto-rejoin)
    skipMatch();
    
    // Show feedback
    toast.info('Finding next match...', { duration: 1500 });
  }, [isSkipping, endCall, skipMatch, resetAllGameState]);

  // Block user
  const handleBlock = useCallback(() => {
    if (window.confirm('Block this user? You won\'t be matched again.')) {
      resetAllGameState();
      endCall();
      blockUser();
      toast.success('User blocked');
    }
  }, [endCall, blockUser, resetAllGameState]);

  // Handle back navigation - clean exit
  const handleBackToDashboard = useCallback(() => {
    // Disable auto-rejoin when leaving
    setAutoRejoin(false);
    
    // Reset game state
    resetAllGameState();
    
    // End any active call
    endCall();
    
    // End session if active
    endSession();
    
    // Navigate
    navigate('/dashboard');
  }, [setAutoRejoin, endCall, endSession, navigate, resetAllGameState]);

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
            style={{ filter: getLiveFilterStyle(currentFilter) }}
          />
          
          {/* My Label */}
          <div className="video-panel__label video-panel__label--top-left">
            <div className="video-panel__indicator bg-green-500" />
            <span>You</span>
          </div>

          {/* Active Filter Badge */}
          {currentFilter !== 'none' && (
            <div className="video-panel__filter-badge">
              <span>{VIDEO_FILTERS[currentFilter]?.icon}</span>
              <span>{VIDEO_FILTERS[currentFilter]?.name}</span>
            </div>
          )}

          {/* Camera Filter Controls */}
          <div className="video-panel__filter-controls">
            {showCameraFilters ? (
              <div className="relative">
                <CameraFilters
                  currentFilter={currentFilter}
                  onFilterChange={handleFilterSelect}
                  isPremium={isPremium}
                  onPremiumRequired={() => navigate('/premium')}
                  visible={true}
                  onClose={() => setShowCameraFilters(false)}
                />
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

          {/* Swipe Hint - hidden when game active */}
          {!showCameraFilters && currentFilter === 'none' && !isGameActive && (
            <div className="video-panel__swipe-hint">
              ← Swipe for filters →
            </div>
          )}

          {/* ===== GAME OVERLAY ZONE (MY SIDE ONLY) ===== */}
          {/* Games overlay my video panel - stranger always visible */}
          {showFeud && (
            <div className="game-container game-container--feud">
              <FeudGame
                isOpen={showFeud}
                onClose={closeGame}
                socket={socket}
                myUserId={user?.user_id || user?.guest_id}
                partnerUsername={partner?.username || 'Stranger'}
                sessionId={sessionId}
              />
            </div>
          )}
          
          {showTruthOrDare && (
            <div className="game-container game-container--tod">
              <TruthOrDare
                isOpen={showTruthOrDare}
                onClose={closeGame}
                socket={socket}
                myUserId={user?.user_id || user?.guest_id}
                partnerUsername={partner?.username || 'Stranger'}
                sessionId={sessionId}
                isMobile={isMobile}
              />
            </div>
          )}
          
          {showUno && (
            <div className="game-container game-container--uno">
              <UnoGame
                isOpen={showUno}
                onClose={closeGame}
                socket={socket}
                myUserId={user?.user_id || user?.guest_id}
                partnerUsername={partner?.username || 'Stranger'}
                sessionId={sessionId}
                isMobile={isMobile}
              />
            </div>
          )}
        </div>

        {/* REMOTE VIDEO PANEL (Stranger) - ALWAYS VISIBLE */}
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
      </div>

      {/* ===== BOTTOM ACTION BAR ===== */}
      <div className={`match-bottombar ${isGameActive ? 'match-bottombar--game-active' : ''}`}>
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
                onClick={() => toggleGame('feud')}
                disabled={activeGame && activeGame !== 'feud'}
                className={`match-bottombar__game-btn ${showFeud ? 'match-bottombar__game-btn--active' : ''} ${activeGame && activeGame !== 'feud' ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="feud-btn"
              >
                <Trophy size={12} />
                <span>Feud</span>
                {!isPremium && <span className="text-yellow-400 text-[10px]">👑</span>}
              </button>

              {/* Truth or Dare */}
              <button
                onClick={() => toggleGame('truthordare')}
                disabled={activeGame && activeGame !== 'truthordare'}
                className={`match-bottombar__game-btn ${showTruthOrDare ? 'match-bottombar__game-btn--active' : ''} ${activeGame && activeGame !== 'truthordare' ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="tod-btn"
              >
                <Sparkles size={12} />
                <span>T/D</span>
                {!isPremium && <span className="text-yellow-400 text-[10px]">👑</span>}
              </button>
              
              {/* UNO */}
              <button
                onClick={() => toggleGame('uno')}
                disabled={activeGame && activeGame !== 'uno'}
                className={`match-bottombar__game-btn ${showUno ? 'match-bottombar__game-btn--active' : ''} ${activeGame && activeGame !== 'uno' ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="uno-btn"
              >
                <span style={{ fontSize: '12px' }}>🎴</span>
                <span>UNO</span>
                {!isPremium && <span className="text-yellow-400 text-[10px]">👑</span>}
              </button>
            </div>

            {/* Active Game Indicator */}
            {isGameActive && (
              <div className="match-bottombar__active-game">
                <span className="text-xs text-[#ffd700]/80">
                  {showFeud ? '🦝 Feud' : showTruthOrDare ? '🍾 T/D' : '🎴 UNO'}
                </span>
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

          {/* Chat Input - still accessible during game */}
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
                <MessageCircle size={16} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ===== CHAT PANEL (Desktop overlay / Mobile toggle) ===== */}
      {showChat && (
        <ChatPanel
          messages={messages}
          partnerTyping={partnerTyping}
          partnerUsername={partner?.username || 'Stranger'}
          onSendMessage={sendMessage}
          onRetryMessage={retryMessage}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          currentUserId={user?.user_id || user?.guest_id}
          isExpanded={showChat}
          onToggle={() => setShowChat(!showChat)}
          isMobile={window.innerWidth < 1024}
          MessageStatus={MessageStatus}
        />
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

      {/* Premium Prompt Modal */}
      <PremiumPromptModal
        isOpen={showPremiumPrompt}
        onClose={() => setShowPremiumPrompt(false)}
        featureName={premiumFeatureName}
        onUpgrade={handlePremiumUpgrade}
      />
    </div>
  );
};

export default Match;
