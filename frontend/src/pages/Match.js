import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useMatching } from '@/hooks/useMatching';
import { useChat } from '@/hooks/useChat';
import { useWebRTC } from '@/hooks/useWebRTC';
import { toast } from 'sonner';
import { 
  ArrowLeft, Loader2, Trophy, 
  Sparkles, Filter, X, MessageCircle, Crown, Pencil
} from 'lucide-react';
import MatchTopBar from '@/components/match/MatchTopBar';
import ReportModal from '@/components/match/ReportModal';
import ChatPanel from '@/components/match/ChatPanel';
import MatchingFilters from '@/components/MatchingFilters';
import FeudGame from '@/components/games/FeudGame';
import UnoGame from '@/components/games/UnoGame';
import DrawGame from '@/components/games/DrawGame';
import { PremiumPromptModal } from '@/components/premium/PremiumGate';
import '@/styles/match.css';
import '@/styles/chat.css';
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
 * RULES:
 * 1. Games overlay the main UI while keeping small camera previews
 * 2. Only one game can run at a time
 * 3. All game state resets on skip/disconnect/match change
 * 4. UNO button must be prominent and responsive
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
  const { messages, partnerTyping, sendMessage, retryMessage, startTyping, stopTyping, clearMessages, MessageStatus } = useChat(socket, sessionId, user?.user_id || user?.guest_id);
  
  // Form states
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [currentFact, setCurrentFact] = useState(0);
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [matchingFilters, setMatchingFilters] = useState({ gender: 'any', country: 'ANY' });
  const [showChat, setShowChat] = useState(true);
  
  // Game loading states
  const [gameLoading, setGameLoading] = useState(null); // 'uno' | 'feud' | null
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  // Refs
  const messagesEndRef = useRef(null);
  const localPanelRef = useRef(null);
  const previousSessionRef = useRef(null);
  
  // ========== GAME STATE MANAGEMENT ==========
  const [activeGame, setActiveGame] = useState(null);
  const [gameSessionId, setGameSessionId] = useState(null);
  
  // Store actual game state from backend
  const [feudGameState, setFeudGameState] = useState(null);
  const [unoGameState, setUnoGameState] = useState(null);
  const [drawGameState, setDrawGameState] = useState(null);
  
  // Premium prompt modal state
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [premiumFeatureName, setPremiumFeatureName] = useState('');
  
  // Derived game visibility states
  const showFeud = activeGame === 'feud';
  const showUno = activeGame === 'uno';
  const showDraw = activeGame === 'draw';
  const isGameActive = activeGame !== null;
  
  // Session duration tracking
  const [sessionDuration, setSessionDuration] = useState(0);
  const sessionStartRef = useRef(null);

  // WebRTC hook
  const {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    endCall
  } = useWebRTC(socket, sessionId, partner?.user_id, true);

  const isPremium = user?.premium_status;
  
  // ========== RESPONSIVE HANDLER ==========
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ========== COMPLETE STATE RESET FUNCTION ==========
  const resetAllGameState = useCallback(() => {
    setActiveGame(null);
    setGameSessionId(null);
    setFeudGameState(null);
    setUnoGameState(null);
    setDrawGameState(null);
    setGameLoading(null);
    setMessageInput('');
    setSessionDuration(0);
    if (clearMessages) clearMessages();
  }, [clearMessages]);
  
  // ========== SESSION CHANGE DETECTION ==========
  useEffect(() => {
    if (sessionId !== previousSessionRef.current) {
      resetAllGameState();
      previousSessionRef.current = sessionId;
    }
    if (state !== 'matched') {
      resetAllGameState();
    }
  }, [state, sessionId, resetAllGameState]);
  
  // ========== PAGE UNLOAD CLEANUP ==========
  // Ensure cleanup when user closes tab or navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Emit leave event to backend
      if (socket?.connected && sessionId) {
        socket.emit('skip_match');
      }
      // Call endCall to clean up WebRTC
      if (endCall) {
        endCall();
      }
    };
    
    const handleVisibilityChange = () => {
      // On mobile, page might be hidden when switching apps
      if (document.visibilityState === 'hidden' && sessionId && socket?.connected) {
        // Don't auto-skip on visibility change, but log for debugging
        console.log('[Match] Page hidden, session active');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, sessionId, endCall]);
  
  // ========== PREMIUM PROMPT HANDLERS ==========
  const showPremiumModal = useCallback((featureName) => {
    setPremiumFeatureName(featureName);
    setShowPremiumPrompt(true);
  }, []);

  const handlePremiumUpgrade = useCallback(() => {
    setShowPremiumPrompt(false);
    navigate('/premium');
  }, [navigate]);

  // ========== SOCKET EVENT HANDLERS ==========
  useEffect(() => {
    if (!socket) return;
    
    // Game start handlers
    const handleFeudStarted = (data) => {
      console.log('=== FEUD_GAME_STARTED ===');
      setGameLoading(null);
      setActiveGame('feud');
      setGameSessionId(sessionId);
      if (data.game_state) setFeudGameState(data.game_state);
    };
    
    const handleUnoStarted = (data) => {
      console.log('=== UNO_GAME_STARTED ===');
      setGameLoading(null);
      setActiveGame('uno');
      setGameSessionId(sessionId);
      if (data.game_state) setUnoGameState(data.game_state);
    };
    
    const handleDrawStarted = (data) => {
      console.log('=== DRAW_GAME_STARTED ===');
      setGameLoading(null);
      setActiveGame('draw');
      setGameSessionId(sessionId);
      if (data.game_state) setDrawGameState(data.game_state);
    };
    
    // Game end handlers
    const handleFeudEnded = () => {
      if (activeGame === 'feud') {
        setActiveGame(null);
        setGameSessionId(null);
        setFeudGameState(null);
      }
    };
    
    const handleUnoEnded = () => {
      if (activeGame === 'uno') {
        setActiveGame(null);
        setGameSessionId(null);
        setUnoGameState(null);
      }
    };
    
    const handleDrawEnded = () => {
      if (activeGame === 'draw') {
        setActiveGame(null);
        setGameSessionId(null);
        setDrawGameState(null);
      }
    };
    
    const handleMatchEnded = () => resetAllGameState();
    const handlePartnerDisconnected = () => resetAllGameState();
    
    const handlePremiumRequired = (data) => {
      setGameLoading(null);
      const featureName = data.game || data.feature || 'This feature';
      showPremiumModal(featureName);
    };
    
    const handleError = (data) => {
      setGameLoading(null);
      toast.error(data.message || 'An error occurred');
    };
    
    // Game-specific error handlers
    const handleUnoError = (data) => {
      console.log('UNO Error:', data);
      setGameLoading(null);
      toast.error(data.message || 'UNO game error');
    };
    
    const handleDrawError = (data) => {
      console.log('Draw Error:', data);
      setGameLoading(null);
      toast.error(data.message || 'Draw game error');
    };
    
    const handleFeudError = (data) => {
      console.log('Feud Error:', data);
      setGameLoading(null);
      toast.error(data.message || 'Feud game error');
    };
    
    const handleSessionRestored = (data) => {
      if (data.active_game?.game_type) {
        const type = data.active_game.game_type;
        if (type === 'feud') setActiveGame('feud');
        else if (type === 'uno') setActiveGame('uno');
        else if (type === 'draw') setActiveGame('draw');
        setGameSessionId(sessionId);
      }
    };
    
    socket.on('feud_game_started', handleFeudStarted);
    socket.on('uno_game_started', handleUnoStarted);
    socket.on('draw_game_started', handleDrawStarted);
    socket.on('feud_game_ended', handleFeudEnded);
    socket.on('uno_game_ended', handleUnoEnded);
    socket.on('draw_game_ended', handleDrawEnded);
    socket.on('match_ended', handleMatchEnded);
    socket.on('partner_disconnected', handlePartnerDisconnected);
    socket.on('premium_required', handlePremiumRequired);
    socket.on('session_restored', handleSessionRestored);
    socket.on('error', handleError);
    socket.on('uno_error', handleUnoError);
    socket.on('draw_error', handleDrawError);
    socket.on('feud_error', handleFeudError);
    
    return () => {
      socket.off('feud_game_started', handleFeudStarted);
      socket.off('uno_game_started', handleUnoStarted);
      socket.off('draw_game_started', handleDrawStarted);
      socket.off('feud_game_ended', handleFeudEnded);
      socket.off('uno_game_ended', handleUnoEnded);
      socket.off('draw_game_ended', handleDrawEnded);
      socket.off('match_ended', handleMatchEnded);
      socket.off('partner_disconnected', handlePartnerDisconnected);
      socket.off('premium_required', handlePremiumRequired);
      socket.off('session_restored', handleSessionRestored);
      socket.off('error', handleError);
      socket.off('uno_error', handleUnoError);
      socket.off('draw_error', handleDrawError);
      socket.off('feud_error', handleFeudError);
    };
  }, [socket, activeGame, sessionId, resetAllGameState, showPremiumModal]);

  // Track session duration
  useEffect(() => {
    if (state === 'matched' && partner) {
      sessionStartRef.current = Date.now();
      const interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state, partner]);

  // Navigation effects
  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/login');
  }, [user, authLoading, navigate]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start matching
  useEffect(() => {
    if (state === 'idle' && user) {
      startMatching(matchingFilters.gender, matchingFilters.country);
    }
  }, [state, user, matchingFilters, startMatching]);

  // Rotate raccoon facts
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
  const gameTimeoutRef = useRef(null);
  const gameRetryCountRef = useRef(0);
  const MAX_GAME_RETRIES = 2;
  
  const startGame = useCallback((gameType) => {
    console.log('=== START GAME ===', gameType, 'Retry:', gameRetryCountRef.current);
    
    if (!isPremium) {
      const gameNames = { 'feud': 'Raccoon Feud', 'uno': 'UNO', 'draw': 'Draw & Guess' };
      showPremiumModal(gameNames[gameType] || gameType);
      return;
    }
    
    if (isGameActive) {
      toast.info('Please close the current game first');
      return;
    }
    
    if (state !== 'matched') {
      toast.error('You must be matched to play games');
      return;
    }
    
    if (!socket || !sessionId) {
      toast.error('Connection issue - please try again');
      return;
    }
    
    // Clear any existing timeout
    if (gameTimeoutRef.current) {
      clearTimeout(gameTimeoutRef.current);
      gameTimeoutRef.current = null;
    }
    
    // Set loading state for visual feedback
    setGameLoading(gameType);
    
    // Emit game start event
    const eventMap = {
      'feud': 'start_feud_game',
      'uno': 'start_uno_game',
      'draw': 'start_draw_game'
    };
    
    socket.emit(eventMap[gameType]);
    console.log('EMITTED:', eventMap[gameType]);
    
    // Timeout with retry logic - 3 seconds
    gameTimeoutRef.current = setTimeout(() => {
      // Use functional update to get current state
      setGameLoading((currentLoading) => {
        if (currentLoading === gameType) {
          // Game didn't start - try retry
          if (gameRetryCountRef.current < MAX_GAME_RETRIES) {
            gameRetryCountRef.current++;
            console.log('Game start timeout, retrying...', gameRetryCountRef.current);
            toast.info('Connecting to game server...', { duration: 1500 });
            socket.emit(eventMap[gameType]);
            
            // Set another timeout for retry
            gameTimeoutRef.current = setTimeout(() => {
              setGameLoading((stillLoading) => {
                if (stillLoading === gameType) {
                  toast.error('Failed to start game. Please try again.');
                  gameRetryCountRef.current = 0;
                  return null;
                }
                return stillLoading;
              });
            }, 3000);
            
            return currentLoading; // Keep loading
          } else {
            toast.error('Failed to start game. Please try again.');
            gameRetryCountRef.current = 0;
            return null;
          }
        }
        return currentLoading;
      });
    }, 3000);
    
  }, [isPremium, isGameActive, state, socket, sessionId, showPremiumModal]);
  
  // Reset retry count when game starts successfully
  useEffect(() => {
    if (activeGame) {
      gameRetryCountRef.current = 0;
      if (gameTimeoutRef.current) {
        clearTimeout(gameTimeoutRef.current);
        gameTimeoutRef.current = null;
      }
    }
  }, [activeGame]);
  
  const closeGame = useCallback(() => {
    if (socket && activeGame) {
      const eventMap = {
        'feud': 'end_feud_game',
        'uno': 'end_uno_game',
        'draw': 'end_draw_game'
      };
      socket.emit(eventMap[activeGame]);
    }
    setActiveGame(null);
    setGameSessionId(null);
    setGameLoading(null);
  }, [socket, activeGame]);
  
  const toggleGame = useCallback((gameType) => {
    if (activeGame === gameType) {
      closeGame();
    } else {
      startGame(gameType);
    }
  }, [activeGame, closeGame, startGame]);

  // ========== SKIP LOGIC ==========
  const handleSkip = useCallback(() => {
    if (isSkipping) return;
    resetAllGameState();
    endCall();
    skipMatch();
    toast.info('Finding next match...', { duration: 1500 });
  }, [isSkipping, endCall, skipMatch, resetAllGameState]);

  const handleBlock = useCallback(() => {
    if (window.confirm('Block this user? You won\'t be matched again.')) {
      resetAllGameState();
      endCall();
      blockUser();
      toast.success('User blocked');
    }
  }, [endCall, blockUser, resetAllGameState]);

  const handleBackToDashboard = useCallback(() => {
    setAutoRejoin(false);
    resetAllGameState();
    endCall();
    endSession();
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
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#050508] via-[#0a0510] to-[#1a0a2e]/40" />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)', filter: 'blur(80px)' }}
          />
        </div>

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

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-32 h-32 mx-auto mb-8 rounded-full overflow-hidden bg-[#7c3aed]/20 animate-pulse">
            <img 
              src="https://customer-assets.emergentagent.com/job_realtime-raccoon/artifacts/818jgnvw_Screenshot%202026-03-22%20at%202.50.16%E2%80%AFPM.png"
              alt="Raccoon" 
              className="w-full h-full object-cover scale-150" 
              loading="lazy"
              decoding="async"
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
    <div className={`match-container ${isGameActive ? 'match-container--game-mode' : ''}`} data-testid="match-page">
      
      {/* ===== TOP BAR (hidden during games on mobile) ===== */}
      {(!isGameActive || !isMobile) && (
        <MatchTopBar
          partner={partner}
          sessionDuration={sessionDuration}
          onReport={() => setShowReportModal(true)}
          onSkip={handleSkip}
          onBack={handleBackToDashboard}
          isSearching={state === 'searching'}
          isSkipping={isSkipping}
        />
      )}

      {/* ===== MAIN VIDEO AREA ===== */}
      <div className={`match-videos ${isGameActive ? 'match-videos--game-mode' : ''}`}>
        
        {/* LOCAL VIDEO PANEL */}
        <div 
          ref={localPanelRef}
          className={`video-panel video-panel--local ${isGameActive ? 'video-panel--mini' : ''}`}
          data-testid="local-video-panel"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-panel__video video-panel__video--mirrored"
          />
          
          {/* Connecting overlay for local video - shows when no stream */}
          {!localStream && (
            <div className="video-panel__connecting">
              <div className="video-panel__connecting-spinner" />
              <span className="video-panel__connecting-text">Starting camera...</span>
            </div>
          )}
          
          {!isGameActive && localStream && (
            <div className="video-panel__label video-panel__label--top-left">
              <div className="video-panel__indicator bg-green-500" />
              <span>You</span>
            </div>
          )}
        </div>

        {/* REMOTE VIDEO PANEL */}
        <div 
          className={`video-panel video-panel--remote ${isGameActive ? 'video-panel--mini video-panel--mini-remote' : ''}`}
          data-testid="remote-video-panel"
        >
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-panel__video"
          />
          
          {/* Connecting overlay for remote video */}
          {!remoteStream && (
            <div className="video-panel__connecting">
              <div className="video-panel__connecting-spinner" />
              <span className="video-panel__connecting-text">
                {isGameActive ? 'Connecting...' : `Connecting to ${partner?.username || 'Stranger'}...`}
              </span>
            </div>
          )}

          {!isGameActive && remoteStream && (
            <div className="video-panel__label video-panel__label--top-right">
              <div className="video-panel__indicator bg-blue-500" />
              <span>{partner?.username || 'Stranger'}</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== GAME MODE CONTROLS (Report/Skip during games) ===== */}
      {isGameActive && (
        <div className="game-mode-controls">
          <button
            onClick={() => setShowReportModal(true)}
            className="game-mode-controls__btn game-mode-controls__btn--report"
            data-testid="game-mode-report"
          >
            <span>⚠️</span>
            {!isMobile && <span>Report</span>}
          </button>
          <button
            onClick={handleSkip}
            disabled={isSkipping}
            className="game-mode-controls__btn game-mode-controls__btn--skip"
            data-testid="game-mode-skip"
          >
            {isSkipping ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <span>→</span>
                <span>Skip</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ===== GAME OVERLAY (Full screen when active) ===== */}
      {showFeud && (
        <div className="game-fullscreen-container">
          <FeudGame
            isOpen={showFeud}
            onClose={closeGame}
            socket={socket}
            myUserId={user?.user_id || user?.guest_id}
            partnerUsername={partner?.username || 'Stranger'}
            sessionId={sessionId}
            initialGameState={feudGameState}
          />
        </div>
      )}
      
      {showUno && (
        <div className="game-fullscreen-container">
          <UnoGame
            isOpen={showUno}
            onClose={closeGame}
            socket={socket}
            myUserId={user?.user_id || user?.guest_id}
            partnerUsername={partner?.username || 'Stranger'}
            sessionId={sessionId}
            isMobile={isMobile}
            initialGameState={unoGameState}
          />
        </div>
      )}
      
      {showDraw && (
        <div className="game-fullscreen-container">
          <DrawGame
            socket={socket}
            sessionId={sessionId}
            userId={user?.user_id || user?.guest_id}
            username={user?.username || 'You'}
            partnerUsername={partner?.username || 'Stranger'}
            localStream={localStream}
            remoteStream={remoteStream}
            onClose={closeGame}
            initialGameState={drawGameState}
          />
        </div>
      )}

      {/* ===== BOTTOM ACTION BAR (hidden during games) ===== */}
      {!isGameActive && (
        <div className="match-bottombar">
          <div className="match-bottombar__content">
            {/* Game Buttons - More Prominent */}
            <div className="match-bottombar__games">
              <div className="match-bottombar__game-btns">
                {/* Matching Filters */}
                <button
                  onClick={() => setShowFilters(true)}
                  className="match-bottombar__game-btn match-bottombar__game-btn--filter"
                  data-testid="filters-btn"
                >
                  <Filter size={14} />
                </button>
                
                {/* UNO - PROMINENT BUTTON */}
                <button
                  onClick={() => toggleGame('uno')}
                  disabled={gameLoading === 'uno'}
                  className={`match-bottombar__game-btn match-bottombar__game-btn--uno ${gameLoading === 'uno' ? 'match-bottombar__game-btn--loading' : ''}`}
                  data-testid="uno-btn"
                >
                  {gameLoading === 'uno' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span className="match-bottombar__game-icon">🎴</span>
                      <span className="match-bottombar__game-label">UNO</span>
                    </>
                  )}
                  {!isPremium && <Crown size={10} className="match-bottombar__premium-badge" />}
                </button>
                
                {/* Raccoon Feud */}
                <button
                  onClick={() => toggleGame('feud')}
                  disabled={gameLoading === 'feud'}
                  className={`match-bottombar__game-btn match-bottombar__game-btn--feud ${gameLoading === 'feud' ? 'match-bottombar__game-btn--loading' : ''}`}
                  data-testid="feud-btn"
                >
                  {gameLoading === 'feud' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Trophy size={14} />
                      <span className="match-bottombar__game-label">Feud</span>
                    </>
                  )}
                  {!isPremium && <Crown size={10} className="match-bottombar__premium-badge" />}
                </button>
                
                {/* Draw & Guess */}
                <button
                  onClick={() => toggleGame('draw')}
                  disabled={gameLoading === 'draw'}
                  className={`match-bottombar__game-btn match-bottombar__game-btn--draw ${gameLoading === 'draw' ? 'match-bottombar__game-btn--loading' : ''}`}
                  data-testid="draw-btn"
                >
                  {gameLoading === 'draw' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Pencil size={14} />
                      <span className="match-bottombar__game-label">Draw</span>
                    </>
                  )}
                  {!isPremium && <Crown size={10} className="match-bottombar__premium-badge" />}
                </button>
              </div>

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
                  <MessageCircle size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== CHAT PANEL ===== */}
      {showChat && !isGameActive && (
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
          isMobile={isMobile}
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
          onSuccess={() => {}}
        />
      )}

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
