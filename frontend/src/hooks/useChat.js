import { useState, useEffect, useCallback, useRef } from 'react';

// Simple UUID v4 generator (no external dependency)
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * MESSAGE STATUS ENUM
 * Tracks the lifecycle of each message
 */
const MessageStatus = {
  SENDING: 'sending',      // Optimistically displayed, awaiting confirmation
  DELIVERED: 'delivered',  // Confirmed by server
  FAILED: 'failed'         // Server rejected or timeout
};

/**
 * useChat Hook - Room-based, persistent, real-time chat
 * 
 * CRITICAL FEATURES:
 * - Optimistic UI with temp_id tracking
 * - Message confirmation from server
 * - No local-only messages (all must be server-confirmed)
 * - Chat history restoration on reconnect
 * - Proper deduplication
 * - Typing indicators with debounce
 */
export const useChat = (socket, sessionId, currentUserId, contextType = 'match') => {
  // Messages keyed by message_id for O(1) dedup
  const [messagesMap, setMessagesMap] = useState(new Map());
  const [partnerTyping, setPartnerTyping] = useState(false);
  
  // Track pending messages by temp_id
  const pendingMessagesRef = useRef(new Map());
  
  // Track previous session to detect changes
  const prevSessionIdRef = useRef(null);
  const mountedRef = useRef(true);
  const socketIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingDebounceRef = useRef(null);
  
  // Convert map to sorted array for rendering
  const messages = Array.from(messagesMap.values())
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  const MAX_MESSAGES = 500;
  
  // ========== SESSION CHANGE HANDLER ==========
  // Clear messages when session changes
  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      // Session changed - clear everything
      setMessagesMap(new Map());
      setPartnerTyping(false);
      pendingMessagesRef.current.clear();
      prevSessionIdRef.current = sessionId;
      
      // If we have a valid session, request chat history
      if (socket && sessionId) {
        socket.emit('fetch_chat_history', { session_id: sessionId, context_type: contextType });
      }
    }
  }, [sessionId, socket, contextType]);
  
  // ========== MOUNT TRACKING ==========
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
  }, []);
  
  // ========== ADD MESSAGE TO STATE (with dedup) ==========
  const addMessage = useCallback((message) => {
    if (!mountedRef.current) return;
    
    setMessagesMap(prev => {
      const newMap = new Map(prev);
      
      // Use message_id as key for dedup
      const key = message.message_id || message.temp_id;
      
      // Don't add duplicates
      if (newMap.has(key)) {
        // Update existing (e.g., pending -> delivered)
        const existing = newMap.get(key);
        newMap.set(key, { ...existing, ...message, status: message.status || MessageStatus.DELIVERED });
      } else {
        newMap.set(key, message);
      }
      
      // Trim old messages if exceeding limit
      if (newMap.size > MAX_MESSAGES) {
        const sortedEntries = Array.from(newMap.entries())
          .sort((a, b) => new Date(a[1].timestamp) - new Date(b[1].timestamp));
        const toRemove = sortedEntries.slice(0, sortedEntries.length - MAX_MESSAGES);
        toRemove.forEach(([k]) => newMap.delete(k));
      }
      
      return newMap;
    });
  }, []);
  
  // ========== UPDATE PENDING MESSAGE ==========
  const updatePendingMessage = useCallback((tempId, updates) => {
    if (!mountedRef.current) return;
    
    setMessagesMap(prev => {
      const newMap = new Map(prev);
      
      // Find message by temp_id
      for (const [key, msg] of newMap.entries()) {
        if (msg.temp_id === tempId) {
          // If we got a real message_id, re-key the entry
          if (updates.message_id && updates.message_id !== key) {
            newMap.delete(key);
            newMap.set(updates.message_id, { ...msg, ...updates });
          } else {
            newMap.set(key, { ...msg, ...updates });
          }
          break;
        }
      }
      
      return newMap;
    });
    
    // Remove from pending tracking
    pendingMessagesRef.current.delete(tempId);
  }, []);
  
  // ========== SOCKET EVENT HANDLERS ==========
  
  // Handle confirmed message (sender receives this)
  const handleMessageConfirmed = useCallback((message) => {
    if (!mountedRef.current) return;
    
    console.log('=== MESSAGE CONFIRMED ===');
    console.log('message_id:', message.message_id);
    console.log('temp_id:', message.temp_id);
    console.log('content:', message.content?.substring(0, 30));
    
    // Update the pending message with confirmed data
    updatePendingMessage(message.temp_id, {
      ...message,
      status: MessageStatus.DELIVERED
    });
  }, [updatePendingMessage]);
  
  // Handle received message (receiver gets this)
  const handleReceiveMessage = useCallback((message) => {
    if (!mountedRef.current) return;
    
    console.log('=== RECEIVE MESSAGE ===');
    console.log('message_id:', message.message_id);
    console.log('sender_id:', message.sender_id);
    console.log('currentUserId:', currentUserId);
    console.log('content:', message.content?.substring(0, 30));
    
    // Don't add if this is our own message (handled by message_confirmed)
    if (message.sender_id === currentUserId) {
      console.log('Skipping own message (already handled by confirmed)');
      return;
    }
    
    addMessage({
      ...message,
      status: MessageStatus.DELIVERED
    });
  }, [addMessage, currentUserId]);
  
  // Handle message failure
  const handleMessageFailed = useCallback((data) => {
    if (!mountedRef.current) return;
    
    const { temp_id, error } = data;
    
    updatePendingMessage(temp_id, {
      status: MessageStatus.FAILED,
      error: error
    });
    
    console.error('Message failed:', error);
  }, [updatePendingMessage]);
  
  // Handle chat history (bulk load)
  const handleChatHistory = useCallback((data) => {
    if (!mountedRef.current) return;
    
    console.log('=== CHAT HISTORY RECEIVED ===');
    console.log('session_id:', data.session_id);
    console.log('current sessionId:', sessionId);
    console.log('message count:', data.messages?.length || 0);
    
    const { messages: historyMessages, session_id } = data;
    
    // Only apply if for current session
    if (session_id !== sessionId) {
      console.log('Ignoring history for different session');
      return;
    }
    
    if (historyMessages && Array.isArray(historyMessages)) {
      setMessagesMap(prev => {
        const newMap = new Map(prev);
        
        historyMessages.forEach(msg => {
          const key = msg.message_id;
          if (!newMap.has(key)) {
            newMap.set(key, {
              ...msg,
              status: MessageStatus.DELIVERED
            });
          }
        });
        
        console.log('Messages after history merge:', newMap.size);
        return newMap;
      });
    }
  }, [sessionId]);
  
  // Handle session restored (reconnection)
  const handleSessionRestored = useCallback((data) => {
    if (!mountedRef.current) return;
    
    const { messages: historyMessages, session_id } = data;
    
    if (historyMessages && Array.isArray(historyMessages)) {
      setMessagesMap(() => {
        const newMap = new Map();
        
        historyMessages.forEach(msg => {
          newMap.set(msg.message_id, {
            ...msg,
            status: MessageStatus.DELIVERED
          });
        });
        
        return newMap;
      });
    }
  }, []);
  
  // Handle typing indicators
  const handlePartnerTyping = useCallback(() => {
    if (!mountedRef.current) return;
    setPartnerTyping(true);
    
    // Auto-clear after 3 seconds
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setPartnerTyping(false);
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

  // ========== REGISTER SOCKET LISTENERS ==========
  useEffect(() => {
    if (!socket) return;
    
    // Prevent duplicate listeners
    if (socketIdRef.current === socket.id) return;
    socketIdRef.current = socket.id;

    // Message events
    socket.on('message_confirmed', handleMessageConfirmed);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_failed', handleMessageFailed);
    socket.on('chat_history', handleChatHistory);
    socket.on('session_restored', handleSessionRestored);
    
    // Typing events
    socket.on('partner_typing', handlePartnerTyping);
    socket.on('partner_stopped_typing', handlePartnerStoppedTyping);

    return () => {
      socket.off('message_confirmed', handleMessageConfirmed);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_failed', handleMessageFailed);
      socket.off('chat_history', handleChatHistory);
      socket.off('session_restored', handleSessionRestored);
      socket.off('partner_typing', handlePartnerTyping);
      socket.off('partner_stopped_typing', handlePartnerStoppedTyping);
      socketIdRef.current = null;
    };
  }, [
    socket, 
    handleMessageConfirmed, 
    handleReceiveMessage, 
    handleMessageFailed,
    handleChatHistory,
    handleSessionRestored,
    handlePartnerTyping, 
    handlePartnerStoppedTyping
  ]);

  // ========== SEND MESSAGE ==========
  const sendMessage = useCallback((content) => {
    console.log('=== SEND MESSAGE ===');
    console.log('socket:', socket ? 'connected' : 'disconnected');
    console.log('sessionId:', sessionId);
    console.log('content:', content?.substring(0, 50));
    
    if (!socket || !content.trim() || !sessionId) {
      console.log('BLOCKED: Missing socket, content, or sessionId');
      return;
    }
    
    const trimmedContent = content.trim();
    const tempId = generateUUID();
    const timestamp = new Date().toISOString();
    
    // Create optimistic message
    const optimisticMessage = {
      temp_id: tempId,
      message_id: tempId, // Use temp_id as key until confirmed
      sender_id: currentUserId,
      content: trimmedContent,
      timestamp: timestamp,
      status: MessageStatus.SENDING,
      session_id: sessionId
    };
    
    console.log('Adding optimistic message:', tempId);
    
    // Add to state immediately (optimistic)
    addMessage(optimisticMessage);
    
    // Track as pending
    pendingMessagesRef.current.set(tempId, {
      ...optimisticMessage,
      sentAt: Date.now()
    });
    
    // Emit to server
    console.log('Emitting send_message to server');
    socket.emit('send_message', {
      content: trimmedContent,
      temp_id: tempId,
      session_id: sessionId,
      context_type: contextType
    });
    
    // Set timeout for failure detection (10 seconds)
    setTimeout(() => {
      if (pendingMessagesRef.current.has(tempId)) {
        console.log('Message timeout:', tempId);
        updatePendingMessage(tempId, {
          status: MessageStatus.FAILED,
          error: 'Message timeout'
        });
      }
    }, 10000);
    
  }, [socket, sessionId, currentUserId, contextType, addMessage, updatePendingMessage]);

  // ========== RETRY FAILED MESSAGE ==========
  const retryMessage = useCallback((tempId) => {
    const pending = pendingMessagesRef.current.get(tempId);
    if (!pending) return;
    
    // Update status to sending
    updatePendingMessage(tempId, { status: MessageStatus.SENDING, error: null });
    
    // Re-emit
    socket.emit('send_message', {
      content: pending.content,
      temp_id: tempId,
      session_id: sessionId,
      context_type: contextType
    });
  }, [socket, sessionId, contextType, updatePendingMessage]);

  // ========== TYPING INDICATORS ==========
  const startTyping = useCallback(() => {
    if (!socket) return;
    
    // Debounce to prevent spamming
    if (typingDebounceRef.current) return;
    
    socket.emit('typing_start', { context_type: contextType });
    typingDebounceRef.current = setTimeout(() => {
      typingDebounceRef.current = null;
    }, 1000);
  }, [socket, contextType]);

  const stopTyping = useCallback(() => {
    if (socket) {
      socket.emit('typing_stop', { context_type: contextType });
    }
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }
  }, [socket, contextType]);

  // ========== CLEAR MESSAGES ==========
  const clearMessages = useCallback(() => {
    setMessagesMap(new Map());
    setPartnerTyping(false);
    pendingMessagesRef.current.clear();
  }, []);

  // ========== FETCH HISTORY (manual trigger) ==========
  const fetchHistory = useCallback(() => {
    if (socket && sessionId) {
      socket.emit('fetch_chat_history', { session_id: sessionId, context_type: contextType });
    }
  }, [socket, sessionId, contextType]);

  return {
    messages,
    partnerTyping,
    sendMessage,
    retryMessage,
    startTyping,
    stopTyping,
    clearMessages,
    fetchHistory,
    MessageStatus
  };
};

export default useChat;
