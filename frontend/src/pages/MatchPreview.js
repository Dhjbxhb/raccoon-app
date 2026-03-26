import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Trophy, Sparkles, Filter, MessageCircle } from 'lucide-react';
import MatchTopBar from '@/components/match/MatchTopBar';
import ReportModal from '@/components/match/ReportModal';
import '@/styles/match.css';

/**
 * MatchPreview - Static preview of the Match page layout
 * Used for testing/demonstrating the video panel positions
 */
const MatchPreview = () => {
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Mock partner data
  const partner = {
    username: 'CoolRaccoon42',
    country: 'United States',
    country_code: 'US',
    premium: true,
    verified: true,
    guest_id: 'mock-user-for-preview'
  };

  return (
    <div className="match-container" data-testid="match-preview">
      {/* ===== TOP BAR - Using the component ===== */}
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
          {/* Placeholder for "You" video */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#7c3aed]/30 to-[#4c1d95]/30 flex items-center justify-center border-2 border-[#7c3aed]/30">
                <span className="text-4xl">👤</span>
              </div>
              <p className="text-white font-bold text-lg">YOUR VIDEO</p>
              <p className="text-gray-500 text-sm mt-1">Camera preview</p>
              <p className="text-[#7c3aed] text-xs mt-2">Desktop: LEFT | Mobile: BOTTOM</p>
            </div>
          </div>
          
          <div className="video-panel__label video-panel__label--top-left">
            <div className="video-panel__indicator bg-green-500" />
            <span>You</span>
          </div>

          <div className="video-panel__filter-controls">
            <button className="video-panel__filter-btn">
              <Sparkles size={22} />
            </button>
          </div>
        </div>

        {/* REMOTE VIDEO PANEL (Stranger) - RIGHT on desktop, TOP on mobile */}
        <div className="video-panel video-panel--remote" data-testid="remote-video-panel">
          {/* Placeholder for "Stranger" video */}
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

            <button className="match-bottombar__chat-toggle match-bottombar__chat-toggle--active">
              <MessageCircle size={16} />
            </button>
          </div>

          <form className="match-bottombar__chat" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Type a message..."
              className="match-bottombar__input"
            />
            <button type="submit" className="match-bottombar__send">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Layout Info Overlay */}
      <div className="fixed bottom-4 left-4 z-40 px-4 py-3 bg-black/90 backdrop-blur-sm rounded-xl border border-white/10 text-xs">
        <p className="text-white font-bold mb-1">Layout Preview Mode</p>
        <p className="text-gray-400">
          Desktop: Left=Me, Right=Stranger<br/>
          Mobile: Top=Stranger, Bottom=Me
        </p>
      </div>

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
