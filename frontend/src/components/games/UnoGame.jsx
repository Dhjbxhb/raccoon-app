import React, { useState, useEffect, useCallback, useRef, memo } from 'react';

/**
 * UnoGame - Premium Real-Time Multiplayer UNO
 * Exact match to provided design reference
 */

// UNO Card colors
const CARD_COLORS = {
  red: '#ef4444',
  blue: '#3b82f6', 
  green: '#22c55e',
  yellow: '#eab308',
  wild: 'linear-gradient(135deg, #ef4444 25%, #3b82f6 25%, #3b82f6 50%, #22c55e 50%, #22c55e 75%, #eab308 75%)'
};

// Get card display
const getCardSymbol = (card) => {
  if (!card) return { value: '?', isSpecial: false };
  const specialMap = {
    'skip': { value: '⊘', isSpecial: true },
    'reverse': { value: '↻', isSpecial: true },
    'draw_two': { value: '+2', isSpecial: true },
    'wild': { value: '', isSpecial: true, isWild: true },
    'wild_draw_four': { value: '+4', isSpecial: true, isWild: true }
  };
  return specialMap[card.value] || { value: card.value, isSpecial: false };
};

// === UNO CARD COMPONENT ===
const UnoCard = memo(({ 
  card, 
  isPlayable = false,
  isBack = false,
  size = 'medium',
  rotation = 0,
  offsetY = 0,
  onClick,
  isCenter = false,
  animate = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const sizes = {
    small: { w: 50, h: 70, font: 20, corner: 10 },
    medium: { w: 70, h: 100, font: 28, corner: 12 },
    large: { w: 90, h: 130, font: 36, corner: 14 },
    center: { w: 100, h: 140, font: 44, corner: 16 }
  };
  
  const s = sizes[size];
  const symbol = getCardSymbol(card);
  const isWild = card?.type === 'wild' || symbol.isWild;
  
  // Card back design
  if (isBack) {
    return (
      <div
        style={{
          width: s.w,
          height: s.h,
          borderRadius: s.corner,
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          border: '3px solid #0f0f23',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          transform: `rotate(${rotation}deg) translateY(${offsetY}px)`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* UNO back design */}
        <div style={{
          width: '80%',
          height: '60%',
          background: '#ef4444',
          borderRadius: s.corner - 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #dc2626',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)'
        }}>
          <span style={{
            color: '#fef08a',
            fontWeight: 900,
            fontSize: s.font * 0.6,
            fontStyle: 'italic',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            letterSpacing: '-1px'
          }}>
            UNO
          </span>
        </div>
        {/* Diagonal stripes */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 10px)',
          pointerEvents: 'none'
        }} />
      </div>
    );
  }
  
  const bgColor = isWild ? CARD_COLORS.wild : CARD_COLORS[card?.color] || '#888';
  const isGradient = isWild;
  
  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: s.w,
        height: s.h,
        borderRadius: s.corner,
        background: isGradient ? bgColor : bgColor,
        border: `3px solid ${isPlayable ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        cursor: isPlayable ? 'pointer' : 'default',
        boxShadow: isPlayable 
          ? `0 0 20px rgba(255,255,255,0.5), 0 8px 25px rgba(0,0,0,0.4)`
          : '0 4px 15px rgba(0,0,0,0.4)',
        transform: `rotate(${rotation}deg) translateY(${isHovered && isPlayable ? offsetY - 20 : offsetY}px) ${isHovered && isPlayable ? 'scale(1.1)' : 'scale(1)'}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        animation: isCenter && animate ? 'cardFloat 3s ease-in-out infinite' : 'none',
        zIndex: isHovered ? 100 : 'auto'
      }}
      data-testid={card ? `uno-card-${card.id}` : 'uno-card'}
    >
      {/* Center oval */}
      <div style={{
        width: '75%',
        height: '55%',
        background: isWild ? 'rgba(255,255,255,0.95)' : '#fef9c3',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'rotate(-20deg)',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)'
      }}>
        {isWild ? (
          <div style={{
            width: '80%',
            height: '80%',
            borderRadius: '50%',
            background: 'conic-gradient(#ef4444 0deg 90deg, #3b82f6 90deg 180deg, #22c55e 180deg 270deg, #eab308 270deg 360deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {symbol.value && (
              <span style={{
                color: 'white',
                fontWeight: 900,
                fontSize: s.font * 0.7,
                textShadow: '1px 1px 3px rgba(0,0,0,0.5)'
              }}>
                {symbol.value}
              </span>
            )}
          </div>
        ) : (
          <span style={{
            color: isGradient ? '#1a1a2e' : CARD_COLORS[card?.color] || '#333',
            fontWeight: 900,
            fontSize: s.font,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {symbol.value}
          </span>
        )}
      </div>
      
      {/* Corner numbers */}
      <span style={{
        position: 'absolute',
        top: 6,
        left: 8,
        color: 'white',
        fontWeight: 800,
        fontSize: s.font * 0.5,
        textShadow: '1px 1px 2px rgba(0,0,0,0.4)'
      }}>
        {symbol.value}
      </span>
      <span style={{
        position: 'absolute',
        bottom: 6,
        right: 8,
        color: 'white',
        fontWeight: 800,
        fontSize: s.font * 0.5,
        textShadow: '1px 1px 2px rgba(0,0,0,0.4)',
        transform: 'rotate(180deg)'
      }}>
        {symbol.value}
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
      zIndex: 200
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1e1b4b, #0f0d1a)',
        border: '2px solid rgba(139, 92, 246, 0.4)',
        borderRadius: 24,
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Choose Color
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {['red', 'blue', 'green', 'yellow'].map(color => (
            <button
              key={color}
              onClick={() => onSelect(color)}
              style={{
                width: 80,
                height: 80,
                backgroundColor: CARD_COLORS[color],
                border: '3px solid rgba(255,255,255,0.3)',
                borderRadius: 16,
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                boxShadow: `0 4px 20px ${CARD_COLORS[color]}66`
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              data-testid={`color-${color}`}
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
  onEndSession,
  socket,
  myUserId,
  partnerUsername = 'Opponent',
  myUsername = 'You',
  sessionId,
  initialGameState = null,
  localStream,
  remoteStream
}) => {
  const [gameState, setGameState] = useState(initialGameState);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [cardAnimating, setCardAnimating] = useState(false);
  const [showUnoFlash, setShowUnoFlash] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  
  const mountedRef = useRef(true);
  const notificationTimer = useRef(null);
  
  const showNotification = useCallback((message, duration = 2500) => {
    setNotification(message);
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => {
      if (mountedRef.current) setNotification(null);
    }, duration);
  }, []);
  
  useEffect(() => {
    mountedRef.current = true;
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => {
      mountedRef.current = false;
      if (notificationTimer.current) clearTimeout(notificationTimer.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Socket handlers
  useEffect(() => {
    if (!socket) return;
    
    const handleGameStarted = (data) => {
      if (!mountedRef.current) return;
      setIsStarting(false);
      setGameState(data.game_state);
      setGameEnded(false);
      setWinner(null);
    };
    
    const handleCardPlayed = (data) => {
      if (!mountedRef.current) return;
      setCardAnimating(true);
      setTimeout(() => setCardAnimating(false), 400);
      setGameState(data.game_state);
      
      if (data.effect === 'skip') showNotification('Turn Skipped');
      else if (data.effect === 'reverse') showNotification('Reversed');
      else if (data.effect === 'draw_two') showNotification('+2 Cards');
      else if (data.effect === 'wild_draw_four') showNotification('+4 Cards');
    };
    
    const handleCardDrawn = (data) => {
      if (!mountedRef.current) return;
      setGameState(data.game_state);
    };
    
    const handleGameEnded = (data) => {
      if (!mountedRef.current) return;
      setGameEnded(true);
      setWinner({
        id: data.winner_id,
        username: data.winner_username,
        isMe: data.winner_id === myUserId
      });
    };
    
    socket.on('uno_game_started', handleGameStarted);
    socket.on('uno_card_played', handleCardPlayed);
    socket.on('uno_card_drawn', handleCardDrawn);
    socket.on('uno_game_ended', handleGameEnded);
    
    return () => {
      socket.off('uno_game_started', handleGameStarted);
      socket.off('uno_card_played', handleCardPlayed);
      socket.off('uno_card_drawn', handleCardDrawn);
      socket.off('uno_game_ended', handleGameEnded);
    };
  }, [socket, myUserId, showNotification]);
  
  useEffect(() => {
    if (initialGameState) {
      setGameState(initialGameState);
      setGameEnded(initialGameState.status === 'finished');
      if (initialGameState.status !== 'finished') {
        setWinner(null);
      }
    } else {
      setGameState(null);
      setGameEnded(false);
      setWinner(null);
    }
  }, [initialGameState]);
  
  const startGame = useCallback(() => {
    if (!socket || isStarting) return;
    setIsStarting(true);
    socket.emit('start_uno_game');
  }, [socket, isStarting]);
  
  const handlePlayCard = useCallback((card) => {
    if (!socket || !gameState?.is_my_turn) return;
    if (!gameState.playable_card_ids.includes(card.id)) return;
    
    if (card.type === 'wild') {
      setPendingCard(card);
      setShowColorPicker(true);
      return;
    }
    
    socket.emit('uno_play_card', { card_id: card.id });
  }, [socket, gameState]);
  
  const handleColorSelect = useCallback((color) => {
    if (!socket || !pendingCard) return;
    socket.emit('uno_play_card', { card_id: pendingCard.id, chosen_color: color });
    setShowColorPicker(false);
    setPendingCard(null);
  }, [socket, pendingCard]);
  
  const handleDrawCard = useCallback(() => {
    if (!socket || !gameState?.is_my_turn) return;
    socket.emit('uno_draw_card');
  }, [socket, gameState]);
  
  const handleCallUno = useCallback(() => {
    if (!socket) return;
    socket.emit('uno_call_uno');
    showNotification('UNO!');
    setShowUnoFlash(true);
    window.setTimeout(() => {
      if (mountedRef.current) setShowUnoFlash(false);
    }, 1500);
  }, [socket, showNotification]);
  
  const handleClose = useCallback(() => {
    if (socket && !gameEnded) socket.emit('end_uno_game');
    onClose?.();
  }, [socket, gameEnded, onClose]);
  
  const handlePlayAgain = useCallback(() => {
    setGameEnded(false);
    setWinner(null);
    setGameState(null);
    startGame();
  }, [startGame]);

  // Derived values (must be BEFORE any hooks that reference them)
  const isMyTurn = gameState?.is_my_turn || false;
  const myHand = gameState?.my_hand || [];
  const playableIds = gameState?.playable_card_ids || [];
  const topCard = gameState?.top_card;
  const opponentCardCount = gameState?.opponent_hand_count || 0;
  const canCallUno = gameState?.can_call_uno;
  const mustCallUno = gameState?.must_call_uno;

  // UNO alert when opponent reaches 1 card
  const prevOpponentCount = useRef(opponentCardCount);
  useEffect(() => {
    if (opponentCardCount === 1 && prevOpponentCount.current !== 1) {
      showNotification(`${partnerUsername} has UNO!`);
      setShowUnoFlash(true);
      const t = setTimeout(() => {
        if (mountedRef.current) setShowUnoFlash(false);
      }, 1500);
      return () => clearTimeout(t);
    }
    prevOpponentCount.current = opponentCardCount;
  }, [opponentCardCount, partnerUsername, showNotification]);
  
  if (!isOpen) return null;

  const hasSessionContext = Boolean(sessionId && myUserId && partnerUsername);
  if (!hasSessionContext) return null;
  
  // Calculate card fan rotation for player hand
  const getCardTransform = (index, total) => {
    const maxRotation = 25;
    const step = total > 1 ? maxRotation / (total - 1) : 0;
    const rotation = -maxRotation / 2 + step * index;
    const offsetY = Math.abs(rotation) * 0.8;
    return { rotation, offsetY };
  };
  
  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        overflow: 'hidden'
      }}
      data-testid="uno-game"
    >
      {/* === START SCREEN === */}
      {!gameState && !gameEnded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1e1b4b, #0f0d1a)',
            border: '2px solid rgba(139, 92, 246, 0.4)',
            borderRadius: 24,
            padding: '3rem',
            textAlign: 'center'
          }}>
            <h2 style={{
              color: 'white',
              fontSize: '2rem',
              fontWeight: 800,
              marginBottom: '1rem'
            }}>
              UNO
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '2rem'
            }}>
              Play against {partnerUsername}
            </p>
            <button
              onClick={startGame}
              disabled={isStarting}
              style={{
                padding: '1rem 3rem',
                background: 'linear-gradient(145deg, #8b5cf6, #6d28d9)',
                border: 'none',
                borderRadius: 12,
                color: 'white',
                fontSize: '1.125rem',
                fontWeight: 700,
                cursor: isStarting ? 'wait' : 'pointer',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.5)'
              }}
              data-testid="start-game-btn"
            >
              {isStarting ? 'Starting...' : 'Start Game'}
            </button>
          </div>
        </div>
      )}
      
      {/* === END SCREEN === */}
      {gameEnded && winner && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1e1b4b, #0f0d1a)',
            border: '2px solid rgba(139, 92, 246, 0.4)',
            borderRadius: 24,
            padding: '3rem',
            textAlign: 'center'
          }}>
            <h2 style={{
              color: 'white',
              fontSize: '2rem',
              fontWeight: 800,
              marginBottom: '1rem'
            }}>
              {winner.isMe ? 'Winner: You' : `Winner: ${winner.username}`}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={handlePlayAgain}
                style={{
                  padding: '0.875rem 2rem',
                  background: 'linear-gradient(145deg, #8b5cf6, #6d28d9)',
                  border: 'none',
                  borderRadius: 12,
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Play Again
              </button>
              <button
                onClick={handleClose}
                style={{
                  padding: '0.875rem 2rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* === ACTIVE GAME === */}
      {gameState && !gameEnded && (
        <>
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: isDesktop ? '1.5rem 2rem 1.25rem' : '1rem 0.75rem 0.75rem',
            gap: isDesktop ? 20 : 14
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: isDesktop ? 28 : 16,
              flexShrink: 0
            }}>
              {[
                {
                  key: 'opponent',
                  stream: remoteStream,
                  username: partnerUsername,
                  infoLabel: `Cards: ${opponentCardCount}`,
                  active: !isMyTurn,
                  mirrored: false,
                },
                {
                  key: 'me',
                  stream: localStream,
                  username: myUsername,
                  infoLabel: `Cards: ${myHand.length}`,
                  active: isMyTurn,
                  mirrored: true,
                }
              ].map((camera) => (
                <div key={camera.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: isDesktop ? 320 : '46%' }}>
                  <div style={{
                    width: '100%',
                    height: isDesktop ? 240 : 170,
                    borderRadius: 20,
                    overflow: 'hidden',
                    border: '2px solid rgba(201, 175, 255, 0.35)',
                    boxShadow: '0 0 28px rgba(168, 85, 247, 0.28)',
                    background: '#1a1a2e',
                    position: 'relative'
                  }}>
                    {camera.stream ? (
                      <video
                        autoPlay
                        playsInline
                        muted={camera.key === 'me'}
                        ref={el => {
                          if (el && el.srcObject !== camera.stream) {
                            el.srcObject = camera.stream;
                            el.play().catch(() => {});
                          }
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: camera.mirrored ? 'scaleX(-1)' : 'none' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(145deg, #1e1b4b, #0f0d1a)'
                      }}>
                        <div style={{ width: 32, height: 32, border: '2px solid rgba(139, 92, 246, 0.5)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      </div>
                    )}

                    <div style={{
                      position: 'absolute',
                      left: 12,
                      bottom: 12,
                      padding: isDesktop ? '0.5rem 1.25rem' : '0.45rem 1rem',
                      borderRadius: 999,
                      background: 'rgba(37, 16, 63, 0.96)',
                      color: 'white',
                      fontSize: isDesktop ? 20 : 16,
                      fontWeight: 700,
                      lineHeight: 1
                    }}>
                      {camera.username}
                    </div>

                    {/* Card count badge */}
                    <div style={{
                      position: 'absolute',
                      right: 12,
                      bottom: 12,
                      padding: isDesktop ? '0.45rem 1rem' : '0.35rem 0.75rem',
                      borderRadius: 999,
                      background: camera.active 
                        ? 'linear-gradient(145deg, #8b5cf6, #6d28d9)' 
                        : 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      fontSize: isDesktop ? 15 : 13,
                      fontWeight: 700,
                      lineHeight: 1,
                      border: '1px solid rgba(139, 92, 246, 0.4)'
                    }}
                    data-testid={`uno-card-count-${camera.key}`}
                    >
                      {camera.infoLabel}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: isDesktop ? 18 : 14, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? 28 : 18 }}>
                <button
                  onClick={handleDrawCard}
                  disabled={!isMyTurn}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: isMyTurn ? 'pointer' : 'not-allowed',
                    opacity: isMyTurn ? 1 : 0.55,
                    transform: isMyTurn ? 'scale(1)' : 'scale(0.98)',
                    transition: 'transform 0.2s ease, opacity 0.2s ease'
                  }}
                  data-testid="draw-card-btn"
                >
                  <div style={{ position: 'relative' }}>
                    <UnoCard isBack size={isDesktop ? 'medium' : 'small'} />
                    <div style={{
                      position: 'absolute',
                      bottom: -10,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 999,
                      background: 'rgba(0,0,0,0.65)',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 700
                    }}>
                      DRAW
                    </div>
                  </div>
                </button>

                {topCard && (
                  <UnoCard
                    card={topCard}
                    size={isDesktop ? 'center' : 'center'}
                    isCenter={true}
                    animate={cardAnimating}
                  />
                )}
              </div>

              <div style={{
                minHeight: isDesktop ? 108 : 92,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                position: 'relative'
              }} data-testid="uno-turn-indicator">
                <div style={{
                  fontSize: isDesktop ? 52 : 40,
                  color: '#fbbf24',
                  textShadow: '0 0 22px rgba(251, 191, 36, 0.45)',
                  transform: isMyTurn ? 'translateY(24px) rotate(180deg)' : 'translateY(-24px) rotate(0deg)',
                  transition: 'transform 0.35s ease, opacity 0.35s ease',
                  opacity: 1,
                  lineHeight: 1
                }}>
                  ↓
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isDesktop ? 14 : 10 }}>
              {(canCallUno || mustCallUno) && (
                <button
                  onClick={handleCallUno}
                  style={{
                    padding: isDesktop ? '0.85rem 1.9rem' : '0.7rem 1.35rem',
                    background: 'linear-gradient(180deg, #2b2a16, #14140b)',
                    border: '2px solid rgba(254, 240, 138, 0.35)',
                    borderRadius: 18,
                    color: '#fde047',
                    fontSize: isDesktop ? '1.5rem' : '1.2rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 0 30px rgba(251, 191, 36, 0.22), 0 4px 15px rgba(0,0,0,0.3)',
                    animation: mustCallUno ? 'unoPulse 0.5s ease-in-out infinite' : 'unoAppear 0.3s ease-out',
                    zIndex: 15
                  }}
                  data-testid="uno-call-btn"
                >
                  UNO!
                </button>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                width: '100%',
                overflowX: 'auto',
                padding: isDesktop ? '0.5rem 1rem 0.25rem' : '0.25rem 0.5rem 0',
                scrollbarWidth: 'none'
              }}>
                {myHand.map((card, i) => {
                  const { rotation, offsetY } = getCardTransform(i, myHand.length);
                  const isPlayable = playableIds.includes(card.id) && isMyTurn;
                  return (
                    <div
                      key={card.id}
                      style={{
                        marginLeft: i === 0 ? 0 : (isDesktop ? -34 : -26),
                        zIndex: i
                      }}
                    >
                      <UnoCard
                        card={card}
                        size={isDesktop ? 'center' : 'large'}
                        rotation={rotation}
                        offsetY={offsetY}
                        isPlayable={isPlayable}
                        onClick={() => handlePlayCard(card)}
                      />
                    </div>
                  );
                })}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                width: '100%',
                maxWidth: isDesktop ? 560 : 380
              }}>
                <button
                  onClick={handleDrawCard}
                  disabled={!isMyTurn}
                  style={{
                    flex: 1,
                    padding: isDesktop ? '0.9rem 1.2rem' : '0.8rem 1rem',
                    background: 'rgba(51, 28, 79, 0.95)',
                    border: '2px solid rgba(173, 120, 255, 0.28)',
                    borderRadius: 20,
                    color: 'white',
                    fontSize: isDesktop ? '1.1rem' : '1rem',
                    fontWeight: 600,
                    cursor: isMyTurn ? 'pointer' : 'not-allowed',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.22)'
                  }}
                  data-testid="draw-card-btn"
                >
                  Draw Card
                </button>

                <button
                  onClick={onEndSession || handleClose}
                  style={{
                    flex: 1,
                    padding: isDesktop ? '0.9rem 1.2rem' : '0.8rem 1rem',
                    background: 'rgba(51, 28, 79, 0.95)',
                    border: '2px solid rgba(173, 120, 255, 0.28)',
                    borderRadius: 20,
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: isDesktop ? '1.1rem' : '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.22)'
                  }}
                  data-testid="end-game-btn"
                >
                  End Game
                </button>
              </div>
            </div>
          </div>

          {showUnoFlash && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 55
            }} data-testid="uno-call-flash">
              <div style={{
                color: '#fde047',
                fontSize: isDesktop ? 88 : 64,
                fontWeight: 900,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textShadow: '0 0 32px rgba(253, 224, 71, 0.75), 0 0 72px rgba(245, 158, 11, 0.45)',
                animation: 'unoFlash 1.5s ease-out forwards'
              }}>
                UNO
              </div>
            </div>
          )}
          
          {/* Notification Toast */}
          {notification && (
            <div style={{
              position: 'absolute',
              top: 160,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '0.75rem 2rem',
              background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.9), rgba(109, 40, 217, 0.9))',
              borderRadius: 30,
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.5)',
              zIndex: 50,
              animation: 'notificationSlide 0.3s ease-out'
            }}>
              {notification}
            </div>
          )}
        </>
      )}
      
      {/* Color Picker */}
      <ColorPicker isOpen={showColorPicker} onSelect={handleColorSelect} />
      
      {/* CSS Animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes nebulaDrift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(2%, 2%) rotate(2deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ringRotate {
          from { transform: rotateX(60deg) rotateZ(0deg); }
          to { transform: rotateX(60deg) rotateZ(360deg); }
        }
        @keyframes unoPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(251, 191, 36, 0.6); }
          50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(251, 191, 36, 0.8); }
        }
        @keyframes unoAppear {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes unoFlash {
          0% { transform: scale(0.5); opacity: 0; }
          20% { transform: scale(1.08); opacity: 1; }
          65% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.92); opacity: 0; }
        }
        @keyframes notificationSlide {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
});

UnoGame.displayName = 'UnoGame';

export default UnoGame;
