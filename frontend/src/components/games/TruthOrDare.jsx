import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, RotateCcw, Star, CheckCircle, Zap } from 'lucide-react';
import '@/styles/games.css';

/**
 * TruthOrDare - Multiplayer game with AUTO-GENERATED prompts
 * 
 * Flow:
 * 1. Player spins bottle
 * 2. Bottle lands on a player (selected player)
 * 3. Selected player chooses Truth or Dare
 * 4. Backend auto-generates a prompt for both players to see
 * 5. Selected player completes the task
 * 6. Next round begins
 * 
 * No manual question input required!
 */
const TruthOrDare = memo(({ 
  isOpen, 
  onClose, 
  socket,
  myUserId,
  partnerUsername = 'Stranger',
  sessionId,
  isMobile = false,
  initialGameState = null
}) => {
  const [gameState, setGameState] = useState(initialGameState);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(initialGameState?.spin_rotation || 0);
  const [roundsCompleted, setRoundsCompleted] = useState(initialGameState?.rounds_played || 0);
  
  const mountedRef = useRef(true);
  const socketIdRef = useRef(null);
  
  // Determine if I'm the selected player (must answer) or the asker
  const isSelected = gameState?.selected_player === myUserId;
  const selectedUsername = gameState?.selected_username || 'Player';
  
  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    // Prevent duplicate listeners
    if (socketIdRef.current === socket.id) return;
    socketIdRef.current = socket.id;
    
    const handleGameStarted = (data) => {
      if (!mountedRef.current) return;
      setGameState(data.game_state);
      setSpinRotation(data.game_state.spin_rotation || 0);
      setRoundsCompleted(data.game_state.rounds_played || 0);
    };
    
    const handleSpinResult = (data) => {
      if (!mountedRef.current) return;
      // Animate to the backend-determined rotation
      setSpinRotation(data.spin_rotation);
      
      // After animation completes, update state
      setTimeout(() => {
        if (mountedRef.current) {
          setIsSpinning(false);
          setGameState(data.game_state);
        }
      }, 2000);
    };
    
    const handleChoiceMade = (data) => {
      if (!mountedRef.current) return;
      // Now includes the auto-generated question!
      setGameState(data.game_state);
    };
    
    const handleRoundComplete = (data) => {
      if (!mountedRef.current) return;
      setGameState(data.game_state);
      setRoundsCompleted(data.rounds_played);
    };
    
    const handleGameEnded = (data) => {
      if (!mountedRef.current) return;
      setGameState(data.game_state);
    };
    
    const handleError = (data) => {
      console.error('Truth or Dare error:', data.message);
    };
    
    socket.on('tod_game_started', handleGameStarted);
    socket.on('tod_spin_result', handleSpinResult);
    socket.on('tod_choice_made', handleChoiceMade);
    socket.on('tod_round_complete', handleRoundComplete);
    socket.on('tod_game_ended', handleGameEnded);
    socket.on('tod_error', handleError);
    
    return () => {
      socket.off('tod_game_started', handleGameStarted);
      socket.off('tod_spin_result', handleSpinResult);
      socket.off('tod_choice_made', handleChoiceMade);
      socket.off('tod_round_complete', handleRoundComplete);
      socket.off('tod_game_ended', handleGameEnded);
      socket.off('tod_error', handleError);
      socketIdRef.current = null;
    };
  }, [socket, myUserId]);
  
  // Restore initial game state
  useEffect(() => {
    if (initialGameState) {
      setGameState(initialGameState);
      setSpinRotation(initialGameState.spin_rotation || 0);
      setRoundsCompleted(initialGameState.rounds_played || 0);
    }
  }, [initialGameState]);
  
  const startGame = useCallback(() => {
    console.log('=== TOD START GAME ===');
    console.log('socket:', socket ? 'connected' : 'disconnected');
    if (!socket) {
      console.log('BLOCKED: No socket connection');
      return;
    }
    socket.emit('start_tod_game');
    console.log('EMITTED: start_tod_game');
  }, [socket]);
  
  const spinBottle = useCallback(() => {
    console.log('=== SPIN BOTTLE CLICKED ===');
    console.log('socket:', socket ? 'connected' : 'disconnected');
    console.log('isSpinning:', isSpinning);
    
    if (!socket) {
      console.log('BLOCKED: No socket connection');
      return;
    }
    if (isSpinning) {
      console.log('BLOCKED: Already spinning');
      return;
    }
    setIsSpinning(true);
    socket.emit('tod_spin_bottle');
    console.log('EMITTED: tod_spin_bottle');
  }, [socket, isSpinning]);
  
  const chooseTruthOrDare = useCallback((choice) => {
    if (!socket) return;
    socket.emit('tod_choose', { choice });
  }, [socket]);
  
  const completeRound = useCallback((completed = true) => {
    if (!socket) return;
    socket.emit('tod_complete_round', { completed });
  }, [socket]);
  
  const handleClose = useCallback(() => {
    if (socket) {
      socket.emit('end_tod_game');
    }
    onClose?.();
  }, [socket, onClose]);
  
  if (!isOpen) return null;
  
  const roundState = gameState?.round_state || 'ready';
  
  /**
   * Calculate bottle rotation for display
   */
  const getBottleTransform = () => {
    if (isMobile) {
      return spinRotation + 90;
    }
    return spinRotation;
  };
  
  return (
    <div className="game-overlay game-overlay--truth" data-testid="tod-game-overlay">
      {/* Header */}
      <div className="game-header truth-header">
        <div className="game-header__title">
          <span className="game-header__icon">🍾</span>
          <span className="game-header__name truth-header__name">Truth or Dare</span>
        </div>
        <div className="game-header__actions">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-pink-500/20 rounded-full">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 font-bold">{roundsCompleted}</span>
          </div>
          <button onClick={handleClose} className="game-close-btn">
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="game-content">
        {/* No game yet - Start */}
        {!gameState && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">🍾</div>
            <h4 className="text-2xl font-bold text-white mb-2">Truth or Dare</h4>
            <p className="text-gray-400 text-sm mb-1">Spin the bottle!</p>
            <p className="text-pink-400/70 text-xs mb-6">Play with {partnerUsername}</p>
            
            <button
              onClick={startGame}
              className="truth-spin-btn"
              data-testid="start-tod-btn"
            >
              Start Game
            </button>
          </div>
        )}
        
        {/* Ready to spin */}
        {gameState && roundState === 'ready' && !isSpinning && (
          <div className="truth-bottle-area">
            <p className="text-gray-400 text-sm mb-6">Spin the bottle to see who goes!</p>
            
            {/* Bottle */}
            <div className="relative h-32 flex items-center justify-center mb-6">
              <div 
                className="truth-bottle"
                style={{ transform: `rotate(${getBottleTransform()}deg)` }}
              >
                🍾
              </div>
              <div className="truth-bottle-glow" />
            </div>
            
            {/* Direction labels */}
            <div className="truth-directions">
              {isMobile ? (
                <>
                  <div className="truth-direction">
                    <div className="truth-direction__arrow">⬆️</div>
                    <div className="truth-direction__label">Stranger</div>
                  </div>
                  <div className="truth-direction">
                    <div className="truth-direction__arrow">⬇️</div>
                    <div className="truth-direction__label">You</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="truth-direction">
                    <div className="truth-direction__arrow">⬅️</div>
                    <div className="truth-direction__label">You</div>
                  </div>
                  <div className="truth-direction">
                    <div className="truth-direction__arrow">➡️</div>
                    <div className="truth-direction__label">Stranger</div>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={spinBottle}
              className="truth-spin-btn"
              data-testid="spin-bottle-btn"
            >
              Spin the Bottle!
            </button>
          </div>
        )}
        
        {/* Spinning */}
        {isSpinning && (
          <div className="truth-bottle-area">
            <div 
              className="truth-bottle truth-bottle--spinning"
              style={{ 
                transform: `rotate(${getBottleTransform()}deg)`,
                transition: 'transform 2s cubic-bezier(0.2, 0.8, 0.3, 1)'
              }}
            >
              🍾
            </div>
            <p className="text-gray-400 mt-6 animate-pulse">Spinning...</p>
          </div>
        )}
        
        {/* Choosing truth or dare */}
        {roundState === 'choosing' && !isSpinning && (
          <div className="text-center">
            {/* Who was selected */}
            <div className={`truth-selected ${!isSelected ? 'truth-selected--stranger' : ''}`}>
              <span className="truth-selected__icon">{isSelected ? '👆' : '🎯'}</span>
              <div className="truth-selected__info">
                <div className="truth-selected__label">It's</div>
                <div className="truth-selected__name">
                  {isSelected ? 'YOUR turn!' : `${selectedUsername}'s turn!`}
                </div>
              </div>
            </div>
            
            {isSelected ? (
              <>
                <p className="text-gray-400 text-sm mb-4">Choose for yourself:</p>
                <div className="truth-choices">
                  <button
                    onClick={() => chooseTruthOrDare('truth')}
                    className="truth-choice-btn truth-choice-btn--truth"
                    data-testid="choose-truth-btn"
                  >
                    <div className="truth-choice-btn__icon">🤔</div>
                    <div className="truth-choice-btn__label">Truth</div>
                  </button>
                  <button
                    onClick={() => chooseTruthOrDare('dare')}
                    className="truth-choice-btn truth-choice-btn--dare"
                    data-testid="choose-dare-btn"
                  >
                    <div className="truth-choice-btn__icon">🔥</div>
                    <div className="truth-choice-btn__label">Dare</div>
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-sm">Waiting for {selectedUsername} to choose...</p>
            )}
            
            <button
              onClick={spinBottle}
              className="mt-6 text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1 mx-auto"
            >
              <RotateCcw size={14} />
              Spin again
            </button>
          </div>
        )}
        
        {/* Answering phase - show the auto-generated prompt */}
        {roundState === 'answering' && !isSpinning && (
          <div className="space-y-4">
            {/* Who and what */}
            <div className={`truth-prompt ${gameState.current_choice === 'truth' ? 'truth-prompt--truth' : 'truth-prompt--dare'}`}>
              <div className="truth-prompt__badge">
                <Zap size={14} className="inline mr-1" />
                {isSelected ? 'Your' : `${selectedUsername}'s`} {gameState.current_choice}
              </div>
              <div className="truth-prompt__text">
                {gameState.current_question}
              </div>
            </div>
            
            {/* Actions */}
            <div className="truth-actions">
              <button
                onClick={() => completeRound(false)}
                className="truth-action-btn truth-action-btn--skip"
              >
                <RotateCcw size={16} className="inline mr-1" />
                Skip
              </button>
              <button
                onClick={() => completeRound(true)}
                className="truth-action-btn truth-action-btn--done"
                data-testid="tod-done-btn"
              >
                <CheckCircle size={16} className="inline mr-1" />
                Done! {isSelected && '+1'}
              </button>
            </div>
            
            {/* Encouragement text */}
            <p className="text-center text-gray-500 text-xs">
              {isSelected 
                ? "Complete the challenge, then tap Done!" 
                : `Watch ${selectedUsername} complete the challenge!`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

TruthOrDare.displayName = 'TruthOrDare';

export default TruthOrDare;
