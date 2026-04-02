import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { toast } from 'sonner';
import { 
  Copy, Users, Play, Zap, LogOut, Crown, 
  Plus, ArrowRight, Check, X
} from 'lucide-react';

/**
 * PrivateRoom - Create/Join Private Rooms
 * - Premium users can create rooms
 * - Any user can join with code
 * - Play games together or matchmake as group
 */
const PrivateRoom = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected: isConnected } = useSocket();
  
  const [mode, setMode] = useState('menu'); // menu, create, join, room
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Premium status - from backend's computed is_premium field
  const isPremium = user?.is_premium === true || user?.premium_status === true;
  const myId = user?.user_id || user?.guest_id;
  
  // Socket event handlers
  useEffect(() => {
    if (!socket) return;
    
    const handleRoomCreated = (data) => {
      console.log('[ROOM] Created:', data);
      setRoom(data);
      setMode('room');
      setLoading(false);
    };
    
    const handleRoomUpdated = (data) => {
      console.log('[ROOM] Updated:', data);
      setRoom(data);
    };
    
    const handlePlayerJoined = (data) => {
      console.log('[ROOM] Player joined:', data);
      setRoom(data.room);
      toast.success(`${data.username} joined the room`);
    };
    
    const handlePlayerLeft = (data) => {
      console.log('[ROOM] Player left:', data);
      setRoom(data.room);
    };
    
    const handleRoomLeft = () => {
      console.log('[ROOM] Left room');
      setRoom(null);
      setMode('menu');
    };
    
    const handleRoomError = (data) => {
      console.error('[ROOM] Error:', data.message);
      toast.error(data.message);
      setLoading(false);
    };
    
    const handleGameStarted = (data) => {
      console.log('[ROOM] Game started:', data);
      setRoom(data.room);
      // Navigate to game or show game overlay
    };
    
    const handleMatchingStarted = (data) => {
      console.log('[ROOM] Group matching started:', data);
      setRoom(data.room);
      toast.success('Looking for opponents...');
    };
    
    const handleMatchingStopped = (data) => {
      console.log('[ROOM] Matching stopped:', data);
      setRoom(data);
    };
    
    socket.on('room_created', handleRoomCreated);
    socket.on('room_updated', handleRoomUpdated);
    socket.on('player_joined', handlePlayerJoined);
    socket.on('player_left', handlePlayerLeft);
    socket.on('room_left', handleRoomLeft);
    socket.on('room_error', handleRoomError);
    socket.on('room_game_started', handleGameStarted);
    socket.on('group_matching_started', handleMatchingStarted);
    socket.on('group_matching_stopped', handleMatchingStopped);
    
    // Check if already in a room
    socket.emit('get_room_state');
    socket.on('room_state', (data) => {
      if (data) {
        setRoom(data);
        setMode('room');
      }
    });
    
    return () => {
      socket.off('room_created', handleRoomCreated);
      socket.off('room_updated', handleRoomUpdated);
      socket.off('player_joined', handlePlayerJoined);
      socket.off('player_left', handlePlayerLeft);
      socket.off('room_left', handleRoomLeft);
      socket.off('room_error', handleRoomError);
      socket.off('room_game_started', handleGameStarted);
      socket.off('group_matching_started', handleMatchingStarted);
      socket.off('group_matching_stopped', handleMatchingStopped);
      socket.off('room_state');
    };
  }, [socket]);
  
  // Create room
  const handleCreate = useCallback(() => {
    if (!socket || !isPremium) return;
    setLoading(true);
    socket.emit('create_room');
  }, [socket, isPremium]);
  
  // Join room
  const handleJoin = useCallback(() => {
    if (!socket || !joinCode.trim()) return;
    setLoading(true);
    socket.emit('join_room', { code: joinCode.toUpperCase() });
    
    // Handle join response
    const timeout = setTimeout(() => setLoading(false), 3000);
    socket.once('room_updated', () => {
      clearTimeout(timeout);
      setLoading(false);
      setMode('room');
    });
  }, [socket, joinCode]);
  
  // Leave room
  const handleLeave = useCallback(() => {
    if (!socket) return;
    socket.emit('leave_room');
  }, [socket]);
  
  // Copy room code
  const handleCopyCode = useCallback(() => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [room]);
  
  // Start game
  const handleStartGame = useCallback((gameType) => {
    if (!socket) return;
    socket.emit('start_room_game', { game_type: gameType });
  }, [socket]);
  
  // Start group matching
  const handleStartMatching = useCallback(() => {
    if (!socket) return;
    socket.emit('start_group_matching');
  }, [socket]);
  
  // Stop matching
  const handleStopMatching = useCallback(() => {
    if (!socket) return;
    socket.emit('stop_group_matching');
  }, [socket]);
  
  // Check if current user is creator
  const isCreator = room?.players?.find(p => p.id === myId)?.is_creator;
  
  // Get camera layout based on player count
  const getCameraLayout = (count) => {
    if (count <= 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    return 'grid-cols-2 grid-rows-2';
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0614] via-[#120a24] to-[#0a0614] text-white">
      {/* DEBUG PANEL - Shows premium status */}
      <div className="fixed top-2 right-2 z-50 px-3 py-1.5 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg text-xs font-mono">
        <span className="text-gray-400">Premium: </span>
        <span className={isPremium ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
          {isPremium ? "TRUE" : "FALSE"}
        </span>
        {user?.force_premium && (
          <span className="ml-2 text-yellow-400">(forced)</span>
        )}
      </div>
      
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[100px]" />
      </div>
      
      {/* Header */}
      <div className="relative z-10 p-4 flex items-center justify-between border-b border-white/5">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowRight size={18} className="rotate-180" />
          <span>Back</span>
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Private Rooms
        </h1>
        <div className="w-20" />
      </div>
      
      <div className="relative z-10 max-w-4xl mx-auto p-6">
        
        {/* === MENU MODE === */}
        {mode === 'menu' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🦝</div>
              <h2 className="text-3xl font-bold mb-2">Private Rooms</h2>
              <p className="text-gray-400">Play with friends or match together</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              {/* Create Room Button */}
              <button
                onClick={() => isPremium ? handleCreate() : toast.error('Premium required to create rooms')}
                disabled={loading}
                className={`flex-1 relative p-6 rounded-2xl border transition-all ${
                  isPremium 
                    ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30 hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                    : 'bg-white/5 border-white/10 opacity-60 cursor-not-allowed'
                }`}
                data-testid="create-room-btn"
              >
                {!isPremium && (
                  <div className="absolute top-3 right-3">
                    <Crown size={16} className="text-yellow-400" />
                  </div>
                )}
                <Plus size={32} className="mx-auto mb-3 text-purple-400" />
                <p className="font-semibold">Create Room</p>
                <p className="text-xs text-gray-400 mt-1">
                  {isPremium ? 'Start a new room' : 'Premium only'}
                </p>
              </button>
              
              {/* Join Room Button */}
              <button
                onClick={() => setMode('join')}
                className="flex-1 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 transition-all"
                data-testid="join-room-btn"
              >
                <Users size={32} className="mx-auto mb-3 text-blue-400" />
                <p className="font-semibold">Join Room</p>
                <p className="text-xs text-gray-400 mt-1">Enter room code</p>
              </button>
            </div>
          </div>
        )}
        
        {/* === JOIN MODE === */}
        {mode === 'join' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-sm">
              <button 
                onClick={() => setMode('menu')}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
              >
                <X size={18} />
                Cancel
              </button>
              
              <h2 className="text-2xl font-bold text-center mb-8">Enter Room Code</h2>
              
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="XXXXX"
                maxLength={5}
                className="w-full text-center text-4xl font-mono tracking-[0.5em] p-6 bg-white/5 border border-white/20 rounded-2xl focus:border-purple-500 focus:outline-none placeholder:text-gray-600"
                autoFocus
                data-testid="room-code-input"
              />
              
              <button
                onClick={handleJoin}
                disabled={joinCode.length !== 5 || loading}
                className="w-full mt-6 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                data-testid="join-submit-btn"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        )}
        
        {/* === ROOM MODE === */}
        {mode === 'room' && room && (
          <div className="flex flex-col min-h-[70vh]">
            
            {/* Camera Grid */}
            <div className={`grid ${getCameraLayout(room.players?.length || 1)} gap-4 mb-8`}>
              {room.players?.map((player, idx) => (
                <div 
                  key={player.id}
                  className="relative aspect-video bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl border-2 border-purple-500/30 overflow-hidden"
                  style={{
                    boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)'
                  }}
                >
                  {/* Camera placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-purple-600/30 flex items-center justify-center">
                      <span className="text-2xl">{player.username?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                  </div>
                  
                  {/* Creator badge */}
                  {player.is_creator && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full flex items-center gap-1">
                      <Crown size={12} className="text-yellow-400" />
                      <span className="text-xs text-yellow-400">Host</span>
                    </div>
                  )}
                  
                  {/* Username */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full">
                    <span className="text-sm font-medium">
                      {player.id === myId ? 'You' : player.username}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Room Info Center */}
            <div className="text-center mb-8">
              <p className="text-sm text-purple-400 font-medium mb-2">PRIVATE ROOM</p>
              
              {/* Room Code */}
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl mb-4">
                <span className="text-3xl font-mono tracking-[0.3em] font-bold">
                  {room.code}
                </span>
                <button 
                  onClick={handleCopyCode}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  data-testid="copy-code-btn"
                >
                  {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                </button>
              </div>
              
              {/* Player Count */}
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Users size={18} />
                <span>{room.player_count || room.players?.length || 0}/{room.max_players || 2} Players</span>
              </div>
              
              {/* Status */}
              <p className="mt-2 text-sm">
                {room.status === 'waiting' && (
                  <span className="text-yellow-400">Waiting for players...</span>
                )}
                {room.status === 'matching' && (
                  <span className="text-blue-400">Looking for opponents...</span>
                )}
                {room.status === 'in_game' && (
                  <span className="text-green-400">Playing {room.current_game}</span>
                )}
              </p>
            </div>
            
            {/* Game Selection */}
            {room.status === 'waiting' && isCreator && (
              <div className="mb-8">
                <p className="text-center text-sm text-gray-400 mb-3">Select Game</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <button
                    onClick={() => handleStartGame('uno')}
                    disabled={room.players?.length < 2}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-xl text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    data-testid="game-uno-btn"
                  >
                    UNO
                  </button>
                  <button
                    onClick={() => handleStartGame('feud')}
                    disabled={room.players?.length < 2}
                    className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-xl text-sm font-medium hover:bg-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    data-testid="game-feud-btn"
                  >
                    Feud
                  </button>
                  <button
                    onClick={() => handleStartGame('draw')}
                    disabled={room.players?.length < 2}
                    className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    data-testid="game-draw-btn"
                  >
                    Draw & Guess
                  </button>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="mt-auto flex flex-col sm:flex-row gap-3">
              {isCreator && room.status === 'waiting' && (
                <>
                  <button
                    onClick={handleStartMatching}
                    disabled={room.players?.length < 1}
                    className="flex-1 flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all disabled:opacity-50"
                    data-testid="start-matching-btn"
                  >
                    <Zap size={20} />
                    Start Matching
                  </button>
                </>
              )}
              
              {isCreator && room.status === 'matching' && (
                <button
                  onClick={handleStopMatching}
                  className="flex-1 flex items-center justify-center gap-2 p-4 bg-orange-500/20 border border-orange-500/40 rounded-xl font-semibold hover:bg-orange-500/30 transition-all"
                >
                  <X size={20} />
                  Stop Matching
                </button>
              )}
              
              <button
                onClick={handleLeave}
                className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                data-testid="leave-room-btn"
              >
                <LogOut size={20} />
                Leave Room
              </button>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default PrivateRoom;
