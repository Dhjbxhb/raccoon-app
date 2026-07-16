import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Pen, Eraser, Undo, Trash2, SkipForward, ArrowRight, X, Send, Mic, Crown } from 'lucide-react';

/**
 * DrawGame - Premium Real-Time Multiplayer Draw & Guess Game
 * Exact match to provided design reference
 * 
 * Features:
 * - Real-time drawing sync via WebSocket
 * - Adaptive camera layouts (2/3/4 players)
 * - 30 second rounds with timer
 * - Voice and text guessing
 * - Smooth, lag-free drawing
 */

// Color palette
const COLORS = [
  '#000000', // Black
  '#ef4444', // Red
  '#f59e0b', // Orange/Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#06b6d4', // Teal
  '#8b5cf6', // Purple
  '#ffffff', // White
];

// Brush sizes
const BRUSH_SIZES = [4, 8, 12, 16, 20];

// === DRAWING CANVAS COMPONENT ===
const DrawingCanvas = memo(({ 
  isDrawer, 
  strokes, 
  onStroke, 
  onUndo, 
  onClear,
  currentColor,
  brushSize,
  tool
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const lastPointRef = useRef(null);
  const rafRef = useRef(null);
  
  // PERFORMANCE: Use requestAnimationFrame for smooth redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      const ctx = canvas.getContext('2d', { alpha: false });  // Disable alpha for speed
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw all strokes
      strokes.forEach(stroke => {
        drawStroke(ctx, stroke);
      });
      
      // Draw current stroke if any
      if (currentStroke) {
        drawStroke(ctx, currentStroke);
      }
    });
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [strokes, currentStroke]);
  
  const drawStroke = (ctx, stroke) => {
    if (!stroke.points || stroke.points.length < 2) return;
    
    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
    }
    ctx.stroke();
  };
  
  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return [
      (clientX - rect.left) * scaleX,
      (clientY - rect.top) * scaleY
    ];
  };
  
  const startDrawing = (e) => {
    if (!isDrawer) return;
    e.preventDefault();
    
    const point = getCanvasPoint(e);
    const newStroke = {
      points: [point],
      color: currentColor,
      width: brushSize,
      tool: tool
    };
    setCurrentStroke(newStroke);
    setIsDrawing(true);
    lastPointRef.current = point;
  };
  
  const draw = (e) => {
    if (!isDrawing || !isDrawer || !currentStroke) return;
    e.preventDefault();
    
    const point = getCanvasPoint(e);
    
    // Smooth drawing - only add point if moved enough
    const lastPoint = lastPointRef.current;
    const distance = Math.sqrt(
      Math.pow(point[0] - lastPoint[0], 2) + 
      Math.pow(point[1] - lastPoint[1], 2)
    );
    
    if (distance > 2) {
      setCurrentStroke(prev => ({
        ...prev,
        points: [...prev.points, point]
      }));
      lastPointRef.current = point;
    }
  };
  
  const endDrawing = () => {
    if (!isDrawing || !currentStroke) return;
    
    if (currentStroke.points.length >= 2) {
      onStroke(currentStroke);
    }
    setCurrentStroke(null);
    setIsDrawing(false);
    lastPointRef.current = null;
  };
  
  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full bg-white rounded-lg"
        style={{ 
          touchAction: 'none',
          cursor: isDrawer ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default'
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
    </div>
  );
});

