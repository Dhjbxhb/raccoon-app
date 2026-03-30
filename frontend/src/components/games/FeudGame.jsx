import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Send, Trophy, CheckCircle, XCircle, Zap, Clock } from 'lucide-react';
import '@/styles/games.css';

/**
 * FeudGame - Multiplayer Raccoon Feud with real-time backend sync
 * 
 * Features:
 * - Both players see the same game state
 * - Backend is source of truth
 * - Supports reconnection with state restoration
 */
const FeudGame = memo(({ 
  isOpen, 
  onClose, 
  socket,
  myUserId,
  partnerUsername = 'Stranger',
  sessionId,
  initialGameState = null
}) => {
  const [gameState, setGameState] = useState(initialGameState);
  const [isMyTurn, setIsMyTurn] = useState(initialGameState?.current_player === myUserId);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [revealingIdx, setRevealingIdx] = useState(null);
  const [gameEnded, setGameEnded] = useState(initialGameState?.status === 'finished');
  const [winner, setWinner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const inputRef = useRef(null);
  const feedbackTimer = useRef(null);
  const mountedRef = useRef(true);
  const socketIdRef = useRef(null);
  
  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);
  
  // Socket event handlers
  useEffect(() => {
    if (!socket) {
      console.log('=== FEUD: No socket available ===');
      return;
    }
    
    console.log('=== FEUD: Registering socket listeners ===');
    console.log('Socket ID:', socket.id);
    console.log('Socket connected:', socket.connected);
    
    // Prevent duplicate listeners
    if (socketIdRef.current === socket.id) {
      console.log('=== FEUD: Socket listeners already registered ===');
      return;
    }
    socketIdRef.current = socket.id;
    
    const handleGameStarted = (data) => {
      console.log('=== FEUD: feud_game_started received ===');
      console.log('Data:', JSON.stringify(data));
      if (!mountedRef.current) return;
      setGameState(data.game_state);
      setIsMyTurn(data.game_state.current_player === myUserId);
      setGameEnded(false);
      setWinner(null);
    };
    
    const handleGuessResult = (data) => {
      console.log('=== FEUD: feud_guess_result received ===');
      if (!mountedRef.current) return;
      
      if (data.correct) {
        const idx = data.game_state.current_question.answers.findIndex(
          a => a.revealed && a.answer === data.matched_answer
        );
        if (idx >= 0) {
          setRevealingIdx(idx);
          setTimeout(() => {
            if (mountedRef.current) setRevealingIdx(null);
          }, 500);
        }
        
        setFeedback({
          type: 'correct',
          player: data.player_username,
          answer: data.matched_answer,
          points: data.points,
          isMe: data.player_id === myUserId
        });
      } else if (data.strike) {
        setFeedback({
          type: 'strike',
          player: data.player_username,
          isMe: data.player_id === myUserId,
          stealChance: data.steal_opportunity
        });
      }
      
      setGameState(data.game_state);
      setIsMyTurn(data.game_state.current_player === myUserId);
      setIsSubmitting(false);
      
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => {
        if (mountedRef.current) setFeedback(null);
      }, 2500);
    };
    
    const handleGameEnded = (data) => {
      console.log('=== FEUD: feud_game_ended received ===');
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
      console.error('=== FEUD ERROR ===:', data.message);
      if (!mountedRef.current) return;
      setFeedback({ type: 'error', message: data.message });
      setIsSubmitting(false);
    };
    
    socket.on('feud_game_started', handleGameStarted);
    socket.on('feud_guess_result', handleGuessResult);
    socket.on('feud_game_ended', handleGameEnded);
    socket.on('feud_error', handleError);
    
    console.log('=== FEUD: Socket listeners registered ===');
    
    return () => {
      console.log('=== FEUD: Cleaning up socket listeners ===');
      socket.off('feud_game_started', handleGameStarted);
      socket.off('feud_guess_result', handleGuessResult);
      socket.off('feud_game_ended', handleGameEnded);
      socket.off('feud_error', handleError);
      socketIdRef.current = null;
    };
  }, [socket, myUserId]);
  
  // Restore initial game state
  useEffect(() => {
    if (initialGameState) {
      setGameState(initialGameState);
      setIsMyTurn(initialGameState.current_player === myUserId);
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
  
  // Focus input on my turn
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn]);
  
  const startGame = useCallback(() => {
    console.log('=== FEUD START GAME ===');
    console.log('socket:', socket ? 'connected' : 'disconnected');
    if (!socket) {
      console.log('BLOCKED: No socket connection');
      return;
    }
    socket.emit('start_feud_game');
    console.log('EMITTED: start_feud_game');
  }, [socket]);
  
  const submitGuess = useCallback(() => {
    console.log('=== FEUD SUBMIT GUESS ===');
    console.log('socket:', socket ? 'connected' : 'disconnected');
    console.log('guess:', guess);
    console.log('isMyTurn:', isMyTurn);
    console.log('isSubmitting:', isSubmitting);
    
    if (!socket || !guess.trim() || !isMyTurn || isSubmitting) {
      console.log('BLOCKED: Missing socket, guess, not my turn, or already submitting');
      return;
    }
    setIsSubmitting(true);
    socket.emit('feud_guess', { guess: guess.trim() });
    console.log('EMITTED: feud_guess', { guess: guess.trim() });
    setGuess('');
  }, [socket, guess, isMyTurn, isSubmitting]);
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') submitGuess();
  };
  
  const playAgain = useCallback(() => {
    setGameState(null);
    setGameEnded(false);
    setWinner(null);
    setFeedback(null);
    startGame();
  }, [startGame]);
  
  const handleClose = useCallback(() => {
    if (socket) {
      socket.emit('end_feud_game');
    }
    onClose?.();
  }, [socket, onClose]);
  
  if (!isOpen) return null;
  
  // Derive display values
  const myScore = gameState 
    ? (myUserId === gameState.player1_id ? gameState.player1_score : gameState.player2_score) : 0;
  const partnerScore = gameState
    ? (myUserId === gameState.player1_id ? gameState.player2_score : gameState.player1_score) : 0;
  const myStrikes = gameState
    ? (myUserId === gameState.player1_id ? gameState.player1_strikes : gameState.player2_strikes) : 0;
  const partnerStrikes = gameState
    ? (myUserId === gameState.player1_id ? gameState.player2_strikes : gameState.player1_strikes) : 0;
  const currentQ = gameState?.current_question;
  const qNum = gameState?.question_number || 1;
  const totalQ = gameState?.total_questions || 5;
  
  return (
    <div className="game-overlay game-overlay--feud" data-testid="feud-game-overlay">
      {/* Header */}
      <div className="game-header feud-header">
        <div className="game-header__title">
          <span className="game-header__icon">🦝</span>
          <span className="game-header__name feud-header__name">Raccoon Feud</span>
        </div>
        <div className="game-header__actions">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-[#ffd700]/20 rounded-full">
            <Trophy size={14} className="text-[#ffd700]" />
            <span className="text-[#ffd700] font-bold">{myScore}</span>
            <span className="text-gray-500 text-sm">-</span>
            <span className="text-white font-bold">{partnerScore}</span>
          </div>
          <button onClick={handleClose} className="game-close-btn">
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="game-content">
        {/* No game yet - Start screen */}
        {!gameState && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4 animate-bounce">🦝</div>
            <h4 className="text-2xl font-bold text-white mb-2">Raccoon Feud!</h4>
            <p className="text-gray-400 text-sm mb-1">Survey Says...</p>
            <p className="text-[#ffd700]/70 text-xs mb-6">Play against {partnerUsername}!</p>
            
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,215,0,0.4)]"
              data-testid="start-feud-btn"
            >
              Start Game
            </button>
          </div>
        )}
        
        {/* Game ended - Results */}
        {gameEnded && winner && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">
              {winner.isTie ? '🤝' : winner.isMe ? '🎉' : '😢'}
            </div>
            <h4 className="text-2xl font-bold text-white mb-2">
              {winner.isTie ? "It's a Tie!" : winner.isMe ? 'You Won!' : `${winner.username} Wins!`}
            </h4>
            
            <div className="flex items-center gap-8 my-6">
              <div className={`text-center p-4 rounded-xl ${myScore >= partnerScore ? 'bg-[#ffd700]/20 border border-[#ffd700]/50' : 'bg-white/5'}`}>
                <div className="text-3xl font-bold text-[#ffd700] mb-1">{myScore}</div>
                <div className="text-sm text-gray-400">You</div>
              </div>
              <div className="text-2xl text-gray-500">vs</div>
              <div className={`text-center p-4 rounded-xl ${partnerScore >= myScore ? 'bg-[#ffd700]/20 border border-[#ffd700]/50' : 'bg-white/5'}`}>
                <div className="text-3xl font-bold text-[#ffd700] mb-1">{partnerScore}</div>
                <div className="text-sm text-gray-400">{partnerUsername}</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={playAgain}
                className="px-6 py-2 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-[#1a237e] font-bold rounded-xl hover:scale-105 transition-all"
              >
                Play Again
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        {/* Active game */}
        {gameState && !gameEnded && (
          <div className="space-y-3">
            {/* Progress */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Q{qNum}/{totalQ}</span>
              <span className={isMyTurn ? 'text-[#ffd700]' : 'text-gray-500'}>
                {isMyTurn ? '🎯 Your turn!' : `⏳ ${partnerUsername}'s turn`}
              </span>
            </div>
            
            {/* Score bar */}
            <div className="game-score-bar">
              <div className="game-score-player">
                <div className={`game-score-value ${isMyTurn ? 'text-[#ffd700]' : ''}`}>{myScore}</div>
                <div className="game-score-label">You</div>
                <div className="feud-strikes mt-1 justify-center">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`feud-strike ${i < myStrikes ? 'feud-strike--active' : ''}`} />
                  ))}
                </div>
              </div>
              <div className="game-score-vs">
                <Trophy size={18} className="text-[#ffd700] mx-auto mb-1" />
                vs
              </div>
              <div className="game-score-player">
                <div className={`game-score-value ${!isMyTurn ? 'text-[#ffd700]' : ''}`}>{partnerScore}</div>
                <div className="game-score-label">{partnerUsername}</div>
                <div className="feud-strikes mt-1 justify-center">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`feud-strike ${i < partnerStrikes ? 'feud-strike--active' : ''}`} />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Question */}
            {currentQ && (
              <>
                <div className="feud-question">
                  <div className="feud-question__category">{currentQ.category}</div>
                  <div className="feud-question__text">{currentQ.question}</div>
                </div>
                
                {/* Answer board */}
                <div className="feud-answers">
                  {currentQ.answers.map((ans, idx) => (
                    <div
                      key={idx}
                      className={`feud-answer ${ans.revealed ? 'feud-answer--revealed' : ''} ${revealingIdx === idx ? 'feud-answer--revealing' : ''}`}
                    >
                      <span className="feud-answer__text">
                        {ans.revealed ? ans.answer : `${idx + 1}. ???`}
                      </span>
                      <span className="feud-answer__points">
                        {ans.revealed ? ans.points : '??'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Steal indicator */}
            {gameState?.is_steal_attempt && (
              <div className="feud-steal">
                <Zap size={16} className="inline mr-1" /> STEAL ATTEMPT!
              </div>
            )}
            
            {/* Input */}
            <div className="feud-input">
              <input
                ref={inputRef}
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!isMyTurn || isSubmitting}
                placeholder={isMyTurn ? "Type your answer..." : "Waiting..."}
                className="feud-input__field"
                data-testid="feud-guess-input"
              />
              <button
                onClick={submitGuess}
                disabled={!isMyTurn || !guess.trim() || isSubmitting}
                className="feud-input__submit"
                data-testid="feud-submit-btn"
              >
                {isSubmitting ? <Clock size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            
            {/* Feedback */}
            {feedback && feedback.type !== 'error' && (
              <div className={`feud-feedback ${feedback.type === 'correct' ? 'feud-feedback--correct' : 'feud-feedback--strike'}`}>
                {feedback.type === 'correct' ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle size={16} />
                    {feedback.isMe ? 'You got it!' : `${feedback.player} got it!`} +{feedback.points}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <XCircle size={16} />
                    {feedback.isMe ? 'Strike!' : `${feedback.player} missed!`}
                    {feedback.stealChance && ' STEAL CHANCE!'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

FeudGame.displayName = 'FeudGame';

export default FeudGame;
