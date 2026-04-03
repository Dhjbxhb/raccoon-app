import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useRoomLobby } from '@/contexts/RoomLobbyContext';
import { toast } from 'sonner';
import { 
  Copy, Users, Play, Zap, LogOut, Crown, 
  Plus, ArrowRight, Check, X
} from 'lucide-react';
import DrawGame from '@/components/games/DrawGame';
import FeudGame from '@/components/games/FeudGame';
import UnoGame from '@/components/games/UnoGame';
import '@/styles/match.css';

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
  const {
    roomState: lobbyRoomState,
    roomGameState,
    roomVoice,
    roomChat,
    roomPartner,
    resetRoomGameState,
  } = useRoomLobby();
  
  const [mode, setMode] = useState('menu'); // menu, create, join, room
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roomMessage, setRoomMessage] = useState('');
  const privateMatchSessionRef = useRef(null);
  
  // Premium status - from backend's computed is_premium field
  const isPremium = user?.is_premium === true;
  const myId = user?.user_id || user?.guest_id;
  const activeRoom = lobbyRoomState || room;
  const isRoomMode = mode === 'room' || Boolean(activeRoom);
  const hasRoomLocalVideo = Boolean(roomVoice.localStream?.getVideoTracks?.().length);
  const hasRoomRemoteVideo = Boolean(roomVoice.remoteStream?.getVideoTracks?.().length);

  useEffect(() => {
    if (activeRoom) {
      setMode('room');
    }
  }, [activeRoom]);
  
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
    };

    const handlePrivateMatchStarted = (data) => {
      console.log('[ROOM] Private match started:', data);
      if (privateMatchSessionRef.current === data.session_id) {
        return;
      }

      privateMatchSessionRef.current = data.session_id;
      navigate('/match', {
        state: {
          privateRoomLaunch: true,
          roomCode: data.room_code,
          sessionId: data.session_id,
          partner: data.partner,
          autoStartGame: data.auto_start_game || null,
          autoStartGameInitiatorId: data.initiator_id || null,
        }
      });
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
    socket.on('private_room_match_started', handlePrivateMatchStarted);
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
      socket.off('private_room_match_started', handlePrivateMatchStarted);
      socket.off('group_matching_started', handleMatchingStarted);
      socket.off('group_matching_stopped', handleMatchingStopped);
      socket.off('room_state');
    };
  }, [socket, navigate]);
  
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
    resetRoomGameState();
  }, [socket]);

  const handleEndRoomGame = useCallback(() => {
    if (!socket) return;
    socket.emit('end_room_game');
    resetRoomGameState();
  }, [socket, resetRoomGameState]);

  const handleRoomSendMessage = useCallback((e) => {
    e.preventDefault();
    if (!roomMessage.trim()) return;
    roomChat.sendMessage(roomMessage);
    setRoomMessage('');
  }, [roomMessage, roomChat]);
  
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
  const isCreator = activeRoom?.players?.find(p => p.id === myId)?.is_creator;
  const playerCount = activeRoom?.player_count || activeRoom?.players?.length || 0;
  const isRoomReady = playerCount === 2;
  
  // Get camera layout based on player count
  const getCameraLayout = (count) => {
    return count <= 1 ? 'grid-cols-1' : 'grid-cols-2';
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0614] via-[#120a24] to-[#0a0614] text-white">
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
        {mode === 'menu' && !activeRoom && (
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
        {mode === 'join' && !activeRoom && (
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
        {isRoomMode && activeRoom && (
          <div className="flex flex-col min-h-[70vh]">
            
            {/* Camera Grid */}
            <div className={`grid ${getCameraLayout(activeRoom.players?.length || 1)} gap-4 mb-8`}>
              {activeRoom.players?.map((player) => {
                const isMe = player.id === myId;
                const hasVideo = isMe ? hasRoomLocalVideo : hasRoomRemoteVideo;
                const stream = isMe ? roomVoice.localStream : roomVoice.remoteStream;
                return (
                <div 
                  key={player.id}
                  className="relative aspect-video bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl border-2 border-purple-500/30 overflow-hidden"
                  style={{
                    boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)'
                  }}
                >
                  {/* Camera view */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {hasVideo && stream ? (
                      <video
                        autoPlay
                        muted={isMe}
                        playsInline
                        ref={(el) => {
                          if (el && el.srcObject !== stream) {
                            el.srcObject = stream;
                            el.play().catch(() => {});
                          }
                        }}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-purple-600/30 flex items-center justify-center">
                        <span className="text-2xl">{player.username?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                    )}
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
                );
              })}
            </div>
            
            {/* Room Info Center */}
            <div className="text-center mb-8">
              <p className="text-sm text-purple-400 font-medium mb-2">PRIVATE ROOM</p>
              
              {/* Room Code */}
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl mb-4">
                <span className="text-3xl font-mono tracking-[0.3em] font-bold">
                  {activeRoom.code}
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
              <div className="flex items-center justify-center gap-2 text-gray-400" data-testid="room-player-count">
                <Users size={18} />
                <span>{playerCount}/{room.max_players || 2} Players</span>
              </div>
              
              {/* Status */}
              <p className="mt-2 text-sm">
                {room.status === 'waiting' && (
                  <span className="text-yellow-400">
                    {isRoomReady ? 'Room full and ready.' : 'Waiting for 1 more player...'}
                  </span>
                )}
                {activeRoom.status === 'matching' && (
                  <span className="text-blue-400">Connecting your private match...</span>
                )}
                {activeRoom.status === 'in_game' && (
                  <span className="text-green-400">Playing {activeRoom.current_game}</span>
                )}
              </p>
            </div>
            
            {/* Game Selection */}
            {activeRoom.status === 'waiting' && isCreator && (
              <div className="mb-8">
                <p className="text-center text-sm text-gray-400 mb-3">Select Game</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <button
                    onClick={() => handleStartGame('uno')}
                    disabled={activeRoom.players?.length < 2}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-xl text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    data-testid="game-uno-btn"
                  >
                    UNO
                  </button>
                  <button
                    onClick={() => handleStartGame('feud')}
                    disabled={activeRoom.players?.length < 2}
                    className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-xl text-sm font-medium hover:bg-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    data-testid="game-feud-btn"
                  >
                    Feud
                  </button>
                  <button
                    onClick={() => handleStartGame('draw')}
                    disabled={activeRoom.players?.length < 2}
                    className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    data-testid="game-draw-btn"
                  >
                    Draw & Guess
                  </button>
                </div>
              </div>
            )}

            <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Lobby Chat</p>
                  <p className="text-xs text-gray-400">Voice + chat stay active while you are in the room.</p>
                </div>
                <div className="text-xs text-green-300">
                  Mic {roomVoice.localStream ? 'ON' : 'Connecting'} · Chat ON
                </div>
              </div>

              <div className="mb-3 h-40 overflow-y-auto rounded-xl bg-black/20 p-3 space-y-2">
                {roomChat.messages.length === 0 ? (
                  <p className="text-sm text-gray-500">Room chat is ready.</p>
                ) : roomChat.messages.map((message) => (
                  <div key={message.message_id || message.temp_id} className="rounded-xl bg-white/5 px-3 py-2">
                    <div className="text-xs font-semibold text-purple-300">{message.sender_username || 'User'}</div>
                    <div className="text-sm text-white/90">{message.content}</div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleRoomSendMessage} className="flex gap-2">
                <input
                  value={roomMessage}
                  onChange={(e) => setRoomMessage(e.target.value)}
                  onFocus={roomChat.startTyping}
                  onBlur={roomChat.stopTyping}
                  placeholder="Send a room message"
                  className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                  data-testid="room-chat-input"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 font-semibold text-white"
                  data-testid="room-chat-send"
                >
                  Send
                </button>
              </form>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-auto flex flex-col sm:flex-row gap-3">
              {isCreator && activeRoom.status === 'waiting' && (
                <>
                  <button
                    onClick={handleStartMatching}
                    disabled={!isRoomReady}
                    className="flex-1 flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all disabled:opacity-50"
                    data-testid="start-matching-btn"
                  >
                    <Zap size={20} />
                    Start Match
                  </button>
                </>
              )}
              
              {isCreator && activeRoom.status === 'matching' && (
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

            {roomGameState.activeGame === 'draw' && (
              <div className="game-fullscreen-container">
              <DrawGame
                isOpen={true}
                onClose={handleEndRoomGame}
                socket={socket}
                userId={myId}
                username={user?.username || 'You'}
                partnerUsername={roomPartner?.username || 'Partner'}
                sessionId={activeRoom.room_id}
                localStream={roomVoice.localStream}
                remoteStream={roomVoice.remoteStream}
                initialGameState={roomGameState.draw}
              />
              </div>
            )}

            {roomGameState.activeGame === 'feud' && (
              <div className="game-fullscreen-container">
              <FeudGame
                isOpen={true}
                onClose={handleEndRoomGame}
                socket={socket}
                myUserId={myId}
                partnerUsername={roomPartner?.username || 'Partner'}
                sessionId={activeRoom.room_id}
                initialGameState={roomGameState.feud}
                localStream={roomVoice.localStream}
                remoteStream={roomVoice.remoteStream}
              />
              </div>
            )}

            {roomGameState.activeGame === 'uno' && (
              <div className="game-fullscreen-container">
              <UnoGame
                isOpen={true}
                onClose={handleEndRoomGame}
                socket={socket}
                myUserId={myId}
                partnerUsername={roomPartner?.username || 'Partner'}
                myUsername={user?.username || 'You'}
                sessionId={activeRoom.room_id}
                initialGameState={roomGameState.uno}
                localStream={roomVoice.localStream}
                remoteStream={roomVoice.remoteStream}
              />
              </div>
            )}
          </div>
        )}
        
      </div>
    </div>
  );
};

export default PrivateRoom;
