import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';

/**
 * Test page to demonstrate the improved chat UI
 * Shows the premium chat styling with rounded bubbles, better spacing, and glow effects
 */
const ChatTest = () => {
  const navigate = useNavigate();
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender_id: 'other', content: 'Hey! How are you?' },
    { id: 2, sender_id: 'me', content: 'I\'m good! This chat UI looks amazing!' },
    { id: 3, sender_id: 'other', content: 'Right? The glow effects are so cool' },
    { id: 4, sender_id: 'me', content: 'Love the rounded bubbles and spacing too' },
    { id: 5, sender_id: 'other', content: 'The gradient on your messages is perfect' },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender_id: 'me',
      content: messageInput,
    };

    setMessages([...messages, newMessage]);
    setMessageInput('');

    // Simulate partner typing and response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender_id: 'other',
        content: 'Nice message! This chat is really smooth!',
      }]);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft size={20} className="text-white/60" />
          </button>
          <h1 className="text-base sm:text-lg font-bold">Chat UI Test</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 pt-16 pb-4 px-3 sm:px-4 overflow-hidden">
        <div className="max-w-2xl mx-auto h-full flex flex-col">
          {/* Chat container - Premium styling */}
          <div className="flex-1 bg-gradient-to-br from-black/90 to-[#0a0a15]/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col min-h-0">
            {/* Chat header */}
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-white/5 bg-white/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-[#7c3aed]" />
                <span className="text-xs sm:text-sm font-medium text-gray-300">Chat with Stranger</span>
                <span className="text-xs text-gray-500">• {messages.length} messages</span>
              </div>
            </div>
            
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 min-h-0">
              {messages.map((msg, index) => {
                const isOwn = msg.sender_id === 'me';
                return (
                  <div 
                    key={msg.id} 
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div 
                      className={`max-w-[85%] sm:max-w-[80%] px-4 sm:px-5 py-2.5 sm:py-3 text-sm leading-relaxed transition-all ${
                        isOwn
                          ? 'bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white rounded-2xl rounded-br-md shadow-[0_2px_12px_rgba(124,58,237,0.35)]'
                          : 'bg-white/10 text-white rounded-2xl rounded-bl-md border border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-white/10 rounded-2xl rounded-bl-md border border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-[#c084fc] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input - Mobile optimized with safe area */}
          <div className="mt-3 sm:mt-4 pb-safe flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 focus:border-[#7c3aed]/50 focus:bg-white/8 rounded-xl sm:rounded-2xl h-12 sm:h-14 px-4 sm:px-6 text-white placeholder:text-gray-500 outline-none text-sm sm:text-base transition-all shadow-inner"
                data-testid="message-input"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="px-4 sm:px-6 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#8b5cf6] hover:to-[#7c3aed] rounded-xl sm:rounded-2xl disabled:opacity-40 disabled:hover:from-[#7c3aed] disabled:hover:to-[#6d28d9] transition-all font-medium shadow-[0_2px_12px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.4)]"
                data-testid="send-button"
              >
                <Send size={18} className="sm:w-5 sm:h-5" />
              </button>
            </form>
          </div>

          {/* Info text - Hidden on small screens */}
          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500 hidden sm:block">
            <p>Send a message to see the typing indicator and auto-response</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 8px);
        }
      `}</style>
    </div>
  );
};

export default ChatTest;
