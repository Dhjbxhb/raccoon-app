import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useMatching } from '@/hooks/useMatching';
import { useChat } from '@/hooks/useChat';
import { toast } from 'sonner';
import { ArrowLeft, Send, SkipForward, Ban, Loader2, Star, Globe, Trophy, Sparkles, Gamepad2 } from 'lucide-react';

// Raccoon facts for the loading screen
const RACCOON_FACTS = [
  "Raccoons are extremely intelligent animals",
  "They can remember solutions for up to 3 years",
  "Raccoons have very sensitive hands like humans",
  "They are great problem solvers",
  "Raccoons can run up to 15 mph",
  "Their name means 'one who scratches with hands'",
  "They can rotate their back feet 180 degrees",
  "Raccoons have excellent night vision",
  "Baby raccoons are called 'kits'",
  "They wash their food before eating it",
  "Raccoons are mostly nocturnal creatures",
  "They can make over 50 different sounds",
  "A group of raccoons is called a 'gaze'",
  "They're native to North America",
  "Raccoons can live up to 20 years in captivity"
];

const Match = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const { state, partner, sessionId, startMatching, skipMatch, blockUser } = useMatching(socket);
  const { messages, partnerTyping, sendMessage, startTyping, stopTyping } = useChat(socket, sessionId);
  
  const [messageInput, setMessageInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [currentFact, setCurrentFact] = useState(0);
  const [factVisible, setFactVisible] = useState(true);
  const [showGames, setShowGames] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (state === 'idle' && user) {
      startMatching('any');
    }
  }, [state, user]);

  // Rotate raccoon facts every 3 seconds
  useEffect(() => {
    if (state !== 'searching') return;
    
    const interval = setInterval(() => {
      setFactVisible(false);
      setTimeout(() => {
        setCurrentFact(prev => (prev + 1) % RACCOON_FACTS.length);
        setFactVisible(true);
      }, 300);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [state]);

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

  // Connecting state
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

  // Searching state - enhanced UI
  if (state === 'searching') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, rgba(124,58,237,0.1) 40%, transparent 70%)',
              animation: 'pulse 4s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 60%)',
              animation: 'pulse 4s ease-in-out infinite 1s'
            }}
          />
        </div>

        {/* Back button - subtle */}
        <button
          onClick={() => navigate('/dashboard')}
          className="absolute top-6 left-6 p-3 hover:bg-white/10 rounded-full transition-all z-20"
          data-testid="back-button"
        >
          <ArrowLeft size={24} className="text-white/60" />
        </button>

        {/* Main content */}
        <div className="relative z-10 text-center px-6">
          {/* Main Raccoon - clean, centered */}
          <div className="relative mb-10">
            {/* Outer glow ring */}
            <div 
              className="absolute inset-0 -m-8 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
                filter: 'blur(40px)',
                animation: 'pulse 3s ease-in-out infinite'
              }}
            />
            
            {/* Inner glow */}
            <div 
              className="absolute inset-0 -m-4 rounded-full bg-[#7c3aed]/20"
              style={{ filter: 'blur(30px)' }}
            />
            
            {/* Raccoon image */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto overflow-hidden rounded-2xl">
              <img 
                src="https://customer-assets.emergentagent.com/job_realtime-raccoon/artifacts/818jgnvw_Screenshot%202026-03-22%20at%202.50.16%E2%80%AFPM.png"
                alt="Cool Raccoon"
                className="relative z-10 w-full h-full object-cover scale-125"
                style={{
                  animation: 'float 3s ease-in-out infinite',
                  filter: 'drop-shadow(0 0 30px rgba(124,58,237,0.5))',
                  objectPosition: 'center 30%'
                }}
              />
            </div>
          </div>

          {/* Title */}
          <h2 
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ 
              fontFamily: 'Outfit, sans-serif',
              textShadow: '0 0 30px rgba(124,58,237,0.5)'
            }}
          >
            Finding a Match...
          </h2>

          {/* Rotating facts with fade animation */}
          <div className="h-8 mb-8">
            <p 
              className="text-gray-400 text-base sm:text-lg transition-all duration-300"
              style={{ 
                fontFamily: 'Manrope, sans-serif',
                opacity: factVisible ? 1 : 0,
                transform: factVisible ? 'translateY(0)' : 'translateY(10px)'
              }}
            >
              {RACCOON_FACTS[currentFact]}
            </p>
          </div>

          {/* Raccoon emoji wave */}
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <span 
                key={i}
                className="text-2xl"
                style={{ 
                  animation: 'raccoonWave 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`
                }}
              >
                🦝
              </span>
            ))}
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
          }
          @keyframes raccoonWave {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    );
  }

  // Matched state - Chat UI
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 backdrop-blur-md bg-black/50">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/10 rounded-full transition-all"
            data-testid="back-button"
          >
            <ArrowLeft size={20} />
          </button>
          
          {partner && (
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

      {/* Chat Area */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch justify-center p-6 gap-6">
        {/* Game Sidebar */}
        <div className={`${showGames ? 'flex' : 'hidden lg:flex'} flex-col w-full lg:w-72 gap-4`}>
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Gamepad2 size={20} className="text-[#7c3aed]" />
            Play Together
          </h3>
          
          {/* Raccoon Feud */}
          <button
            onClick={() => navigate('/game/feud')}
            className="p-4 bg-gradient-to-br from-[#1a237e]/50 to-[#0d1442]/50 border border-[#ffd700]/30 rounded-xl hover:border-[#ffd700]/60 transition-all text-left group"
            data-testid="play-feud-btn"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ffd700] to-[#ff8c00] rounded-lg flex items-center justify-center">
                <Trophy size={20} className="text-[#1a237e]" />
              </div>
              <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Raccoon Feud</span>
            </div>
            <p className="text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Guess the top answers!
            </p>
          </button>
          
          {/* Truth or Dare */}
          <button
            onClick={() => navigate('/game/truth-or-dare')}
            className="p-4 bg-gradient-to-br from-[#4a1a6b]/50 to-[#2d1b4e]/50 border border-pink-500/30 rounded-xl hover:border-pink-500/60 transition-all text-left group"
            data-testid="play-tod-btn"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Truth or Dare</span>
            </div>
            <p className="text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Spin the bottle!
            </p>
          </button>
          
          {/* Mobile toggle */}
          <button
            onClick={() => setShowGames(false)}
            className="lg:hidden mt-2 text-center text-gray-400 text-sm"
          >
            Back to Chat
          </button>
        </div>

        {/* Chat Box */}
        <div className={`${showGames ? 'hidden lg:flex' : 'flex'} flex-col w-full max-w-4xl h-[600px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden`}>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
            {messages.length === 0 && partner && (
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
              {/* Mobile game toggle */}
              <button
                type="button"
                onClick={() => setShowGames(true)}
                className="lg:hidden p-3 bg-[#7c3aed]/20 hover:bg-[#7c3aed]/30 rounded-xl transition-all"
              >
                <Gamepad2 size={20} className="text-[#7c3aed]" />
              </button>
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
      </div>
    </div>
  );
};

export default Match;
