import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Send, Trophy, Clock, SkipForward, ArrowRight } from 'lucide-react';

/**
 * FeudGame - SPEED MODE
 * Fast-paced typing competition where players race to type correct answers
 * 
 * - NO TURNS - Both players type simultaneously
 * - First to type correct answer LOCKS it and gets points
 * - 5 answers per question, 5 rounds total
 * - 30 second countdown per round
 * - Clean, competitive, addictive gameplay
 */
const FeudGame = memo(({ 
  isOpen, 
  onClose, 
  socket,
  myUserId,
  partnerUsername = 'Stranger',
  sessionId,
  initialGameState = null,
  localStream,
  remoteStream
}) => {
  const [gameState, setGameState] = useState(initialGameState);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [roundEndData, setRoundEndData] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const inputRef = useRef(null);
  const feedbackTimer = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const socketIdRef = useRef(null);
  
  // Detect keyboard visibility on mobile
  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const keyboardOpen = viewportHeight < windowHeight * 0.75;
      setKeyboardVisible(keyboardOpen);
    };
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport.removeEventListener('resize', handleResize);
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  // Countdown timer
  useEffect(() => {
    if (!gameState || gameState.status !== 'active' || !gameState.round_active || showRoundEnd) {
      return;
    }
    
    setTimeLeft(gameState.round_time_limit || 30);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - notify server
          socket?.emit('feud_time_up');
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.current_round, gameState?.round_active, showRoundEnd, socket]);
  
  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    if (socketIdRef.current === socket.id) return;
    socketIdRef.current = socket.id;
    
    const handleGameStarted = (data) => {
      console.log('[FEUD SPEED] Game started', data);
      if (!mountedRef.current) return;
      setGameState(data.game_state);
      setGameEnded(false);
      setWinner(null);
      setShowRoundEnd(false);
      setTimeLeft(data.game_state?.round_time_limit || 30);
    };
    
    const handleGuessResult = (data) => {
      console.log('[FEUD SPEED] Guess result', data);
      if (!mountedRef.current) return;
      
      setGameState(data.game_state);
      setIsSubmitting(false);
      
      if (data.correct) {
        setFeedback({
          type: 'correct',
          player: data.player_username,
          answer: data.matched_answer,
          points: data.points,
          isMe: data.player_id === myUserId,
          index: data.matched_index
        });
      }
      
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => {
        if (mountedRef.current) setFeedback(null);
      }, 1500);
    };
    
    const handleRoundEnded = (data) => {
      console.log('[FEUD SPEED] Round ended', data);
      if (!mountedRef.current) return;
      
      setShowRoundEnd(true);
      setRoundEndData(data);
      setGameState(data.game_state);
      
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Check if game over
      if (data.game_over) {
        setGameEnded(true);
        setWinner({
          id: data.winner_id,
          username: data.winner_username,
          isMe: data.winner_id === myUserId,
          isTie: data.winner_id === 'tie'
        });
      }
    };
    
    const handleRoundStarted = (data) => {
      console.log('[FEUD SPEED] Round started', data);
      if (!mountedRef.current) return;
      
      setGameState(data.game_state);
      setShowRoundEnd(false);
      setRoundEndData(null);
      setGuess('');
      setFeedback(null);
      setTimeLeft(data.game_state?.round_time_limit || 30);
    };
    
    const handleGameEnded = (data) => {
      console.log('[FEUD SPEED] Game ended', data);
      if (!mountedRef.current) return;
      setGameState(data.game_state);
      setGameEnded(true);
      setWinner({
        id: data.winner_id,
        username: data.winner_username,
        isMe: data.winner_id === myUserId,
        isTie: data.winner_id === 'tie'
      });
    };
    
    const handleError = (data) => {
      console.error('[FEUD SPEED] Error:', data.message);
      if (!mountedRef.current) return;
      setFeedback({ type: 'error', message: data.message });
      setIsSubmitting(false);
    };
    
    socket.on('feud_game_started', handleGameStarted);
    socket.on('feud_guess_result', handleGuessResult);
    socket.on('feud_round_ended', handleRoundEnded);
    socket.on('feud_round_started', handleRoundStarted);
    socket.on('feud_game_ended', handleGameEnded);
    socket.on('feud_error', handleError);
    
    return () => {
      socket.off('feud_game_started', handleGameStarted);
      socket.off('feud_guess_result', handleGuessResult);
      socket.off('feud_round_ended', handleRoundEnded);
      socket.off('feud_round_started', handleRoundStarted);
      socket.off('feud_game_ended', handleGameEnded);
      socket.off('feud_error', handleError);
      socketIdRef.current = null;
    };
  }, [socket, myUserId]);
  
  // Restore initial game state
  useEffect(() => {
    if (initialGameState) {
      setGameState(initialGameState);
      setGameEnded(initialGameState.status === 'finished');
      if (initialGameState.winner_id) {
        setWinner({
          id: initialGameState.winner_id,
          username: initialGameState.winner_username,
          isMe: initialGameState.winner_id === myUserId,
          isTie: initialGameState.winner_id === 'tie'
        });
      }
    }
  }, [initialGameState, myUserId]);
  
  const submitGuess = useCallback(() => {
    if (!socket || !guess.trim() || isSubmitting || showRoundEnd) return;
    setIsSubmitting(true);
    socket.emit('feud_guess', { guess: guess.trim() });
    setGuess('');
  }, [socket, guess, isSubmitting, showRoundEnd]);
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') submitGuess();
  };
  
  const skipRound = useCallback(() => {
    if (socket) socket.emit('feud_skip_round');
  }, [socket]);
  
  const nextRound = useCallback(() => {
    if (socket) socket.emit('feud_next_round');
  }, [socket]);
  
  const playAgain = useCallback(() => {
    setGameState(null);
    setGameEnded(false);
    setWinner(null);
    setFeedback(null);
    setShowRoundEnd(false);
    socket?.emit('start_feud_game');
  }, [socket]);
  
  const handleClose = useCallback(() => {
    if (socket) socket.emit('end_feud_game');
    onClose?.();
  }, [socket, onClose]);
  
  if (!isOpen) return null;
  
  // Derive display values
  const myScore = gameState 
    ? (myUserId === gameState.player1_id ? gameState.player1_score : gameState.player2_score) : 0;
  const partnerScore = gameState
    ? (myUserId === gameState.player1_id ? gameState.player2_score : gameState.player1_score) : 0;
  const myUsername = gameState
    ? (myUserId === gameState.player1_id ? gameState.player1_username : gameState.player2_username) : 'You';
  const currentQ = gameState?.current_question;
  const currentRound = gameState?.current_round || 1;
  const totalRounds = gameState?.total_rounds || 5;
  
  // Timer color based on time left
  const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#22c55e';
  
  return (
    <div 
      className="absolute inset-0 flex flex-col overflow-hidden z-25"
      style={{
        background: 'linear-gradient(180deg, #1a0a2e 0%, #16082a 50%, #0d0620 100%)',
        borderRadius: 'inherit'
      }}
      data-testid="feud-game-overlay"
    >
      {/* Cosmic Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[500px] h-[500px] opacity-15"
          style={{
            top: '5%',
            left: '10%',
            background: 'radial-gradient(ellipse, rgba(168, 85, 247, 0.4) 0%, transparent 60%)',
            filter: 'blur(80px)'
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] opacity-10"
          style={{
            bottom: '10%',
            right: '5%',
            background: 'radial-gradient(ellipse, rgba(236, 72, 153, 0.3) 0%, transparent 55%)',
            filter: 'blur(60px)'
          }}
        />
      </div>
      
      {/* === PLAYER CARDS AT TOP === */}
      <div className={`relative z-10 flex justify-center gap-4 px-4 ${keyboardVisible ? 'pt-2' : 'pt-4'}`}>
        {/* My Card */}
        <div className="flex flex-col items-center">
          <div 
            className={`w-28 h-20 sm:w-32 sm:h-[5.5rem] lg:w-40 lg:h-24 rounded-2xl overflow-hidden border-2 ${
              feedback?.isMe && feedback?.type === 'correct' ? 'border-green-400 shadow-lg shadow-green-400/50' : 'border-purple-500/50'
            }`}
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(168, 85, 247, 0.2))'
            }}
          >
            {localStream ? (
              <video
                autoPlay
                muted
                playsInline
                ref={el => {
                  if (el && el.srcObject !== localStream) el.srcObject = localStream;
                }}
                className="h-full w-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                {myUsername.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-white text-sm mt-2 font-medium" data-testid="feud-my-name">{myUsername}</span>
          <div className="flex items-center gap-1 mt-1" data-testid="feud-my-score">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-yellow-400 font-bold">{myScore}</span>
          </div>
        </div>
        
        {/* Partner Card */}
        <div className="flex flex-col items-center">
          <div 
            className={`w-28 h-20 sm:w-32 sm:h-[5.5rem] lg:w-40 lg:h-24 rounded-2xl overflow-hidden border-2 ${
              feedback && !feedback.isMe && feedback?.type === 'correct' ? 'border-green-400 shadow-lg shadow-green-400/50' : 'border-purple-500/50'
            }`}
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(168, 85, 247, 0.2))'
            }}
          >
            {remoteStream ? (
              <video
                autoPlay
                playsInline
                ref={el => {
                  if (el && el.srcObject !== remoteStream) el.srcObject = remoteStream;
                }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                {partnerUsername.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-white text-sm mt-2 font-medium" data-testid="feud-partner-name">{partnerUsername}</span>
          <div className="flex items-center gap-1 mt-1" data-testid="feud-partner-score">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-yellow-400 font-bold">{partnerScore}</span>
          </div>
        </div>
      </div>
      
      {/* === ROUND INFO BAR === */}
      {!keyboardVisible && (
        <div className="relative z-10 flex items-center justify-between px-4 py-2 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">ROUND {currentRound}</span>
          </div>
          
          <div 
            className="flex items-center gap-2 px-3 py-1 rounded-full border"
            style={{ borderColor: timerColor }}
          >
            <Clock size={16} style={{ color: timerColor }} />
            <span className="font-bold text-lg" style={{ color: timerColor }}>
              {timeLeft}s
            </span>
          </div>
          
          <button
            onClick={skipRound}
            disabled={showRoundEnd}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-colors disabled:opacity-50"
            data-testid="feud-skip-btn"
          >
            <SkipForward size={14} />
            Skip Round
          </button>
        </div>
      )}
      
      {/* === QUESTION BOX === */}
      <div className={`relative z-10 mx-4 ${keyboardVisible ? 'mt-2' : 'mt-3'}`}>
        <div 
          className="p-4 rounded-xl border border-purple-500/30 text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(88, 28, 135, 0.4), rgba(59, 7, 100, 0.3))'
          }}
        >
          <p className={`text-white font-semibold ${keyboardVisible ? 'text-base' : 'text-lg sm:text-xl'}`}>
            {currentQ?.question || 'Loading question...'}
          </p>
        </div>
      </div>
      
      {/* === ANSWERS BOARD === */}
      <div className={`relative z-10 flex-1 mx-4 ${keyboardVisible ? 'mt-2' : 'mt-3'} overflow-y-auto`}>
        <div 
          className="rounded-xl border border-purple-500/20 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(30, 10, 60, 0.8), rgba(20, 5, 40, 0.9))'
          }}
        >
          {currentQ?.answers?.map((ans, idx) => (
            <div 
              key={idx}
              className={`flex items-center px-4 py-3 border-b border-purple-500/10 last:border-b-0 transition-all ${
                ans.revealed && ans.claimed_by_id === myUserId 
                  ? 'bg-green-500/20' 
                  : ans.revealed && ans.claimed_by_id 
                  ? 'bg-purple-500/20'
                  : ''
              }`}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                  ans.revealed ? 'bg-yellow-500 text-black' : 'bg-purple-600 text-white'
                }`}
              >
                {idx + 1}
              </div>
              
              <span className={`flex-1 font-semibold ${
                ans.revealed ? 'text-white' : 'text-white/50'
              }`}>
                {ans.answer}
              </span>
              
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold">{ans.points}</span>
                <Trophy size={16} className="text-yellow-500" />
              </div>
              
              {ans.claimed_by_username && (
                <span className="ml-2 text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                  {ans.claimed_by_username}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* === FEEDBACK NOTIFICATION === */}
      {feedback && feedback.type === 'correct' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className={`px-6 py-4 rounded-xl text-center ${
            feedback.isMe ? 'bg-green-500' : 'bg-purple-500'
          } shadow-2xl animate-bounce`}>
            <div className="text-white font-bold text-lg">
              {feedback.isMe ? 'YOU GOT IT!' : `${feedback.player} got it!`}
            </div>
            <div className="text-white/90 text-sm">
              {feedback.answer} - +{feedback.points} pts
            </div>
          </div>
        </div>
      )}
      
      {/* === INPUT AREA === */}
      <div 
        className="relative z-10 px-4 pb-4 pt-2"
        style={{
          paddingBottom: keyboardVisible ? 'env(safe-area-inset-bottom, 8px)' : '1rem'
        }}
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your guess..."
            disabled={isSubmitting || showRoundEnd || gameEnded}
            className="flex-1 bg-white/10 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 disabled:opacity-50"
            data-testid="feud-guess-input"
          />
          <button
            onClick={submitGuess}
            disabled={isSubmitting || !guess.trim() || showRoundEnd || gameEnded}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl text-white font-semibold disabled:opacity-50 transition-all"
            data-testid="feud-submit-btn"
          >
            Submit
          </button>
        </div>
        
        {/* Leave Game Button */}
        <button
          onClick={handleClose}
          className="w-full mt-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 text-sm flex items-center justify-center gap-2 transition-colors"
          data-testid="feud-leave-btn"
        >
          <X size={16} />
          Leave Game
        </button>
      </div>
      
      {/* === ROUND END OVERLAY === */}
      {showRoundEnd && !gameEnded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gradient-to-b from-[#2a1050] to-[#1a0830] rounded-2xl border border-purple-500/30 p-6 mx-4 max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Round {currentRound} Complete!
            </h2>
            
            <div className="flex justify-around mb-6">
              <div>
                <div className="text-white/60 text-sm">{myUsername}</div>
                <div className="text-yellow-400 text-2xl font-bold">{myScore}</div>
              </div>
              <div>
                <div className="text-white/60 text-sm">{partnerUsername}</div>
                <div className="text-yellow-400 text-2xl font-bold">{partnerScore}</div>
              </div>
            </div>
            
            {currentRound < totalRounds && (
              <button
                onClick={nextRound}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl text-white font-semibold transition-all"
                data-testid="feud-next-round-btn"
              >
                Next Round
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* === GAME END OVERLAY === */}
      {gameEnded && winner && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gradient-to-b from-[#2a1050] to-[#1a0830] rounded-2xl border border-purple-500/30 p-8 mx-4 max-w-sm w-full text-center">
            <div className="text-6xl mb-4">
              {winner.isTie ? '🤝' : winner.isMe ? '🏆' : '😢'}
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">
              {winner.isTie ? "Winner: Tie" : winner.isMe ? 'Winner: You' : `Winner: ${winner.username}`}
            </h2>
            
            <div className="flex justify-around my-6 py-4 bg-white/5 rounded-xl">
              <div>
                <div className="text-white/60 text-sm">{myUsername}</div>
                <div className="text-yellow-400 text-3xl font-bold">{myScore}</div>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <div className="text-white/60 text-sm">{partnerUsername}</div>
                <div className="text-yellow-400 text-3xl font-bold">{partnerScore}</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
              >
                Leave
              </button>
              <button
                onClick={playAgain}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl text-white font-semibold transition-all"
                data-testid="feud-play-again-btn"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default FeudGame;
