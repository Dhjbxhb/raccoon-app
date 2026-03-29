import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, RotateCcw, AlertTriangle, Crown, Zap } from 'lucide-react';
import '@/styles/uno.css';

/**
 * UnoGame - Premium Raccoon-Themed UNO Implementation
 * 
 * Features:
 * - Backend-controlled game logic
 * - Room-based multiplayer sync
 * - Desktop and mobile layouts
 * - Premium dark purple theme
 * - Raccoon-flavored card design
 */

// UNO Color Mapping
const UNO_COLORS = {
  red: { bg: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', name: 'Red' },
  blue: { bg: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', name: 'Blue' },
  green: { bg: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', name: 'Green' },
  yellow: { bg: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', name: 'Yellow' },
  wild: { bg: '#1f2937', glow: 'rgba(124, 58, 237, 0.4)', name: 'Wild' }
};

// Card value display
const getCardDisplay = (card) => {
  if (!card) return { symbol: '?', label: '' };
  
  const valueMap = {
    'skip': { symbol: '⊘', label: 'Skip' },
    'reverse': { symbol: '⟳', label: 'Reverse' },
    'draw_two': { symbol: '+2', label: '+2' },
    'wild': { symbol: '🌈', label: 'Wild' },
    'wild_draw_four': { symbol: '+4', label: '+4' }
  };
  
  if (valueMap[card.value]) return valueMap[card.value];
  return { symbol: card.value, label: card.value };
};

// === SUB-COMPONENTS ===

// Single UNO Card Component
const UnoCard = memo(({ 
  card, 
  isPlayable = false, 
  isBack = false, 
  size = 'normal',
  onClick,
  isAnimating = false,
  animationType = null
}) => {
  const colorData = UNO_COLORS[card?.color] || UNO_COLORS.wild;
  const display = getCardDisplay(card);
  
  const sizeClasses = {
    small: 'uno-card--small',
    normal: 'uno-card--normal',
    large: 'uno-card--large'
  };
  
  if (isBack) {
    return (
      <div 
        className={`uno-card uno-card--back ${sizeClasses[size]}`}
        onClick={onClick}
      >
        <div className="uno-card__back-pattern">
          <span className="uno-card__back-logo">🦝</span>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`
        uno-card 
        ${sizeClasses[size]}
        ${isPlayable ? 'uno-card--playable' : ''}
        ${isAnimating ? `uno-card--${animationType}` : ''}
      `}
      style={{
        '--card-color': colorData.bg,
        '--card-glow': colorData.glow
      }}
      onClick={onClick}
      data-testid={card ? `uno-card-${card.id}` : 'uno-card'}
    >
      <div className="uno-card__inner">
        <span className="uno-card__corner uno-card__corner--top">{display.symbol}</span>
        <span className="uno-card__center">{display.symbol}</span>
        <span className="uno-card__corner uno-card__corner--bottom">{display.symbol}</span>
      </div>
    </div>
  );
});
UnoCard.displayName = 'UnoCard';

// Color Picker Modal (for wild cards)
const ColorPicker = memo(({ isOpen, onSelect, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="uno-color-picker__overlay" onClick={onClose}>
      <div className="uno-color-picker" onClick={e => e.stopPropagation()}>
        <div className="uno-color-picker__title">Choose a color</div>
        <div className="uno-color-picker__options">
          {['red', 'blue', 'green', 'yellow'].map(color => (
            <button
              key={color}
              className="uno-color-picker__btn"
              style={{ backgroundColor: UNO_COLORS[color].bg }}
              onClick={() => onSelect(color)}
              data-testid={`uno-color-${color}`}
            >
              <span className="sr-only">{UNO_COLORS[color].name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
ColorPicker.displayName = 'ColorPicker';

// UNO Call Button
const UnoCallButton = memo(({ canCall, mustCall, onCall, isMyTurn }) => {
  if (!canCall && !mustCall) return null;
  
  return (
    <button
      className={`uno-call-btn ${mustCall ? 'uno-call-btn--urgent' : ''}`}
      onClick={onCall}
      disabled={!isMyTurn}
      data-testid="uno-call-btn"
    >
      <span className="uno-call-btn__text">UNO!</span>
      {mustCall && <Zap size={16} className="uno-call-btn__icon" />}
    </button>
  );
});
UnoCallButton.displayName = 'UnoCallButton';

// === MAIN UNO GAME COMPONENT ===
const UnoGame = memo(({ 
  isOpen, 
  onClose, 
  socket,
  myUserId,
  partnerUsername = 'Stranger',
  sessionId,
  initialGameState = null,
  isMobile = false
}) => {
  const [gameState, setGameState] = useState(initialGameState);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [lastPlayedCard, setLastPlayedCard] = useState(null);
  const [unoCalled, setUnoCalled] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [notification, setNotification] = useState(null);
  
  const mountedRef = useRef(true);
  const socketIdRef = useRef(null);
  const notificationTimer = useRef(null);
  
  // Show notification
  const showNotification = useCallback((message, type = 'info', duration = 2500) => {
    setNotification({ message, type });
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => {
      if (mountedRef.current) setNotification(null);
    }, duration);
  }, []);
  
  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (notificationTimer.current) clearTimeout(notificationTimer.current);
    };
  }, []);
  
  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    if (socketIdRef.current === socket.id) return;
    socketIdRef.current = socket.id;
    
    const handleGameStarted = (data) => {
      if (!mountedRef.current) return;
      setGameState(data.game_state);
      setGameEnded(false);
      setWinner(null);
      setUnoCalled(false);
    };
    
    const handleCardPlayed = (data) => {
      if (!mountedRef.current) return;
      setGameState(data.game_state);
      setLastPlayedCard(data.card);
      
      // Clear animation after delay
      setTimeout(() => {
        if (mountedRef.current) setLastPlayedCard(null);
      }, 300);
      
      // Show effect notifications
      if (data.effect === 'skip') {
        showNotification('Turn skipped!', 'action');
      } else if (data.effect === 'reverse') {
        showNotification('Reversed!', 'action');
      } else if (data.effect === 'draw_two') {
        showNotification('+2 cards!', 'warning');
      } else if (data.effect === 'wild_draw_four') {
        showNotification('+4 cards!', 'warning');
      }
      
      if (data.uno_penalty) {
        showNotification(`UNO penalty! +${data.penalty_cards} cards`, 'error');
      }
    };
    
    const handleCardDrawn = (data) => {
      if (!mountedRef.current) return;
      setGameState(data.game_state);
      
      if (data.player_id === myUserId && data.can_play_drawn) {
        showNotification('You can play the drawn card!', 'info');
      }
    };
    
    const handleUnoCalled = (data) => {
      if (!mountedRef.current) return;
      showNotification(`${data.player_username} called UNO!`, 'success');
      if (data.player_id === myUserId) {
        setUnoCalled(true);
      }
    };
    
    const handleGameEnded = (data) => {
      if (!mountedRef.current) return;
      setGameEnded(true);
      if (data.winner_id) {
        setWinner({
          id: data.winner_id,
          username: data.winner_username,
          isMe: data.winner_id === myUserId
        });
      }
      if (data.reason === 'quit') {
        showNotification('Game ended by player', 'info');
      }
    };
    
    const handleError = (data) => {
      showNotification(data.message || 'Error', 'error');
    };
    
    socket.on('uno_game_started', handleGameStarted);
    socket.on('uno_card_played', handleCardPlayed);
    socket.on('uno_card_drawn', handleCardDrawn);
    socket.on('uno_called', handleUnoCalled);
    socket.on('uno_game_ended', handleGameEnded);
    socket.on('uno_error', handleError);
    
    return () => {
      socket.off('uno_game_started', handleGameStarted);
      socket.off('uno_card_played', handleCardPlayed);
      socket.off('uno_card_drawn', handleCardDrawn);
      socket.off('uno_called', handleUnoCalled);
      socket.off('uno_game_ended', handleGameEnded);
      socket.off('uno_error', handleError);
      socketIdRef.current = null;
    };
  }, [socket, myUserId, showNotification]);
  
  // Restore initial state
  useEffect(() => {
    if (initialGameState) {
      setGameState(initialGameState);
      setGameEnded(initialGameState.status === 'finished');
      if (initialGameState.winner_id) {
        setWinner({
          id: initialGameState.winner_id,
          username: initialGameState.winner_username,
          isMe: initialGameState.winner_id === myUserId
        });
      }
    }
  }, [initialGameState, myUserId]);
  
  // Start game
  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit('start_uno_game');
  }, [socket]);
  
  // Play card
  const handlePlayCard = useCallback((card) => {
    if (!socket || !gameState?.is_my_turn) return;
    
    // Check if card is playable
    if (!gameState.playable_card_ids.includes(card.id)) {
      showNotification('Cannot play this card', 'error');
      return;
    }
    
    // Wild cards need color selection
    if (card.type === 'wild') {
      setPendingCard(card);
      setShowColorPicker(true);
      return;
    }
    
    socket.emit('uno_play_card', { card_id: card.id });
  }, [socket, gameState, showNotification]);
  
  // Select color for wild card
  const handleColorSelect = useCallback((color) => {
    if (!socket || !pendingCard) return;
    
    socket.emit('uno_play_card', { 
      card_id: pendingCard.id,
      chosen_color: color
    });
    
    setShowColorPicker(false);
    setPendingCard(null);
  }, [socket, pendingCard]);
  
  // Draw card
  const handleDrawCard = useCallback(() => {
    if (!socket || !gameState?.is_my_turn) return;
    socket.emit('uno_draw_card');
  }, [socket, gameState]);
  
  // Call UNO
  const handleCallUno = useCallback(() => {
    if (!socket) return;
    socket.emit('uno_call_uno');
    setUnoCalled(true);
  }, [socket]);
  
  // Close game
  const handleClose = useCallback(() => {
    if (socket && !gameEnded) {
      socket.emit('end_uno_game');
    }
    onClose?.();
  }, [socket, gameEnded, onClose]);
  
  // Play again
  const handlePlayAgain = useCallback(() => {
    setGameEnded(false);
    setWinner(null);
    setUnoCalled(false);
    startGame();
  }, [startGame]);
  
  if (!isOpen) return null;
  
  // Derived state
  const isMyTurn = gameState?.is_my_turn || false;
  const myHand = gameState?.my_hand || [];
  const playableIds = gameState?.playable_card_ids || [];
  const topCard = gameState?.top_card;
  const currentColor = gameState?.current_color || 'wild';
  const opponentCardCount = gameState?.opponent_hand_count || 0;
  const opponentUsername = gameState?.opponent_username || partnerUsername;
  const drawPileCount = gameState?.draw_pile_count || 0;
  const canCallUno = gameState?.can_call_uno && !unoCalled;
  const mustCallUno = gameState?.must_call_uno && !unoCalled;
  
  return (
    <div 
      className={`uno-game ${isMobile ? 'uno-game--mobile' : 'uno-game--desktop'}`}
      data-testid="uno-game-overlay"
    >
      {/* Header */}
      <div className="uno-header">
        <div className="uno-header__title">
          <span className="uno-header__logo">🦝</span>
          <span className="uno-header__name">Raccoon UNO</span>
        </div>
        <button onClick={handleClose} className="uno-header__close" data-testid="uno-close">
          <X size={18} />
        </button>
      </div>
      
      {/* No game yet - Start screen */}
      {!gameState && !gameEnded && (
        <div className="uno-start-screen">
          <div className="uno-start-screen__cards">
            <div className="uno-start-screen__card uno-start-screen__card--1">🦝</div>
            <div className="uno-start-screen__card uno-start-screen__card--2">🎴</div>
            <div className="uno-start-screen__card uno-start-screen__card--3">🃏</div>
          </div>
          <h3 className="uno-start-screen__title">Raccoon UNO</h3>
          <p className="uno-start-screen__subtitle">Play against {partnerUsername}!</p>
          <button 
            onClick={startGame} 
            className="uno-start-btn"
            data-testid="start-uno-btn"
          >
            Start Game
          </button>
        </div>
      )}
      
      {/* Game ended - Results */}
      {gameEnded && winner && (
        <div className="uno-end-screen">
          <div className="uno-end-screen__trophy">
            {winner.isMe ? '🎉' : '😔'}
          </div>
          <h3 className="uno-end-screen__title">
            {winner.isMe ? 'You Win!' : `${winner.username} Wins!`}
          </h3>
          <div className="uno-end-screen__actions">
            <button onClick={handlePlayAgain} className="uno-btn uno-btn--primary">
              <RotateCcw size={16} /> Play Again
            </button>
            <button onClick={handleClose} className="uno-btn uno-btn--secondary">
              Exit
            </button>
          </div>
        </div>
      )}
      
      {/* Active game board */}
      {gameState && !gameEnded && (
        <div className="uno-board">
          {/* Opponent Area */}
          <div className="uno-opponent">
            <div className="uno-opponent__info">
              <span className={`uno-opponent__indicator ${!isMyTurn ? 'uno-opponent__indicator--active' : ''}`} />
              <span className="uno-opponent__name">{opponentUsername}</span>
              <span className="uno-opponent__count">{opponentCardCount} cards</span>
            </div>
            <div className="uno-opponent__hand">
              {Array(Math.min(opponentCardCount, 10)).fill(0).map((_, i) => (
                <UnoCard key={i} card={{}} isBack={true} size="small" />
              ))}
              {opponentCardCount > 10 && (
                <span className="uno-opponent__more">+{opponentCardCount - 10}</span>
              )}
            </div>
          </div>
          
          {/* Center Play Area */}
          <div className="uno-center">
            {/* Current color indicator */}
            <div 
              className="uno-center__color-indicator"
              style={{ backgroundColor: UNO_COLORS[currentColor]?.bg || '#1f2937' }}
            >
              {UNO_COLORS[currentColor]?.name || 'Wild'}
            </div>
            
            {/* Discard pile */}
            <div className="uno-center__discard">
              {topCard && (
                <UnoCard 
                  card={topCard} 
                  size="large" 
                  isAnimating={lastPlayedCard?.id === topCard.id}
                  animationType="played"
                />
              )}
            </div>
            
            {/* Draw pile */}
            <button 
              className={`uno-center__draw ${isMyTurn && playableIds.length === 0 ? 'uno-center__draw--highlight' : ''}`}
              onClick={handleDrawCard}
              disabled={!isMyTurn}
              data-testid="uno-draw-pile"
            >
              <div className="uno-center__draw-stack">
                <UnoCard card={{}} isBack={true} size="normal" />
              </div>
              <span className="uno-center__draw-count">{drawPileCount}</span>
            </button>
            
            {/* Turn indicator */}
            <div className={`uno-center__turn ${isMyTurn ? 'uno-center__turn--active' : ''}`}>
              {isMyTurn ? 'Your turn!' : `${opponentUsername}'s turn`}
            </div>
          </div>
          
          {/* UNO Call Button */}
          <UnoCallButton 
            canCall={canCallUno}
            mustCall={mustCallUno}
            onCall={handleCallUno}
            isMyTurn={isMyTurn}
          />
          
          {/* Local Player Hand */}
          <div className="uno-hand">
            <div className="uno-hand__cards">
              {myHand.map(card => (
                <UnoCard
                  key={card.id}
                  card={card}
                  isPlayable={playableIds.includes(card.id) && isMyTurn}
                  size={isMobile ? 'small' : 'normal'}
                  onClick={() => handlePlayCard(card)}
                />
              ))}
            </div>
            <div className="uno-hand__info">
              <span className={`uno-hand__indicator ${isMyTurn ? 'uno-hand__indicator--active' : ''}`} />
              <span className="uno-hand__label">Your hand ({myHand.length})</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Color Picker Modal */}
      <ColorPicker
        isOpen={showColorPicker}
        onSelect={handleColorSelect}
        onClose={() => {
          setShowColorPicker(false);
          setPendingCard(null);
        }}
      />
      
      {/* Notification */}
      {notification && (
        <div className={`uno-notification uno-notification--${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
});

UnoGame.displayName = 'UnoGame';

export default UnoGame;
