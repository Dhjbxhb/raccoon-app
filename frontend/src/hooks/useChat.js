import { useState, useEffect, useCallback } from 'react';

export const useChat = (socket, sessionId) => {
  const [messages, setMessages] = useState([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  
  useEffect(() => {
    if (!socket || !sessionId) return;

    socket.on('receive_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('partner_typing', () => {
      setPartnerTyping(true);
    });

    socket.on('partner_stopped_typing', () => {
      setPartnerTyping(false);
    });

    return () => {
      socket.off('receive_message');
      socket.off('partner_typing');
      socket.off('partner_stopped_typing');
    };
  }, [socket, sessionId]);

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

  return {
    messages,
    partnerTyping,
    sendMessage,
    startTyping,
    stopTyping
  };
};
