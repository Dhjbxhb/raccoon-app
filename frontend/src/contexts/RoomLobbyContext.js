import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useChat } from '@/hooks/useChat';
import { useWebRTC } from '@/hooks/useWebRTC';

const RoomLobbyContext = createContext(null);

export const RoomLobbyProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [roomState, setRoomState] = useState(null);
  const [roomGameState, setRoomGameState] = useState({
    activeGame: null,
    uno: null,
    feud: null,
    draw: null,
  });

  const matchReturnRoomCodeRef = useRef(null);
  const myId = user?.user_id || user?.guest_id;

  const roomPartner = useMemo(() => {
    if (!roomState?.players || !myId) return null;
    return roomState.players.find((player) => player.id !== myId) || null;
  }, [roomState, myId]);

  const roomSessionId = roomState?.room_id || null;
  const roomChat = useChat(socket, roomSessionId, myId, 'room');
  const roomVoice = useWebRTC(socket, roomSessionId, roomPartner?.id || null, Boolean(roomSessionId && roomPartner?.id), 'room', 'audio-video');

  const resetRoomGameState = useCallback(() => {
    setRoomGameState({
      activeGame: null,
      uno: null,
      feud: null,
      draw: null,
    });
  }, []);

  const setPendingMatchReturn = useCallback((roomCode) => {
    matchReturnRoomCodeRef.current = roomCode || null;
  }, []);

  const clearPendingMatchReturn = useCallback(() => {
    matchReturnRoomCodeRef.current = null;
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data) => setRoomState(data);
    const handleRoomUpdated = (data) => setRoomState(data);
    const handlePlayerJoined = (data) => setRoomState(data.room);
    const handlePlayerLeft = (data) => setRoomState(data.room);
    const handleRoomLeft = () => {
      setRoomState(null);
      resetRoomGameState();
      clearPendingMatchReturn();
    };
    const handleRoomState = (data) => {
      if (data) setRoomState(data);
    };
    const handleRoomGameStarted = (data) => {
      if (data?.room) setRoomState(data.room);
    };
    const handleRoomGameEnded = (room) => {
      setRoomState(room);
      resetRoomGameState();
    };
    const handleUnoStarted = (data) => {
      if (data?.context_type === 'room') {
        setRoomGameState((prev) => ({ ...prev, activeGame: 'uno', uno: data.game_state }));
      }
    };
    const handleFeudStarted = (data) => {
      if (data?.context_type === 'room') {
        setRoomGameState((prev) => ({ ...prev, activeGame: 'feud', feud: data.game_state }));
      }
    };
    const handleDrawStarted = (data) => {
      if (data?.context_type === 'room') {
        setRoomGameState((prev) => ({ ...prev, activeGame: 'draw', draw: data.game_state }));
      }
    };
    const handleUnoEnded = () => setRoomGameState((prev) => ({ ...prev, activeGame: prev.activeGame === 'uno' ? null : prev.activeGame, uno: null }));
    const handleFeudEnded = () => setRoomGameState((prev) => ({ ...prev, activeGame: prev.activeGame === 'feud' ? null : prev.activeGame, feud: null }));
    const handleDrawEnded = () => setRoomGameState((prev) => ({ ...prev, activeGame: prev.activeGame === 'draw' ? null : prev.activeGame, draw: null }));

    socket.on('room_created', handleRoomCreated);
    socket.on('room_updated', handleRoomUpdated);
    socket.on('player_joined', handlePlayerJoined);
    socket.on('player_left', handlePlayerLeft);
    socket.on('room_left', handleRoomLeft);
    socket.on('room_state', handleRoomState);
    socket.on('room_game_started', handleRoomGameStarted);
    socket.on('room_game_ended', handleRoomGameEnded);
    socket.on('uno_game_started', handleUnoStarted);
    socket.on('feud_game_started', handleFeudStarted);
    socket.on('draw_game_started', handleDrawStarted);
    socket.on('uno_game_ended', handleUnoEnded);
    socket.on('feud_game_ended', handleFeudEnded);
    socket.on('draw_game_ended', handleDrawEnded);

    socket.emit('get_room_state');

    return () => {
      socket.off('room_created', handleRoomCreated);
      socket.off('room_updated', handleRoomUpdated);
      socket.off('player_joined', handlePlayerJoined);
      socket.off('player_left', handlePlayerLeft);
      socket.off('room_left', handleRoomLeft);
      socket.off('room_state', handleRoomState);
      socket.off('room_game_started', handleRoomGameStarted);
      socket.off('room_game_ended', handleRoomGameEnded);
      socket.off('uno_game_started', handleUnoStarted);
      socket.off('feud_game_started', handleFeudStarted);
      socket.off('draw_game_started', handleDrawStarted);
      socket.off('uno_game_ended', handleUnoEnded);
      socket.off('feud_game_ended', handleFeudEnded);
      socket.off('draw_game_ended', handleDrawEnded);
    };
  }, [socket, resetRoomGameState, clearPendingMatchReturn]);

  const value = useMemo(() => ({
    roomState,
    setRoomState,
    roomGameState,
    setRoomGameState,
    resetRoomGameState,
    roomPartner,
    roomSessionId,
    roomChat,
    roomVoice,
    pendingMatchReturnRoomCode: matchReturnRoomCodeRef.current,
    setPendingMatchReturn,
    clearPendingMatchReturn,
  }), [
    roomState,
    roomGameState,
    resetRoomGameState,
    roomPartner,
    roomSessionId,
    roomChat,
    roomVoice,
    setPendingMatchReturn,
    clearPendingMatchReturn,
  ]);

  return <RoomLobbyContext.Provider value={value}>{children}</RoomLobbyContext.Provider>;
};

export const useRoomLobby = () => {
  const context = useContext(RoomLobbyContext);
  if (!context) {
    throw new Error('useRoomLobby must be used within RoomLobbyProvider');
  }
  return context;
};

export default RoomLobbyContext;