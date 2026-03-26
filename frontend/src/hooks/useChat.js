import { useState, useEffect, useCallback, useRef } from 'react';

export const useChat = (socket, sessionId) => {
  const [messages, setMessages] = useState([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const prevSessionIdRef = useRef(null);
  
  // Clear messages when session changes
  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      setMessages([]);
      setPartnerTyping(false);
      prevSessionIdRef.current = sessionId;
    }
  }, [sessionId]);
  
  useEffect(() => {
    if (!socket) return;

    const onReceiveMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    const onPartnerTyping = () => {
      setPartnerTyping(true);
    };

    const onPartnerStoppedTyping = () => {
      setPartnerTyping(false);
    };

    socket.on('receive_message', onReceiveMessage);
    socket.on('partner_typing', onPartnerTyping);
    socket.on('partner_stopped_typing', onPartnerStoppedTyping);

    return () => {
      socket.off('receive_message', onReceiveMessage);
      socket.off('partner_typing', onPartnerTyping);
      socket.off('partner_stopped_typing', onPartnerStoppedTyping);
    };
  }, [socket]);

  const sendMessage = useCallback((content) => {
    if (socket && content.trim()) {
      socket.emit('send_message', { content: content.trim() });
    }
  }, [socket]);

  const startTyping = useCallback(() => {
    if (socket) {
      socket.emit('typing_start');
    }
  }, [socket]);

  const stopTyping = useCallback(() => {
    if (socket) {
      socket.emit('typing_stop');
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
