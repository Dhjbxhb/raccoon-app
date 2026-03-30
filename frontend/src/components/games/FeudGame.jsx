import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Send, Trophy, CheckCircle, XCircle, Zap, Clock } from 'lucide-react';

/**
 * FeudGame - Multiplayer Raccoon Feud with real-time backend sync
 * 
 * Features:
 * - Both players see the same game state
 * - Backend is source of truth
 * - Mobile-optimized with keyboard handling
 * - Input field stays visible when keyboard opens
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const inputRef = useRef(null);
  const feedbackTimer = useRef(null);
  const mountedRef = useRef(true);
  const socketIdRef = useRef(null);
  const containerRef = useRef(null);
  
  // Detect keyboard visibility on mobile
  useEffect(() => {
    const handleResize = () => {
      // On mobile, viewport height decreases when keyboard appears
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
    };
  }, []);
  
  // Socket event handlers
  useEffect(() => {
    if (!socket) {
      console.log('[FEUD] No socket');
      return;
    }
    
    if (socketIdRef.current === socket.id) {
      return;
    }
    socketIdRef.current = socket.id;
    
    console.log('[FEUD] Registering socket listeners');
    
    const handleGameStarted = (data) => {
      console.log('[FEUD] Game started', data);
      if (!mountedRef.current) return;
      setGameState(data.game_state);
      setIsMyTurn(data.game_state.current_player === myUserId);
      setGameEnded(false);
      setWinner(null);
    };
    
    const handleGuessResult = (data) => {
      console.log('[FEUD] Guess result', data);
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
      console.log('[FEUD] Game ended', data);
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
      console.error('[FEUD] Error:', data.message);
      if (!mountedRef.current) return;
      setFeedback({ type: 'error', message: data.message });
      setIsSubmitting(false);
    };
    
    socket.on('feud_game_started', handleGameStarted);
    socket.on('feud_guess_result', handleGuessResult);
    socket.on('feud_game_ended', handleGameEnded);
    socket.on('feud_error', handleError);
    
    return () => {
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
  
  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit('start_feud_game');
    console.log('[FEUD] Emitted: start_feud_game');
  }, [socket]);
  
  const submitGuess = useCallback(() => {
    if (!socket || !guess.trim() || !isMyTurn || isSubmitting) return;
    setIsSubmitting(true);
    socket.emit('feud_guess', { guess: guess.trim() });
    console.log('[FEUD] Emitted: feud_guess', guess.trim());
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
    <div 
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #1a237e, #0d1442)',
        overflow: 'hidden',
        zIndex: 25,
        borderRadius: 'inherit'
      }}
      data-testid="feud-game-overlay"
    >
      {/* Header - Compact */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: keyboardVisible ? '0.5rem 0.75rem' : '0.75rem 1rem',
        background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.15), rgba(255, 140, 0, 0.1))',
        borderBottom: '1px solid rgba(255, 215, 0, 0.3)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: keyboardVisible ? '1rem' : '1.5rem' }}>🦝</span>
          <span style={{ fontWeight: 700, color: '#ffd700', fontSize: keyboardVisible ? '0.875rem' : '1rem' }}>
            Raccoon Feud
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Score display */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            background: 'rgba(255, 215, 0, 0.2)',
            borderRadius: '2rem'
          }}>
            <Trophy size={12} style={{ color: '#ffd700' }} />
            <span style={{ color: '#ffd700', fontWeight: 700, fontSize: '0.875rem' }}>{myScore}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>-</span>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>{partnerScore}</span>
          </div>
          <button 
            onClick={handleClose}
            style={{
              width: '1.75rem',
              height: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* Content Area - Scrollable */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: keyboardVisible ? '0.5rem' : '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        {/* No game yet - Start screen */}
        {!gameState && !gameEnded && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'bounce 1s infinite' }}>🦝</div>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
              Raccoon Feud!
            </h4>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Play against {partnerUsername}!
            </p>
            <button
              onClick={startGame}
              style={{
                padding: '0.875rem 2rem',
                background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
                border: 'none',
                borderRadius: '0.875rem',
                color: '#1a237e',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(255, 215, 0, 0.4)'
              }}
              data-testid="start-feud-btn"
            >
              Start Game
            </button>
          </div>
        )}
        
        {/* Game ended - Results */}
        {gameEnded && winner && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
              {winner.isTie ? '🤝' : winner.isMe ? '🎉' : '😢'}
            </div>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
              {winner.isTie ? "It's a Tie!" : winner.isMe ? 'You Won!' : `${winner.username} Wins!`}
            </h4>
            
            <div style={{
              display: 'flex',
              gap: '2rem',
              margin: '1.5rem 0'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.75rem',
                background: myScore >= partnerScore ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.05)',
                border: myScore >= partnerScore ? '1px solid rgba(255, 215, 0, 0.4)' : '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffd700' }}>{myScore}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>You</div>
              </div>
              <div style={{ alignSelf: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '1.25rem' }}>vs</div>
              <div style={{
                textAlign: 'center',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.75rem',
                background: partnerScore >= myScore ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.05)',
                border: partnerScore >= myScore ? '1px solid rgba(255, 215, 0, 0.4)' : '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffd700' }}>{partnerScore}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{partnerUsername}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={playAgain}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
                  border: 'none',
                  borderRadius: '0.625rem',
                  color: '#1a237e',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Play Again
              </button>
              <button
                onClick={handleClose}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '0.625rem',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        {/* Active game */}
        {gameState && !gameEnded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Progress + Turn indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)'
            }}>
              <span>Q{qNum}/{totalQ}</span>
              <span style={{ 
                color: isMyTurn ? '#ffd700' : 'rgba(255,255,255,0.5)',
                fontWeight: isMyTurn ? 600 : 400
              }}>
                {isMyTurn ? '🎯 Your turn!' : `⏳ ${partnerUsername}'s turn`}
              </span>
            </div>
            
            {/* Score bar - Compact when keyboard visible */}
            {!keyboardVisible && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '0.75rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isMyTurn ? '#ffd700' : 'white' }}>{myScore}</div>
                  <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)' }}>You</div>
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', justifyContent: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '0.5rem',
                        height: '0.5rem',
                        borderRadius: '50%',
                        background: i < myStrikes ? '#ef4444' : 'rgba(255,255,255,0.2)'
                      }} />
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Trophy size={16} style={{ color: '#ffd700', marginBottom: '0.25rem' }} />
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>vs</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: !isMyTurn ? '#ffd700' : 'white' }}>{partnerScore}</div>
                  <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)' }}>{partnerUsername}</div>
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', justifyContent: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '0.5rem',
                        height: '0.5rem',
                        borderRadius: '50%',
                        background: i < partnerStrikes ? '#ef4444' : 'rgba(255,255,255,0.2)'
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Question - Always visible */}
            {currentQ && (
              <div style={{
                padding: keyboardVisible ? '0.5rem 0.75rem' : '0.75rem 1rem',
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '0.75rem'
              }}>
                <div style={{
                  display: 'inline-block',
                  padding: '0.125rem 0.5rem',
                  background: 'rgba(255, 215, 0, 0.2)',
                  borderRadius: '1rem',
                  fontSize: '0.625rem',
                  color: '#ffd700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.375rem'
                }}>
                  {currentQ.category}
                </div>
                <div style={{
                  color: 'white',
                  fontSize: keyboardVisible ? '0.875rem' : '0.9375rem',
                  fontWeight: 500,
                  textAlign: 'center',
                  lineHeight: 1.4
                }}>
                  {currentQ.question}
                </div>
              </div>
            )}
            
            {/* Answer board - Compact when keyboard visible */}
            {currentQ && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: keyboardVisible ? '0.25rem' : '0.375rem'
              }}>
                {currentQ.answers.map((ans, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: keyboardVisible ? '0.375rem 0.625rem' : '0.5rem 0.75rem',
                      background: ans.revealed 
                        ? revealingIdx === idx 
                          ? 'rgba(255, 215, 0, 0.35)' 
                          : 'rgba(255, 215, 0, 0.15)'
                        : 'rgba(255,255,255,0.05)',
                      border: ans.revealed
                        ? revealingIdx === idx
                          ? '1px solid #ffd700'
                          : '1px solid rgba(255, 215, 0, 0.4)'
                        : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem',
                      transition: 'all 0.3s ease',
                      transform: revealingIdx === idx ? 'scale(1.02)' : 'none'
                    }}
                  >
                    <span style={{
                      fontSize: keyboardVisible ? '0.8125rem' : '0.875rem',
                      fontWeight: 500,
                      color: ans.revealed ? 'white' : 'rgba(255,255,255,0.4)'
                    }}>
                      {ans.revealed ? ans.answer : `${idx + 1}. ???`}
                    </span>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      background: ans.revealed ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255,255,255,0.1)',
                      borderRadius: '0.375rem',
                      fontSize: keyboardVisible ? '0.75rem' : '0.8125rem',
                      fontWeight: 700,
                      color: ans.revealed ? '#ffd700' : 'rgba(255,255,255,0.3)'
                    }}>
                      {ans.revealed ? ans.points : '??'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Steal indicator */}
            {gameState?.is_steal_attempt && (
              <div style={{
                textAlign: 'center',
                padding: '0.5rem 0.75rem',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '0.5rem',
                color: '#f59e0b',
                fontWeight: 700,
                fontSize: '0.875rem',
                animation: 'pulse 1.5s infinite'
              }}>
                <Zap size={14} style={{ display: 'inline', marginRight: '0.375rem' }} />
                STEAL ATTEMPT!
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Input area - Fixed at bottom, always visible */}
      {gameState && !gameEnded && (
        <div style={{
          padding: '0.625rem 0.75rem',
          paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))',
          background: 'rgba(0,0,0,0.4)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isMyTurn || isSubmitting}
              placeholder={isMyTurn ? "Type your answer..." : "Waiting..."}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '0.625rem',
                color: 'white',
                fontSize: '1rem',
                outline: 'none'
              }}
              data-testid="feud-guess-input"
            />
            <button
              onClick={submitGuess}
              disabled={!isMyTurn || !guess.trim() || isSubmitting}
              style={{
                padding: '0 1rem',
                background: isMyTurn && guess.trim() ? '#ffd700' : 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '0.625rem',
                color: isMyTurn && guess.trim() ? '#1a237e' : 'rgba(255,255,255,0.4)',
                fontWeight: 700,
                cursor: isMyTurn && guess.trim() ? 'pointer' : 'not-allowed'
              }}
              data-testid="feud-submit-btn"
            >
              {isSubmitting ? <Clock size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          
          {/* Feedback toast */}
          {feedback && feedback.type !== 'error' && (
            <div style={{
              marginTop: '0.5rem',
              textAlign: 'center',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              background: feedback.type === 'correct' 
                ? 'rgba(34, 197, 94, 0.2)' 
                : 'rgba(239, 68, 68, 0.2)',
              border: feedback.type === 'correct'
                ? '1px solid rgba(34, 197, 94, 0.4)'
                : '1px solid rgba(239, 68, 68, 0.4)',
              color: feedback.type === 'correct' ? '#22c55e' : '#ef4444',
              fontWeight: 600,
              fontSize: '0.875rem'
            }}>
              {feedback.type === 'correct' ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                  <CheckCircle size={16} />
                  {feedback.isMe ? 'You got it!' : `${feedback.player} got it!`} +{feedback.points}
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                  <XCircle size={16} />
                  {feedback.isMe ? 'Strike!' : `${feedback.player} missed!`}
                  {feedback.stealChance && ' STEAL CHANCE!'}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Animations */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
});

FeudGame.displayName = 'FeudGame';

export default FeudGame;
