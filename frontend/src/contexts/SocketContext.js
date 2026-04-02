import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL;

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { token } = useAuth();
  
  // Refs to prevent stale closures and duplicate connections
  const socketRef = useRef(null);
  const connectingRef = useRef(false);
  const authPendingRef = useRef(false);

  // Stable disconnect handler
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocket(null);
    setConnected(false);
    connectingRef.current = false;
    authPendingRef.current = false;
  }, []);

  useEffect(() => {
    // No token = no connection
    if (!token) {
      disconnect();
      return;
    }

    // Prevent duplicate connection attempts
    if (connectingRef.current || socketRef.current?.connected) {
      // If we have a connected socket but token changed, re-authenticate
      if (socketRef.current?.connected && !authPendingRef.current) {
        authPendingRef.current = true;
        socketRef.current.emit('authenticate', { token });
      }
      return;
    }

    connectingRef.current = true;

    // PERFORMANCE: Create socket connection with low-latency settings
    const newSocket = io(SOCKET_URL, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],  // Prefer WebSocket for speed
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 500,  // Faster reconnection
      reconnectionDelayMax: 2000,  // Lower max delay
      reconnectionAttempts: 10,
      timeout: 10000,  // Faster timeout
      // Low-latency optimizations
      forceNew: false,
      multiplex: true,
      // Engine.IO options for speed
      pingTimeout: 10000,  // Faster ping timeout
      pingInterval: 5000,  // More frequent pings
    });

    // Store in ref immediately
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);
      connectingRef.current = false;
      
      // Authenticate with JWT
      authPendingRef.current = true;
      newSocket.emit('authenticate', { token });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      authPendingRef.current = false;
      
      // Don't clear socket on temporary disconnects
      if (reason === 'io server disconnect') {
        // Server initiated disconnect - reconnect manually
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      connectingRef.current = false;
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Handle reconnection
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      // Re-authenticate on reconnection
      if (token && !authPendingRef.current) {
        authPendingRef.current = true;
        newSocket.emit('authenticate', { token });
      }
    });

    // After successful authentication, attempt to rejoin any active session
    newSocket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
      authPendingRef.current = false;
      
      // Attempt to rejoin session (in case of page refresh while in match)
      newSocket.emit('rejoin_session', {});
    });

    setSocket(newSocket);

    return () => {
      // Cleanup on unmount or token change
      if (socketRef.current === newSocket) {
        newSocket.removeAllListeners();
        newSocket.disconnect();
        socketRef.current = null;
        connectingRef.current = false;
        authPendingRef.current = false;
      }
    };
  }, [token, disconnect]);

  return (
    <SocketContext.Provider value={{ socket, connected, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};
