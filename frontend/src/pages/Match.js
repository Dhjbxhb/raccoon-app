import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useMatching } from '@/hooks/useMatching';
import { useChat } from '@/hooks/useChat';
import { toast } from 'sonner';
import { ArrowLeft, Send, SkipForward, Ban, Loader2, Star, Globe } from 'lucide-react';

const Match = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const { state, partner, sessionId, startMatching, skipMatch, blockUser } = useMatching(socket);
  const { messages, partnerTyping, sendMessage, startTyping, stopTyping } = useChat(socket, sessionId);
  
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Auto-scroll to latest message
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (state === 'idle' && user) {
      // Auto-start matching
      startMatching('any');
    }
  }, [state, user]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput);
      setMessageInput('');
      stopTyping();
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    
    // Typing indicator logic
    if (!typingTimeout) {
      startTyping();
    }
    
    clearTimeout(typingTimeout);
    const timeout = setTimeout(() => {
      stopTyping();
      setTypingTimeout(null);
    }, 1000);
    
    setTypingTimeout(timeout);
  };

  const handleSkip = () => {
    skipMatch();
    toast.info('Skipped to next match');
  };

  const handleBlock = () => {
    if (window.confirm('Block this user? You won\'t be matched again.')) {
      blockUser();
      toast.success('User blocked');
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#7c3aed] animate-spin mx-auto mb-4" />
          <p className="text-white text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Connecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 backdrop-blur-md bg-black/50">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
              data-testid="back-button"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#2a1f4d]">
                <img 
                  src="https://customer-assets.emergentagent.com/job_realtime-raccoon/artifacts/0yj4w3zp_Screenshot%202026-03-22%20at%202.49.55%E2%80%AFPM.png"
                  alt="Raccoon"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>RACCOON</span>
            </div>
          </div>
          
          {state === 'matched' && partner && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {partner.username}
                  </span>
                  {partner.premium && <Star size={16} className="text-yellow-400 fill-yellow-400" />}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Globe size={12} />
                  <span>{partner.country}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center gap-2"
                  data-testid="skip-button"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <SkipForward size={18} />
                  Skip
                </button>
                <button
                  onClick={handleBlock}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all flex items-center gap-2"
                  data-testid="block-button"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <Ban size={18} />
                  Block
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {state === 'searching' && (
          <div className="text-center">
            <div className="mb-8 relative">
              <div className="w-80 h-80 mx-auto relative">
                {/* Pulsing purple glow */}
                <div className="absolute inset-0 bg-[#7c3aed]/20 rounded-full animate-ping" />
                {/* YOUR Cool Raccoon */}
                <img 
                  src="https://customer-assets.emergentagent.com/job_realtime-raccoon/artifacts/0yj4w3zp_Screenshot%202026-03-22%20at%202.49.55%E2%80%AFPM.png"
                  alt="Searching Raccoon"
                  className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
                  style={{
                    animation: 'float 3s ease-in-out infinite'
                  }}
                />
                {/* Purple glow behind */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7c3aed]/30 blur-[100px] rounded-full -z-10" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Finding a Match...
            </h2>
            <p className="text-gray-400 text-lg mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Looking for someone cool to chat with
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-[#7c3aed] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {state === 'matched' && partner && (
          <div className="w-full max-w-4xl h-[600px] flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <p style={{ fontFamily: 'Manrope, sans-serif' }}>Say hi to {partner.username}! 👋</p>
                </div>
              )}
              
              {messages.map((msg, index) => {
                const isOwn = msg.sender_id === user.user_id || msg.sender_id === user.guest_id;
                return (
                  <div
                    key={index}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                        isOwn
                          ? 'bg-[#7c3aed] text-white'
                          : 'bg-white/10 text-white'
                      }`}
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      {!isOwn && (
                        <div className="flex items-center gap-1 mb-1 text-xs text-gray-300">
                          <span className="font-semibold">{msg.sender_username}</span>
                          {msg.premium && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                        </div>
                      )}
                      <p className="break-words">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              
              {partnerTyping && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 bg-white/10 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 bg-black/50 border border-white/10 focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/50 rounded-xl h-12 px-4 text-white placeholder:text-white/30 outline-none transition-all"
                  data-testid="message-input"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="px-6 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.4)]"
                  data-testid="send-button"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <Send size={18} />
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Match;