// === TOOLS PANEL ===
const ToolsPanel = memo(({ 
  isDrawer,
  currentColor, 
  setCurrentColor, 
  brushSize, 
  setBrushSize,
  tool,
  setTool,
  onUndo,
  onClear
}) => {
  if (!isDrawer) return null;
  
  return (
    <div className="flex flex-col gap-3 p-3 bg-[#1a1a2e]/80 rounded-xl border border-purple-500/20">
      <div className="text-sm font-semibold text-white/80">Tools</div>
      
      {/* Tool buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setTool('pen')}
          className={`p-2 rounded-lg transition-all ${
            tool === 'pen' 
              ? 'bg-purple-600 text-white' 
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
          data-testid="draw-tool-pen"
        >
          <Pen size={20} />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`p-2 rounded-lg transition-all ${
            tool === 'eraser' 
              ? 'bg-purple-600 text-white' 
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
          data-testid="draw-tool-eraser"
        >
          <Eraser size={20} />
        </button>
      </div>
      
      {/* Color palette */}
      <div className="grid grid-cols-4 gap-2">
        {COLORS.map(color => (
          <button
            key={color}
            onClick={() => setCurrentColor(color)}
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
              currentColor === color ? 'border-purple-400 scale-110' : 'border-white/20'
            }`}
            style={{ backgroundColor: color }}
            data-testid={`draw-color-${color}`}
          />
        ))}
      </div>
      
      {/* Brush size */}
      <div className="flex flex-col gap-2">
        <input
          type="range"
          min="4"
          max="20"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-full accent-purple-500"
          data-testid="draw-brush-size"
        />
        <div className="flex justify-center">
          <div 
            className="rounded-full bg-white"
            style={{ width: brushSize, height: brushSize }}
          />
        </div>
      </div>
      
      {/* Undo / Clear */}
      <div className="flex gap-2">
        <button
          onClick={onUndo}
          className="flex-1 p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
          data-testid="draw-undo-btn"
        >
          <Undo size={18} className="mx-auto" />
        </button>
        <button
          onClick={onClear}
          className="flex-1 p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
          data-testid="draw-clear-btn"
        >
          <Trash2 size={18} className="mx-auto" />
        </button>
      </div>
    </div>
  );
});

// === CHAT PANEL ===
const ChatPanel = memo(({ 
  messages, 
  onSendMessage,
  isDrawer,
  hasGuessed
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isDrawer && !hasGuessed) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-[#1a1a2e]/80 rounded-xl border border-purple-500/20 overflow-hidden">
      <div className="p-3 border-b border-purple-500/20">
        <span className="text-sm font-semibold text-white/80">Chat</span>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, idx) => (
          <div key={idx} className={`${msg.isCorrect ? 'text-center' : ''}`}>
            {msg.isCorrect ? (
              <div className="text-purple-400 text-sm font-medium">
                {msg.username} guessed it! +{msg.points} pts
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
                <div>
                  <span className="text-white/70 text-xs font-medium">{msg.username}</span>
                  <p className="text-white/90 text-sm">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-purple-500/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isDrawer ? "You're drawing..." : hasGuessed ? "Waiting for others..." : "Type your guess..."}
            disabled={isDrawer || hasGuessed}
            className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/50 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
            data-testid="draw-guess-input"
          />
          <button
            type="submit"
            disabled={isDrawer || hasGuessed || !inputValue.trim()}
            className="p-2 rounded-lg bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500 transition-colors"
            data-testid="draw-send-guess-btn"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
});

// === PLAYER VIDEO GRID ===
const PlayerVideoGrid = memo(({ 
  players, 
  localStream, 
  remoteStream,
  currentDrawerId 
}) => {
  const playerCount = players.length;
  
  // Grid layout classes based on player count
  const getGridClasses = () => {
    if (playerCount === 2) return 'grid-cols-2';
    if (playerCount === 3) return 'grid-cols-3';
    return 'grid-cols-4';
  };
  
  return (
    <div className={`grid ${getGridClasses()} gap-3 w-full`}>
      {players.map((player, idx) => (
        <div 
          key={player.user_id} 
          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
            player.user_id === currentDrawerId 
              ? 'border-purple-500 shadow-lg shadow-purple-500/30' 
              : 'border-purple-500/30'
          }`}
          style={{ aspectRatio: '4/3' }}
        >
          {/* Video placeholder or actual video */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
            {idx === 0 && localStream ? (
              <video
                autoPlay
                muted
                playsInline
                ref={el => { if (el) el.srcObject = localStream; }}
                className="w-full h-full object-cover"
              />
            ) : idx === 1 && remoteStream ? (
              <video
                autoPlay
                playsInline
                ref={el => { if (el) el.srcObject = remoteStream; }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                  {player.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
              </div>
            )}
          </div>
          
          {/* Mic icon */}
          <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50">
            <Mic size={14} className="text-white" />
          </div>
          
          {/* Player name */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <span className="text-white text-sm font-medium">{player.username}</span>
            {player.is_drawer && (
              <span className="ml-2 text-xs text-purple-400">Drawing</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

// === TIMER COMPONENT ===
const Timer = memo(({ seconds, total }) => {
  const progress = (seconds / total) * 100;
  const isLow = seconds <= 10;
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center ${
        isLow ? 'border-red-500 text-red-400' : 'border-purple-500 text-white'
      }`}>
        <span className="text-lg font-bold">
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
});

// === GUESS PROGRESS ===
const GuessProgress = memo(({ guessedCount, totalGuessers }) => {
  const dots = [];
  for (let i = 0; i < totalGuessers; i++) {
    dots.push(
      <div 
        key={i}
        className={`w-4 h-4 rounded-full transition-colors ${
          i < guessedCount ? 'bg-green-500' : 'bg-white/20'
        }`}
      />
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/70 text-sm">Guesses</span>
      <div className="flex gap-1">
        {dots}
      </div>
    </div>
  );
});

// === MAIN DRAW GAME COMPONENT ===
const DrawGame = ({ 
  socket,
  sessionId,
  userId,
  username,
  partnerUsername,
  localStream,
  remoteStream,
  onClose,
  initialGameState
}) => {
  // Game state
  const [gameState, setGameState] = useState(initialGameState || null);
  const [strokes, setStrokes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [roundEndData, setRoundEndData] = useState(null);
  const [showGameEnd, setShowGameEnd] = useState(false);
  
  // Drawing state
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(8);
  const [tool, setTool] = useState('pen');
  
  const timerRef = useRef(null);
  const autoReturnTimer = useRef(null);
  const isDrawer = gameState?.is_drawer || false;
  const hasGuessed = gameState?.has_guessed || false;

  useEffect(() => {
    return () => {
      if (autoReturnTimer.current) {
        clearTimeout(autoReturnTimer.current);
      }
    };
  }, []);
  
  // Build players list from game state
  const players = gameState?.players || [
    { user_id: userId, username: username || 'You', is_drawer: isDrawer },
    { user_id: 'partner', username: partnerUsername || 'Partner', is_drawer: !isDrawer }
  ];
  
  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    const handleGameStarted = (data) => {
      console.log('Draw game started:', data);
      setGameState(data.game_state);
      setStrokes(data.game_state?.canvas_data || []);
      setTimeLeft(data.game_state?.round_time_limit || 30);
    };
    
    const handleStrokeReceived = (data) => {
      console.log('Stroke received:', data);
      setStrokes(prev => [...prev, data.stroke]);
    };
    
    const handleUndo = (data) => {
      console.log('Undo received:', data);
      if (data.removed_stroke_id) {
        setStrokes(prev => prev.filter(s => s.id !== data.removed_stroke_id));
      }
    };
    
    const handleCanvasCleared = () => {
      console.log('Canvas cleared');
      setStrokes([]);
    };
    
    const handleGuessResult = (data) => {
      console.log('Guess result:', data);
      setMessages(prev => [...prev, {
        username: data.player_username || 'Player',
        content: data.guess,
        isCorrect: data.correct,
        points: data.points_earned
      }]);
      
      if (data.game_state) {
        setGameState(data.game_state);
      }
    };
    
    const handleRoundEnded = (data) => {
      console.log('Round ended:', data);
      setShowRoundEnd(true);
      setRoundEndData(data);
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    
    const handleRoundStarted = (data) => {
      console.log('Round started:', data);
      setGameState(data.game_state);
      setStrokes([]);
      setMessages([]);
      setTimeLeft(data.game_state?.round_time_limit || 30);
      setShowRoundEnd(false);
      setRoundEndData(null);
    };
    
    const handleGameEnded = (data) => {
      console.log('Game ended:', data);
      setShowGameEnd(true);
      setRoundEndData(data);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (data?.winner_username) {
        if (autoReturnTimer.current) {
          clearTimeout(autoReturnTimer.current);
        }
        autoReturnTimer.current = setTimeout(() => {
          onClose?.();
        }, 2500);
      }
    };
    
    socket.on('draw_game_started', handleGameStarted);
    socket.on('draw_stroke_received', handleStrokeReceived);
    socket.on('draw_undo', handleUndo);
    socket.on('draw_canvas_cleared', handleCanvasCleared);
    socket.on('draw_guess_result', handleGuessResult);
    socket.on('draw_round_ended', handleRoundEnded);
    socket.on('draw_round_started', handleRoundStarted);
    socket.on('draw_game_ended', handleGameEnded);
    
    return () => {
      socket.off('draw_game_started', handleGameStarted);
      socket.off('draw_stroke_received', handleStrokeReceived);
      socket.off('draw_undo', handleUndo);
      socket.off('draw_canvas_cleared', handleCanvasCleared);
      socket.off('draw_guess_result', handleGuessResult);
      socket.off('draw_round_ended', handleRoundEnded);
      socket.off('draw_round_started', handleRoundStarted);
      socket.off('draw_game_ended', handleGameEnded);
    };
  }, [socket]);
  
  // Timer countdown
  useEffect(() => {
    if (showRoundEnd || showGameEnd) return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - emit event
          socket?.emit('draw_time_up');
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [showRoundEnd, showGameEnd, socket]);
  
  // Handle stroke from local drawer
  const handleStroke = useCallback((stroke) => {
    setStrokes(prev => [...prev, stroke]);
    socket?.emit('draw_stroke', { stroke });
  }, [socket]);
  
  // Handle undo
  const handleUndo = useCallback(() => {
    socket?.emit('draw_undo');
  }, [socket]);
  
  // Handle clear
  const handleClear = useCallback(() => {
    socket?.emit('draw_clear');
  }, [socket]);
  
  // Handle guess submission
  const handleSendMessage = useCallback((guess) => {
    socket?.emit('draw_guess', { guess });
    // Optimistically add to messages
    setMessages(prev => [...prev, {
      username: username || 'You',
      content: guess,
      isCorrect: false
    }]);
  }, [socket, username]);
  
  // Handle skip turn
  const handleSkipTurn = useCallback(() => {
    socket?.emit('draw_skip_turn');
  }, [socket]);
  
  // Handle next round
  const handleNextRound = useCallback(() => {
    socket?.emit('draw_next_round');
  }, [socket]);
  
  // Handle leave game
  const handleLeaveGame = useCallback(() => {
    socket?.emit('end_draw_game');
    onClose?.();
  }, [socket, onClose]);
  
  // Handle play again
  const handlePlayAgain = useCallback(() => {
    setShowGameEnd(false);
    setShowRoundEnd(false);
    setStrokes([]);
    setMessages([]);
    socket?.emit('start_draw_game');
  }, [socket]);
  
  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #020205 0%, #0a0818 50%, #050510 100%)'
      }}
      data-testid="draw-game-container"
    >
      {/* Cosmic background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[600px] h-[600px] opacity-20"
          style={{
            top: '10%',
            left: '20%',
            background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.3) 0%, transparent 60%)',
            filter: 'blur(100px)'
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] opacity-15"
          style={{
            bottom: '20%',
            right: '15%',
            background: 'radial-gradient(ellipse, rgba(168, 85, 247, 0.25) 0%, transparent 55%)',
            filter: 'blur(80px)'
          }}
        />
      </div>
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 border-b border-purple-500/20">
        <button
          onClick={handleLeaveGame}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          data-testid="draw-leave-btn"
        >
          <X size={18} />
          <span className="hidden sm:inline">Leave Room</span>
        </button>
        
        <div className="flex flex-col items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            DRAW & GUESS
          </h1>
          <span className="text-sm text-purple-400">
            Round {gameState?.current_round || 1}/{gameState?.total_rounds || 2}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-sm hidden sm:inline">
            Code: <span className="text-purple-400 font-mono">{gameState?.room_code || 'XXXX'}</span>
          </span>
          <span className="text-white/70 text-sm">
            {players.length}/4
          </span>
        </div>
      </div>
      
      {/* Main content - responsive layout */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Mobile: Cameras at top, Desktop: Left sidebar */}
        <div className="lg:hidden">
          <PlayerVideoGrid 
            players={players}
            localStream={localStream}
            remoteStream={remoteStream}
            currentDrawerId={gameState?.current_drawer_id}
          />
        </div>
        
        {/* Desktop: Left sidebar with players list and round info */}
        <div className="hidden lg:flex flex-col gap-4 w-48">
          <div className="bg-[#1a1a2e]/80 rounded-xl border border-purple-500/20 p-3">
            <div className="text-sm font-semibold text-white/80 mb-3">Players</div>
            <div className="space-y-2">
              {players.map(player => (
                <div key={player.user_id} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    {player.username?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{player.username}</div>
                    <div className="text-xs text-green-400">Ready</div>
                  </div>
                  {player.is_drawer && (
                    <span className="text-yellow-400 text-lg">&#128081;</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-[#1a1a2e]/80 rounded-xl border border-purple-500/20 p-3">
            <div className="text-sm font-semibold text-white/80 mb-3">Round Info</div>
            <div className="text-white/70 text-sm mb-2">
              Drawer: <span className="text-white">{gameState?.drawer_username || 'Unknown'}</span>
            </div>
            <Timer seconds={timeLeft} total={30} />
          </div>
        </div>
        
        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Drawing indicator */}
          <div className="flex justify-center">
            <span className="px-4 py-1 bg-purple-600 rounded-full text-white text-sm">
              {isDrawer ? 'You are drawing' : `${gameState?.drawer_username || 'Partner'} is drawing`}
            </span>
          </div>
          
          {/* Word hint for guessers */}
          {!isDrawer && gameState?.word_hint && (
            <div className="flex justify-center">
              <span className="text-white text-2xl font-mono tracking-[0.5em]">
                {gameState.word_hint}
              </span>
            </div>
          )}
          
          {/* Word for drawer */}
          {isDrawer && gameState?.current_word && (
            <div className="flex justify-center">
              <span className="text-white text-xl font-bold">
                Draw: <span className="text-purple-400">{gameState.current_word}</span>
              </span>
            </div>
          )}
          
          {/* Canvas area */}
          <div className="flex-1 relative bg-[#1a1a2e]/50 rounded-xl border border-purple-500/30 p-2 overflow-hidden">
            <DrawingCanvas
              isDrawer={isDrawer}
              strokes={strokes}
              onStroke={handleStroke}
              onUndo={handleUndo}
              onClear={handleClear}
              currentColor={currentColor}
              brushSize={brushSize}
              tool={tool}
            />
          </div>
          
          {/* Mobile: Timer */}
          <div className="lg:hidden flex justify-center">
            <Timer seconds={timeLeft} total={30} />
          </div>
          
          {/* Guess progress */}
          <div className="flex justify-center">
            <GuessProgress 
              guessedCount={gameState?.guessed_count || 0}
              totalGuessers={gameState?.total_guessers || 1}
            />
          </div>
        </div>
        
        {/* Right sidebar: Tools and Chat */}
        <div className="flex flex-col lg:flex-row lg:flex-col gap-4 w-full lg:w-64">
          {/* Tools */}
          <ToolsPanel
            isDrawer={isDrawer}
            currentColor={currentColor}
            setCurrentColor={setCurrentColor}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            tool={tool}
            setTool={setTool}
            onUndo={handleUndo}
            onClear={handleClear}
          />
          
          {/* Chat */}
          <div className="flex-1 min-h-[200px] lg:min-h-0">
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isDrawer={isDrawer}
              hasGuessed={hasGuessed}
            />
          </div>
        </div>
      </div>
      
      {/* Bottom bar with actions */}
      <div className="relative z-10 flex items-center justify-between p-4 border-t border-purple-500/20">
        {isDrawer && (
          <button
            onClick={handleSkipTurn}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            data-testid="draw-skip-btn"
          >
            <SkipForward size={18} />
            Skip Turn
          </button>
        )}
        
        {!isDrawer && <div />}
        
        {/* Winner announcement - shown during round end */}
        {showRoundEnd && roundEndData && !showGameEnd && (
          <div className="flex-1 text-center">
            <div className="text-purple-400 text-xl font-bold">
              {roundEndData.reason === 'all_guessed' 
                ? 'Everyone guessed it!' 
                : roundEndData.reason === 'skipped'
                ? 'Round skipped'
                : 'Time\'s up!'}
            </div>
            <div className="text-white/70 text-sm">
              The word was: <span className="text-white font-bold">{roundEndData.word}</span>
            </div>
          </div>
        )}
        
        {!showRoundEnd && <div className="flex-1" />}
        
        {showRoundEnd && !showGameEnd && (
          <button
            onClick={handleNextRound}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl text-white font-semibold transition-all shadow-lg shadow-purple-500/30"
            data-testid="draw-next-round-btn"
          >
            Next Round
            <ArrowRight size={18} />
          </button>
        )}
      </div>
      
      {/* Game End Modal */}
      {showGameEnd && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/80">
          <div className="bg-[#1a1a2e] rounded-2xl border border-purple-500/30 p-8 max-w-md w-full mx-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Game Over!</h2>
            
            {roundEndData?.winner_username && (
              <div className="mb-6">
                <span className="text-5xl">&#127942;</span>
                <div className="mt-2 inline-flex items-center gap-2 text-2xl text-purple-400 font-bold">
                  <Crown size={26} className="text-yellow-400" />
                  <span>{roundEndData.winner_username} won!</span>
                </div>
                <p className="text-white/60 mt-3">Returning to your current session...</p>
              </div>
            )}
            
            {/* Final scores */}
            <div className="space-y-2 mb-6">
              {Object.entries(roundEndData?.final_scores || {}).map(([playerId, score]) => {
                const player = players.find(p => p.user_id === playerId);
                return (
                  <div key={playerId} className="flex justify-between text-white/80">
                    <span>{player?.username || 'Player'}</span>
                    <span className="font-bold">{score} pts</span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleLeaveGame}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
              >
                Leave
              </button>
              <button
                onClick={handlePlayAgain}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl text-white font-semibold"
                data-testid="draw-play-again-btn"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(DrawGame);
