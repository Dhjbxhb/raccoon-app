import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, RotateCcw, Zap, ArrowRight } from 'lucide-react';

/**
 * UnoGame - Premium Real-Time Multiplayer UNO
 * 
 * RULES:
 * - 100% Backend controlled - NO local game logic
 * - Real-time sync via Socket.IO
 * - Valid moves enforced by server
 * - Special cards, UNO call, penalty system
 * 
 * LAYOUT:
 * - Desktop: Opponent (top) → Board (center) → My Hand (bottom)
 * - Mobile: Opponent (top) → Board (center) → Scrollable Hand (bottom)
 */

// UNO Color definitions
const UNO_COLORS = {
  red: { bg: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', name: 'Red' },
  blue: { bg: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)', name: 'Blue' },
  green: { bg: '#22c55e', glow: 'rgba(34, 197, 94, 0.5)', name: 'Green' },
  yellow: { bg: '#eab308', glow: 'rgba(234, 179, 8, 0.5)', name: 'Yellow' },
  wild: { bg: 'linear-gradient(135deg, #ef4444, #3b82f6, #22c55e, #eab308)', glow: 'rgba(124, 58, 237, 0.5)', name: 'Wild' }
};

// Get card display symbol
const getCardDisplay = (card) => {
  if (!card) return { symbol: '?', label: '' };
  
  const valueMap = {
    'skip': { symbol: '⊘', label: 'Skip' },
    'reverse': { symbol: '⟳', label: 'Reverse' },
    'draw_two': { symbol: '+2', label: 'Draw 2' },
    'wild': { symbol: '★', label: 'Wild' },
    'wild_draw_four': { symbol: '+4', label: 'Wild +4' }
  };
  
  if (valueMap[card.value]) return valueMap[card.value];
  return { symbol: card.value, label: card.value };
};

// === CARD COMPONENT ===
const UnoCard = memo(({ 
  card, 
  isPlayable = false, 
  isBack = false, 
  size = 'normal',
  onClick,
  isAnimating = false
}) => {
  const colorData = UNO_COLORS[card?.color] || UNO_COLORS.wild;
  const display = getCardDisplay(card);
  
  const sizeStyles = {
    tiny: { width: '2rem', height: '2.75rem', fontSize: '0.625rem' },
    small: { width: '2.75rem', height: '3.75rem', fontSize: '0.75rem' },
    normal: { width: '3.5rem', height: '5rem', fontSize: '1rem' },
    large: { width: '5rem', height: '7rem', fontSize: '1.5rem' }
  };
  
  const style = sizeStyles[size];
  
  if (isBack) {
    return (
      <div 
        className="uno-card-back"
        style={{
          width: style.width,
          height: style.height,
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          borderRadius: '0.5rem',
          border: '2px solid rgba(124, 58, 237, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}
      >
        <span style={{ fontSize: '1.25rem', opacity: 0.5 }}>🦝</span>
      </div>
    );
  }
  
  const isWild = card?.color === 'wild';
  const bgStyle = isWild 
    ? { background: colorData.bg }
    : { backgroundColor: colorData.bg };
  
  return (
    <div 
      onClick={isPlayable ? onClick : undefined}
      style={{
        ...bgStyle,
        width: style.width,
        height: style.height,
        borderRadius: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 800,
        fontSize: style.fontSize,
        textShadow: '0 2px 4px rgba(0,0,0,0.4)',
        cursor: isPlayable ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        transform: isPlayable ? 'translateY(0)' : 'none',
        boxShadow: isPlayable 
          ? `0 0 0 3px white, 0 8px 24px ${colorData.glow}` 
          : '0 4px 12px rgba(0,0,0,0.3)',
        flexShrink: 0,
        position: 'relative',
        animation: isAnimating ? 'cardPlayed 0.3s ease-out' : 'none'
      }}
      onMouseEnter={(e) => {
        if (isPlayable) {
          e.currentTarget.style.transform = 'translateY(-12px) scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (isPlayable) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
        }
      }}
      data-testid={card ? `uno-card-${card.id}` : 'uno-card'}
    >
      {/* Top corner */}
      <span style={{ 
        position: 'absolute', 
        top: '0.25rem', 
        left: '0.375rem', 
        fontSize: `calc(${style.fontSize} * 0.6)` 
      }}>
        {display.symbol}
      </span>
      
      {/* Center */}
      <span style={{ fontSize: `calc(${style.fontSize} * 1.5)` }}>
        {display.symbol}
      </span>
      
      {/* Bottom corner */}
      <span style={{ 
        position: 'absolute', 
        bottom: '0.25rem', 
        right: '0.375rem', 
        fontSize: `calc(${style.fontSize} * 0.6)`,
        transform: 'rotate(180deg)'
      }}>
        {display.symbol}
      </span>
    </div>
  );
});
UnoCard.displayName = 'UnoCard';

// === COLOR PICKER MODAL ===
const ColorPicker = memo(({ isOpen, onSelect }) => {
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b, #0f0d1a)',
        border: '1px solid rgba(124, 58, 237, 0.4)',
        borderRadius: '1.5rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ 
          color: 'white', 
          fontSize: '1.25rem', 
          fontWeight: 700, 
          marginBottom: '1.5rem' 
        }}>
          Choose a Color
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '1rem' 
        }}>
          {['red', 'blue', 'green', 'yellow'].map(color => (
            <button
              key={color}
              onClick={() => onSelect(color)}
              style={{
                width: '5rem',
                height: '5rem',
                backgroundColor: UNO_COLORS[color].bg,
                border: 'none',
                borderRadius: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: `0 4px 20px ${UNO_COLORS[color].glow}`
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              data-testid={`uno-color-${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
ColorPicker.displayName = 'ColorPicker';

// === MAIN UNO GAME ===
const UnoGame = memo(({ 
  isOpen, 
  onClose, 
  socket,
  myUserId,
  partnerUsername = 'Opponent',
  sessionId,
  initialGameState = null,
  isMobile = false
}) => {
  // Game state from backend
  const [gameState, setGameState] = useState(initialGameState);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [lastPlayedCard, setLastPlayedCard] = useState(null);
  const [unoCalled, setUnoCalled] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  
  const mountedRef = useRef(true);
  const socketIdRef = useRef(null);
  const notificationTimer = useRef(null);
  
  // Show notification
  const showNotification = useCallback((message, type = 'info', duration = 2000) => {
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
    if (!socket) {
      console.log('[UNO] No socket');
      return;
    }
    
    if (socketIdRef.current === socket.id) {
      return; // Already registered
    }
    socketIdRef.current = socket.id;
    
    console.log('[UNO] Registering socket listeners');
    
    const handleGameStarted = (data) => {
      console.log('[UNO] Game started', data);
      if (!mountedRef.current) return;
      setIsStarting(false);
      setGameState(data.game_state);
      setGameEnded(false);
      setWinner(null);
      setUnoCalled(false);
      showNotification('Game started!', 'success');
    };
    
    const handleCardPlayed = (data) => {
      console.log('[UNO] Card played', data);
      if (!mountedRef.current) return;
      
      setGameState(data.game_state);
      setLastPlayedCard(data.card);
      
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
        showNotification('+4 cards!', 'error');
      }
      
      if (data.uno_penalty) {
        showNotification(`UNO penalty! +${data.penalty_cards} cards`, 'error');
      }
    };
    
    const handleCardDrawn = (data) => {
      console.log('[UNO] Card drawn', data);
      if (!mountedRef.current) return;
      setGameState(data.game_state);
      
      if (data.player_id === myUserId && data.can_play_drawn) {
        showNotification('You can play the drawn card!', 'info');
      }
    };
    
    const handleUnoCalled = (data) => {
      console.log('[UNO] UNO called', data);
      if (!mountedRef.current) return;
      showNotification(`${data.player_username} called UNO!`, 'success');
      if (data.player_id === myUserId) {
        setUnoCalled(true);
      }
    };
    
    const handleGameEnded = (data) => {
      console.log('[UNO] Game ended', data);
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
        showNotification('Opponent left the game', 'info');
      }
    };
    
    const handleError = (data) => {
      console.error('[UNO] Error:', data.message);
      showNotification(data.message || 'Error', 'error');
      setIsStarting(false);
    };
    
    socket.on('uno_game_started', handleGameStarted);
    socket.on('uno_card_played', handleCardPlayed);
    socket.on('uno_card_drawn', handleCardDrawn);
    socket.on('uno_called', handleUnoCalled);
    socket.on('uno_game_ended', handleGameEnded);
    socket.on('uno_error', handleError);
    
    return () => {
      console.log('[UNO] Cleaning up listeners');
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
    if (!socket || isStarting) return;
    setIsStarting(true);
    socket.emit('start_uno_game');
    console.log('[UNO] Emitted: start_uno_game');
  }, [socket, isStarting]);
  
  // Play card
  const handlePlayCard = useCallback((card) => {
    if (!socket || !gameState?.is_my_turn) return;
    
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
    console.log('[UNO] Emitted: uno_play_card', card.id);
  }, [socket, gameState, showNotification]);
  
  // Select color for wild card
  const handleColorSelect = useCallback((color) => {
    if (!socket || !pendingCard) return;
    
    socket.emit('uno_play_card', { 
      card_id: pendingCard.id,
      chosen_color: color
    });
    console.log('[UNO] Emitted: uno_play_card (wild)', pendingCard.id, color);
    
    setShowColorPicker(false);
    setPendingCard(null);
  }, [socket, pendingCard]);
  
  // Draw card
  const handleDrawCard = useCallback(() => {
    if (!socket || !gameState?.is_my_turn) return;
    socket.emit('uno_draw_card');
    console.log('[UNO] Emitted: uno_draw_card');
  }, [socket, gameState]);
  
  // Call UNO
  const handleCallUno = useCallback(() => {
    if (!socket) return;
    socket.emit('uno_call_uno');
    setUnoCalled(true);
    console.log('[UNO] Emitted: uno_call_uno');
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
    setGameState(null);
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
  
  // Current color indicator
  const currentColorData = UNO_COLORS[currentColor] || UNO_COLORS.wild;
  
  return (
    <div 
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, #0c0a18 0%, #130f24 50%, #0a0814 100%)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden'
      }}
      data-testid="uno-game"
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(124, 58, 237, 0.1) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />
      
      {/* === HEADER === */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🦝</span>
          <span style={{
            fontWeight: 700,
            fontSize: '1.125rem',
            background: 'linear-gradient(135deg, #fff, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Raccoon UNO
          </span>
        </div>
        <button 
          onClick={handleClose}
          style={{
            width: '2.25rem',
            height: '2.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '0.625rem',
            color: 'white',
            cursor: 'pointer'
          }}
          data-testid="uno-close"
        >
          <X size={18} />
        </button>
      </div>
      
      {/* === START SCREEN === */}
      {!gameState && !gameEnded && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          position: 'relative',
          zIndex: 5
        }}>
          {/* Floating cards animation */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginBottom: '2rem' 
          }}>
            {['#ef4444', '#3b82f6', '#22c55e', '#eab308'].map((color, i) => (
              <div
                key={color}
                style={{
                  width: '3.5rem',
                  height: '5rem',
                  background: color,
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  color: 'white',
                  fontWeight: 800,
                  boxShadow: `0 8px 24px ${color}66`,
                  transform: `rotate(${(i - 1.5) * 8}deg)`,
                  animation: `cardFloat 2s ease-in-out infinite ${i * 0.15}s`
                }}
              >
                {['7', '★', '⊘', '+2'][i]}
              </div>
            ))}
          </div>
          
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            color: 'white', 
            marginBottom: '0.5rem' 
          }}>
            Raccoon UNO
          </h2>
          <p style={{ 
            color: 'rgba(255,255,255,0.5)', 
            marginBottom: '2rem' 
          }}>
            Play against {partnerUsername}
          </p>
          
          <button
            onClick={startGame}
            disabled={isStarting}
            style={{
              padding: '1rem 3rem',
              background: isStarting 
                ? 'rgba(124, 58, 237, 0.5)' 
                : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
              border: 'none',
              borderRadius: '1rem',
              color: 'white',
              fontSize: '1.125rem',
              fontWeight: 700,
              cursor: isStarting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 24px rgba(124, 58, 237, 0.5)',
              transition: 'all 0.2s ease'
            }}
            data-testid="start-uno-btn"
          >
            {isStarting ? 'Starting...' : 'Start Game'}
          </button>
        </div>
      )}
      
      {/* === END SCREEN === */}
      {gameEnded && winner && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          position: 'relative',
          zIndex: 5
        }}>
          <div style={{ 
            fontSize: '5rem', 
            marginBottom: '1rem',
            animation: 'bounce 0.6s ease-out'
          }}>
            {winner.isMe ? '🎉' : '😔'}
          </div>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            color: 'white', 
            marginBottom: '2rem' 
          }}>
            {winner.isMe ? 'You Win!' : `${winner.username} Wins!`}
          </h2>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handlePlayAgain}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1.5rem',
                background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                border: 'none',
                borderRadius: '0.875rem',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={18} /> Play Again
            </button>
            <button
              onClick={handleClose}
              style={{
                padding: '0.875rem 1.5rem',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '0.875rem',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Exit
            </button>
          </div>
        </div>
      )}
      
      {/* === ACTIVE GAME BOARD === */}
      {gameState && !gameEnded && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '0.5rem' : '1rem',
          position: 'relative',
          zIndex: 5,
          minHeight: 0
        }}>
          
          {/* OPPONENT AREA (TOP) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            {/* Opponent info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.375rem 1rem',
              background: !isMyTurn ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
              border: !isMyTurn ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '2rem'
            }}>
              <div style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                background: !isMyTurn ? '#22c55e' : 'rgba(255,255,255,0.3)',
                boxShadow: !isMyTurn ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none'
              }} />
              <span style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem' }}>
                {opponentUsername}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                {opponentCardCount} cards
              </span>
            </div>
            
            {/* Opponent hand (backs) */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: isMobile ? '-0.5rem' : '-0.25rem'
            }}>
              {Array(Math.min(opponentCardCount, isMobile ? 8 : 12)).fill(0).map((_, i) => (
                <UnoCard key={i} card={{}} isBack={true} size={isMobile ? 'tiny' : 'small'} />
              ))}
              {opponentCardCount > (isMobile ? 8 : 12) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 0.5rem',
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  +{opponentCardCount - (isMobile ? 8 : 12)}
                </div>
              )}
            </div>
          </div>
          
          {/* CENTER PLAY AREA */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            position: 'relative',
            minHeight: isMobile ? '10rem' : '12rem'
          }}>
            {/* Current color indicator */}
            <div style={{
              position: 'absolute',
              top: isMobile ? '0.25rem' : '0.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '0.25rem 0.875rem',
              background: currentColor === 'wild' 
                ? 'linear-gradient(135deg, #ef4444, #3b82f6, #22c55e, #eab308)'
                : currentColorData.bg,
              borderRadius: '2rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'white',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)'
            }}>
              {currentColorData.name}
            </div>
            
            {/* Discard and Draw piles */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '1.5rem' : '2.5rem'
            }}>
              {/* Discard pile */}
              <div style={{ position: 'relative' }}>
                {topCard && (
                  <UnoCard 
                    card={topCard} 
                    size={isMobile ? 'normal' : 'large'} 
                    isAnimating={lastPlayedCard?.id === topCard.id}
                  />
                )}
              </div>
              
              {/* Arrow */}
              <ArrowRight size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
              
              {/* Draw pile */}
              <button
                onClick={handleDrawCard}
                disabled={!isMyTurn}
                style={{
                  position: 'relative',
                  background: 'none',
                  border: 'none',
                  cursor: isMyTurn ? 'pointer' : 'not-allowed',
                  opacity: isMyTurn && playableIds.length === 0 ? 1 : 0.7,
                  transition: 'all 0.2s ease',
                  animation: isMyTurn && playableIds.length === 0 ? 'pulse 1.5s infinite' : 'none'
                }}
                data-testid="uno-draw-pile"
              >
                <UnoCard card={{}} isBack={true} size={isMobile ? 'normal' : 'large'} />
                <span style={{
                  position: 'absolute',
                  bottom: '-0.5rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '0.125rem 0.5rem',
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '1rem',
                  fontSize: '0.625rem',
                  color: 'white'
                }}>
                  {drawPileCount}
                </span>
              </button>
            </div>
            
            {/* Turn indicator */}
            <div style={{
              padding: '0.5rem 1.25rem',
              background: isMyTurn 
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.15))'
                : 'rgba(0,0,0,0.4)',
              border: isMyTurn 
                ? '1px solid rgba(34, 197, 94, 0.4)' 
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '2rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: isMyTurn ? '#22c55e' : 'rgba(255,255,255,0.5)'
            }}>
              {isMyTurn ? '🎯 Your turn!' : `⏳ ${opponentUsername}'s turn`}
            </div>
            
            {/* UNO Call Button */}
            {(canCallUno || mustCallUno) && (
              <button
                onClick={handleCallUno}
                disabled={!isMyTurn}
                style={{
                  position: 'absolute',
                  right: isMobile ? '0.5rem' : '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: isMobile ? '0.625rem 1rem' : '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '1rem',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: isMobile ? '0.875rem' : '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.5)',
                  animation: mustCallUno ? 'urgentPulse 0.5s infinite' : 'none'
                }}
                data-testid="uno-call-btn"
              >
                UNO!
                {mustCallUno && <Zap size={16} />}
              </button>
            )}
          </div>
          
          {/* MY HAND (BOTTOM) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(255,255,255,0.05)'
          }}>
            {/* My info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.25rem 0.875rem',
              background: isMyTurn ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
              borderRadius: '2rem'
            }}>
              <div style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                background: isMyTurn ? '#22c55e' : 'rgba(255,255,255,0.3)'
              }} />
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                Your hand ({myHand.length})
              </span>
            </div>
            
            {/* My cards - horizontal scroll on mobile */}
            <div style={{
              display: 'flex',
              justifyContent: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? '0.25rem' : '0.375rem',
              overflowX: 'auto',
              maxWidth: '100%',
              padding: '0.5rem',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
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
          </div>
        </div>
      )}
      
      {/* Color Picker Modal */}
      <ColorPicker
        isOpen={showColorPicker}
        onSelect={handleColorSelect}
      />
      
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'absolute',
          top: '4.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.625rem 1.25rem',
          borderRadius: '2rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          zIndex: 100,
          animation: 'slideDown 0.3s ease-out',
          background: {
            info: 'rgba(59, 130, 246, 0.9)',
            success: 'rgba(34, 197, 94, 0.9)',
            warning: 'rgba(234, 179, 8, 0.9)',
            error: 'rgba(239, 68, 68, 0.9)',
            action: 'linear-gradient(135deg, #7c3aed, #5b21b6)'
          }[notification.type] || 'rgba(59, 130, 246, 0.9)',
          color: notification.type === 'warning' ? '#1f2937' : 'white'
        }}>
          {notification.message}
        </div>
      )}
      
      {/* CSS Animations */}
      <style>{`
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0) rotate(var(--rotate, 0deg)); }
          50% { transform: translateY(-8px) rotate(var(--rotate, 0deg)); }
        }
        @keyframes cardPlayed {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes bounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes urgentPulse {
          0%, 100% { transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-50%) scale(1.08); }
        }
      `}</style>
    </div>
  );
});

UnoGame.displayName = 'UnoGame';

export default UnoGame;
