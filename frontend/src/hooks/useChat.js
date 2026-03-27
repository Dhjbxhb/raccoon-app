import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useChat Hook - Optimized chat functionality
 * 
 * Features:
 * - Message state management
 * - Typing indicators
 * - Session-aware cleanup
 * - Debounced typing notifications
 * - Memory-efficient message handling
 */
export const useChat = (socket, sessionId) => {
  const [messages, setMessages] = useState([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const prevSessionIdRef = useRef(null);
  const mountedRef = useRef(true);
  const socketIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Limit message history to prevent memory bloat
  const MAX_MESSAGES = 200;
  
  // Clear messages when session changes
  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      setMessages([]);
      setPartnerTyping(false);
      prevSessionIdRef.current = sessionId;
    }
  }, [sessionId]);
  
  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  // Socket event handlers
  const handleReceiveMessage = useCallback((message) => {
    if (!mountedRef.current) return;
    setMessages(prev => {
      const newMessages = [...prev, message];
      // Trim old messages if exceeding limit
      if (newMessages.length > MAX_MESSAGES) {
        return newMessages.slice(-MAX_MESSAGES);
      }
      return newMessages;
    });
  }, []);

  const handlePartnerTyping = useCallback(() => {
    if (!mountedRef.current) return;
    setPartnerTyping(true);
    
    // Auto-clear typing indicator after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setPartnerTyping(false);
      }
    }, 3000);
  }, []);

  const handlePartnerStoppedTyping = useCallback(() => {
    if (!mountedRef.current) return;
    setPartnerTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    // Prevent duplicate listeners
    if (socketIdRef.current === socket.id) return;
    socketIdRef.current = socket.id;

    socket.on('receive_message', handleReceiveMessage);
    socket.on('partner_typing', handlePartnerTyping);
    socket.on('partner_stopped_typing', handlePartnerStoppedTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('partner_typing', handlePartnerTyping);
      socket.off('partner_stopped_typing', handlePartnerStoppedTyping);
      socketIdRef.current = null;
    };
  }, [socket, handleReceiveMessage, handlePartnerTyping, handlePartnerStoppedTyping]);

  const sendMessage = useCallback((content) => {
    if (socket && content.trim()) {
      socket.emit('send_message', { content: content.trim() });
    }
  }, [socket]);

  // Debounced typing indicator
  const typingDebounceRef = useRef(null);
  
  const startTyping = useCallback(() => {
    if (!socket) return;
    
    // Debounce to prevent spamming
    if (typingDebounceRef.current) return;
    
    socket.emit('typing_start');
    typingDebounceRef.current = setTimeout(() => {
      typingDebounceRef.current = null;
    }, 1000);
  }, [socket]);

  const stopTyping = useCallback(() => {
    if (socket) {
      socket.emit('typing_stop');
    }
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }
  }, [socket]);

  // Manual clear for state reset
  const clearMessages = useCallback(() => {
    setMessages([]);
    setPartnerTyping(false);
  }, []);

  return {
    messages,
    partnerTyping,
    sendMessage,
    startTyping,
    stopTyping,
    clearMessages
  };
};
