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

    // Create socket connection with optimized settings
    const newSocket = io(SOCKET_URL, {
      path: '/api/socket.io',
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000,
      // Prevent duplicate connections
      forceNew: false,
      multiplex: true
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

    newSocket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
      authPendingRef.current = false;
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
