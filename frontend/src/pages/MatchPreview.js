import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, Filter, MessageCircle, Gamepad } from 'lucide-react';
import MatchTopBar from '@/components/match/MatchTopBar';
import ReportModal from '@/components/match/ReportModal';
import ChatPanel from '@/components/match/ChatPanel';
import CameraFilters from '@/components/match/CameraFilters';
import FeudGame from '@/components/games/FeudGame';
import TruthOrDare from '@/components/games/TruthOrDare';
import { VIDEO_FILTERS, getCSSFilter } from '@/utils/videoFilters';
import '@/styles/match.css';
import '@/styles/chat.css';
import '@/styles/filters.css';
import '@/styles/games.css';

/**
 * MatchPreview - Static preview of the Match page layout
 * Used for testing/demonstrating the video panel positions and chat
 */
const MatchPreview = () => {
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showCameraFilters, setShowCameraFilters] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('none');
  const [showFeud, setShowFeud] = useState(false);
  const [showTod, setShowTod] = useState(false);
  
  // Mock partner data
  const partner = {
    username: 'CoolRaccoon42',
    country: 'United States',
    country_code: 'US',
    premium: true,
    verified: true,
    guest_id: 'mock-user-for-preview'
  };

  // Mock messages for preview
  const mockMessages = [
    { message_id: '1', sender_id: 'mock-user-for-preview', content: "Hey! Nice to meet you 🦝", timestamp: new Date(Date.now() - 300000).toISOString() },
    { message_id: '2', sender_id: 'my-user-id', content: "Hi! You too! Where are you from?", timestamp: new Date(Date.now() - 240000).toISOString() },
    { message_id: '3', sender_id: 'mock-user-for-preview', content: "I'm from the US! How about you?", timestamp: new Date(Date.now() - 180000).toISOString() },
    { message_id: '4', sender_id: 'my-user-id', content: "Cool! I'm from here too 😄", timestamp: new Date(Date.now() - 120000).toISOString() },
    { message_id: '5', sender_id: 'mock-user-for-preview', content: "Want to play a game?", timestamp: new Date(Date.now() - 60000).toISOString() },
  ];

  return (
    <div className="match-container" data-testid="match-preview">
      {/* ===== TOP BAR ===== */}
      <MatchTopBar
        partner={partner}
        sessionDuration={127}
        onReport={() => setShowReportModal(true)}
        onSkip={() => alert('Skip clicked')}
        onBack={() => navigate('/dashboard')}
      />

      {/* ===== VIDEO AREA ===== */}
      <div className="match-videos">
        
        {/* LOCAL VIDEO PANEL (Me) - LEFT on desktop, BOTTOM on mobile */}
        <div className="video-panel video-panel--local" data-testid="local-video-panel">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] flex items-center justify-center"
            style={{ filter: getCSSFilter(currentFilter) }}
          >
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#7c3aed]/30 to-[#4c1d95]/30 flex items-center justify-center border-2 border-[#7c3aed]/30">
                <span className="text-4xl">👤</span>
              </div>
              <p className="text-white font-bold text-lg">YOUR VIDEO</p>
              <p className="text-gray-500 text-sm mt-1">Camera preview</p>
              <p className="text-[#7c3aed] text-xs mt-2">Filter: {VIDEO_FILTERS[currentFilter]?.name}</p>
            </div>
          </div>
          
          <div className="video-panel__label video-panel__label--top-left">
            <div className="video-panel__indicator bg-green-500" />
            <span>You</span>
          </div>

          {/* Active Filter Badge */}
          {currentFilter !== 'none' && (
            <div className="video-panel__filter-badge">
              <span>{VIDEO_FILTERS[currentFilter]?.icon}</span>
              <span>{VIDEO_FILTERS[currentFilter]?.name}</span>
            </div>
          )}

          <div className="video-panel__filter-controls">
            {showCameraFilters ? (
              <CameraFilters
                currentFilter={currentFilter}
                onFilterChange={setCurrentFilter}
                isPremium={true}
                visible={true}
                onClose={() => setShowCameraFilters(false)}
              />
            ) : (
              <button 
                className={`video-panel__filter-btn ${currentFilter !== 'none' ? 'video-panel__filter-btn--active' : ''}`}
                onClick={() => setShowCameraFilters(true)}
              >
                <Sparkles size={22} />
              </button>
            )}
          </div>
        </div>

        {/* REMOTE VIDEO PANEL (Stranger) - RIGHT on desktop, TOP on mobile */}
        <div className="video-panel video-panel--remote" data-testid="remote-video-panel">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-700/30 flex items-center justify-center border-2 border-blue-500/30">
                <span className="text-4xl">🦝</span>
              </div>
              <p className="text-white font-bold text-lg">STRANGER VIDEO</p>
              <p className="text-gray-500 text-sm mt-1">{partner.username}</p>
              <p className="text-blue-400 text-xs mt-2">Desktop: RIGHT | Mobile: TOP</p>
            </div>
          </div>

          <div className="video-panel__label video-panel__label--top-right">
            <div className="video-panel__indicator bg-blue-500" />
            <span>{partner.username}</span>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM ACTION BAR ===== */}
      <div className="match-bottombar">
        <div className="match-bottombar__content">
          <div className="match-bottombar__games">
            <div className="match-bottombar__game-btns">
              <button className="match-bottombar__game-btn">
                <Filter size={12} />
                <span className="hidden xs:inline">Filters</span>
              </button>
              <button className="match-bottombar__game-btn">
                <Trophy size={12} />
                <span>Feud</span>
                <span className="text-yellow-400 text-[10px]">👑</span>
              </button>
              <button className="match-bottombar__game-btn">
                <Sparkles size={12} />
                <span>T/D</span>
                <span className="text-yellow-400 text-[10px]">👑</span>
              </button>
            </div>

            <button 
              onClick={() => setShowChat(!showChat)}
              className={`match-bottombar__chat-toggle ${showChat ? 'match-bottombar__chat-toggle--active' : ''}`}
              data-testid="chat-toggle"
            >
              <MessageCircle size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== CHAT PANEL ===== */}
      {showChat && (
        <ChatPanel
          messages={mockMessages}
          partnerTyping={true}
          partnerUsername={partner.username}
          onSendMessage={(msg) => console.log('Send:', msg)}
          onTypingStart={() => console.log('Typing start')}
          onTypingStop={() => console.log('Typing stop')}
          currentUserId="my-user-id"
          isExpanded={showChat}
          onToggle={() => setShowChat(!showChat)}
          isMobile={false}
        />
      )}

      {/* Game Buttons */}
      <div className="fixed bottom-4 right-4 z-30 flex gap-2">
        <button
          onClick={() => { setShowFeud(!showFeud); setShowTod(false); }}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${showFeud ? 'bg-[#ffd700] text-[#1a237e]' : 'bg-black/80 text-white hover:bg-[#ffd700]/20'}`}
          data-testid="toggle-feud-btn"
        >
          🦝 Raccoon Feud
        </button>
        <button
          onClick={() => { setShowTod(!showTod); setShowFeud(false); }}
          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${showTod ? 'bg-pink-500 text-white' : 'bg-black/80 text-white hover:bg-pink-500/20'}`}
          data-testid="toggle-tod-btn"
        >
          🍾 Truth or Dare
        </button>
      </div>

      {/* Layout Info Overlay - lower z-index on mobile */}
      <div className="fixed bottom-4 left-4 z-20 px-4 py-3 bg-black/90 backdrop-blur-sm rounded-xl border border-white/10 text-xs max-w-[200px] lg:max-w-none">
        <p className="text-white font-bold mb-1">Layout Preview Mode</p>
        <p className="text-gray-400">
          Desktop: Left=Me, Right=Stranger<br/>
          Mobile: Top=Stranger, Bottom=Me
        </p>
      </div>

      {/* Feud Game (Mock - no socket) */}
      {showFeud && (
        <div className="fixed top-[4rem] left-4 z-40 w-96 h-[70vh] rounded-xl overflow-hidden">
          <FeudGame
            isOpen={showFeud}
            onClose={() => setShowFeud(false)}
            socket={null}
            myUserId="preview-user"
            partnerUsername={partner.username}
            sessionId="preview-session"
          />
        </div>
      )}

      {/* Truth or Dare (Mock - no socket) */}
      {showTod && (
        <div className="fixed top-[4rem] left-4 z-40 w-96 h-[70vh] rounded-xl overflow-hidden">
          <TruthOrDare
            isOpen={showTod}
            onClose={() => setShowTod(false)}
            socket={null}
            myUserId="preview-user"
            partnerUsername={partner.username}
            sessionId="preview-session"
            isMobile={false}
          />
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal 
          partner={partner}
          sessionId={null}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default MatchPreview;
