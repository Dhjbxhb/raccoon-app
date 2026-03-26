import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle, X, ChevronDown } from 'lucide-react';
import '@/styles/chat.css';

/**
 * ChatPanel - Premium real-time chat for match sessions
 * 
 * Features:
 * - Real-time messages via WebSocket
 * - Typing indicators
 * - Auto-scroll with "new message" button
 * - Mobile keyboard handling
 * - Collapsible on mobile
 */
const ChatPanel = ({
  messages = [],
  partnerTyping = false,
  partnerUsername = 'Stranger',
  onSendMessage,
  onTypingStart,
  onTypingStop,
  currentUserId,
  isExpanded = true,
  onToggle,
  isMobile = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive (if already at bottom)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    } else if (messages.length > 0) {
      // New message arrived while scrolled up
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender_id !== currentUserId) {
        setUnreadCount(prev => prev + 1);
        setShowScrollButton(true);
      }
    }
  }, [messages, currentUserId]);

  // Handle scroll position changes
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isAtBottom && messages.length > 3);
    
    if (isAtBottom) {
      setUnreadCount(0);
    }
    
    lastScrollTopRef.current = container.scrollTop;
  }, [messages.length]);

  // Scroll to bottom when clicking the button
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
    setUnreadCount(0);
  }, []);

  // Handle typing with debounce
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Start typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTypingStart?.();
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 1.5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTypingStop?.();
      }
    }, 1500);
  }, [isTyping, onTypingStart, onTypingStop]);

  // Handle send message
  const handleSend = useCallback((e) => {
    e?.preventDefault();
    
    const content = inputValue.trim();
    if (!content) return;
    
    onSendMessage?.(content);
    setInputValue('');
    setIsTyping(false);
    onTypingStop?.();
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Scroll to bottom after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [inputValue, onSendMessage, onTypingStop]);

  // Handle Enter key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Format timestamp
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Mobile collapsed view
  if (isMobile && !isExpanded) {
    return (
      <button 
        onClick={onToggle}
        className="chat-panel__toggle"
        data-testid="chat-toggle-collapsed"
      >
        <MessageCircle size={18} />
        {unreadCount > 0 && (
          <span className="chat-panel__badge">{unreadCount}</span>
        )}
      </button>
    );
  }

  return (
    <div 
      className={`chat-panel ${isMobile ? 'chat-panel--mobile' : 'chat-panel--desktop'}`}
      data-testid="chat-panel"
    >
      {/* Header */}
      <div className="chat-panel__header">
        <div className="chat-panel__header-content">
          <MessageCircle size={16} className="text-purple-400" />
          <span className="chat-panel__title">Chat</span>
          <span className="chat-panel__count">{messages.length} messages</span>
        </div>
        {isMobile && (
          <button 
            onClick={onToggle}
            className="chat-panel__close"
            data-testid="chat-close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="chat-panel__messages"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="chat-panel__empty">
            <MessageCircle size={32} className="text-white/20" />
            <p>No messages yet</p>
            <span>Say hello to {partnerUsername}!</span>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === currentUserId;
              const showTime = index === 0 || 
                (index > 0 && new Date(msg.timestamp) - new Date(messages[index - 1].timestamp) > 300000);
              
              return (
                <div key={msg.message_id || index}>
                  {showTime && (
                    <div className="chat-panel__timestamp">
                      {formatTime(msg.timestamp)}
                    </div>
                  )}
                  <div 
                    className={`chat-panel__message ${isOwn ? 'chat-panel__message--own' : 'chat-panel__message--partner'}`}
                    data-testid={`message-${index}`}
                  >
                    <div className="chat-panel__bubble">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {partnerTyping && (
              <div className="chat-panel__message chat-panel__message--partner">
                <div className="chat-panel__typing">
                  <span className="chat-panel__typing-dot" />
                  <span className="chat-panel__typing-dot" />
                  <span className="chat-panel__typing-dot" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button 
          onClick={scrollToBottom}
          className="chat-panel__scroll-btn"
          data-testid="scroll-to-bottom"
        >
          <ChevronDown size={16} />
          {unreadCount > 0 && (
            <span className="chat-panel__scroll-count">{unreadCount} new</span>
          )}
        </button>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="chat-panel__input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="chat-panel__input"
          maxLength={500}
          data-testid="chat-input"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="chat-panel__send"
          data-testid="chat-send"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
