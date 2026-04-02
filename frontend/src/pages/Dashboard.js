import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Zap, Star, User, Sparkles, Crown, Lock, Gamepad2, Calendar, Trophy, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import SpaceBackground from '@/components/background/SpaceBackground';
import { Button } from '@/components/ui/Button';
import { RaccoonLogo } from '@/components/branding/RaccoonLogo';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, isGuest, token, loading } = useAuth();

  const isPremium = user?.premium_status;

  // Calculate premium time remaining
  const getPremiumStatus = () => {
    if (!isPremium) {
      return { status: 'free', text: 'Free Plan', subtext: 'Upgrade to unlock all features' };
    }
    
    const expiresAt = user?.premium_expires_at;
    if (!expiresAt) {
      return { status: 'premium', text: 'Premium Active', subtext: 'Lifetime access' };
    }
    
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiryDate - now;
    
    if (diffMs <= 0) {
      return { status: 'expired', text: 'Premium Expired', subtext: 'Renew to continue' };
    }
    
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      const months = Math.floor(diffDays / 30);
      return { 
        status: 'premium', 
        text: `${months} month${months > 1 ? 's' : ''} remaining`, 
        subtext: `Expires ${expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` 
      };
    }
    
    if (diffDays > 1) {
      return { 
        status: 'premium', 
        text: `${diffDays} days remaining`, 
        subtext: `Expires ${expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` 
      };
    }
    
    return { 
      status: 'expiring', 
      text: 'Expires today!', 
      subtext: 'Renew now to keep access' 
    };
  };

  const premiumInfo = getPremiumStatus();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleStartMatching = () => {
    navigate('/match');
  };

  const handlePremiumFeature = (feature) => {
    if (!isPremium) {
      toast.info(`${feature} is a Premium feature`);
      navigate('/premium');
      return false;
    }
    return true;
  };

  const handleGameClick = (game) => {
    if (!isPremium) {
      handlePremiumFeature(game);
    } else {
      navigate('/match');
    }
  };

  // Wait for auth to load before checking user
  if (loading) {
    return (
      <div className="min-h-screen text-white relative flex items-center justify-center">
        <SpaceBackground intensity="minimal" showNebula={true} showShootingStars={true} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen text-white relative">
      {/* Cinematic space background */}
      <SpaceBackground intensity="minimal" showNebula={true} showShootingStars={true} />

      {/* Content */}
      <div className="relative z-10">
        {/* Navbar */}
        <nav className="px-6 py-6 flex justify-between items-center border-b border-white/5 backdrop-blur-md bg-black/20">
          <div className="flex items-center gap-3">
            <RaccoonLogo size={40} />
            <span className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>RACCOON</span>
          </div>
          <div className="flex items-center gap-4">
            {!user.premium_status && (
              <button
                onClick={() => navigate('/premium')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#4c1d95] rounded-full hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all"
                data-testid="get-premium-btn"
              >
                <Crown size={16} />
                <span style={{ fontFamily: 'Manrope, sans-serif' }}>Get Premium</span>
              </button>
            )}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all"
              data-testid="profile-btn"
            >
              <User size={18} />
              <span style={{ fontFamily: 'Manrope, sans-serif' }}>{user.username}</span>
              {user.premium_status && <Star size={16} className="text-yellow-400 fill-yellow-400" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
              data-testid="logout-button"
            >
              <LogOut size={20} />
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12">
          {/* Welcome Section */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 
              className="text-5xl sm:text-6xl font-black mb-4"
              style={{ 
                fontFamily: 'Outfit, sans-serif',
                background: 'linear-gradient(135deg, #ffffff 0%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Welcome Back{isGuest() ? ' Guest' : ''}, {user.username}!
            </h1>
            <p className="text-xl text-gray-400 mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Ready to meet someone new?
            </p>
            
            {/* Main Action Buttons - Responsive: Stack on mobile, side-by-side on desktop */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md mx-auto">
              {/* Start Matching Button */}
              <Button
                onClick={handleStartMatching}
                size="xl"
                icon={Zap}
                iconPosition="right"
                className="w-full sm:w-auto shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.8)]"
                data-testid="start-matching-button"
              >
                Start Matching
              </Button>
              
              {/* Private Room Button - Outlined Style */}
              <button
                onClick={() => {
                  if (isPremium) {
                    navigate('/private-room');
                  } else {
                    toast.info('Private Rooms require Premium', {
                      description: 'Upgrade to create and join private rooms with friends',
                      action: {
                        label: 'Upgrade',
                        onClick: () => navigate('/premium')
                      }
                    });
                  }
                }}
                className="group relative w-full sm:w-auto h-[52px] px-6 flex items-center justify-center gap-2 bg-transparent border-2 border-purple-500/50 hover:border-purple-500 rounded-xl font-semibold text-white transition-all duration-300 hover:shadow-[0_0_25px_rgba(124,58,237,0.4)] active:scale-95 sm:hover:scale-[1.02]"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                data-testid="private-room-btn"
              >
                <Lock size={18} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
                <span>Private Room</span>
                {!isPremium && (
                  <Crown size={14} className="text-yellow-400 ml-1" />
                )}
              </button>
            </div>
          </div>

          {/* Premium Status Card */}
          <div className="max-w-md mx-auto mb-12" data-testid="premium-status-card">
            <div 
              className={`p-6 backdrop-blur-xl rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] ${
                premiumInfo.status === 'free' 
                  ? 'bg-white/5 border-white/10 hover:border-[#7c3aed]/50' 
                  : premiumInfo.status === 'expiring'
                  ? 'bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 hover:border-orange-500/60'
                  : premiumInfo.status === 'expired'
                  ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                  : 'bg-gradient-to-br from-[#7c3aed]/10 to-[#4c1d95]/10 border-[#7c3aed]/30 hover:border-[#7c3aed]/60'
              }`}
              onClick={() => !isPremium && navigate('/premium')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    premiumInfo.status === 'free'
                      ? 'bg-white/10'
                      : premiumInfo.status === 'expiring' || premiumInfo.status === 'expired'
                      ? 'bg-orange-500/20'
                      : 'bg-gradient-to-br from-[#7c3aed] to-[#4c1d95]'
                  }`}>
                    {premiumInfo.status === 'free' ? (
                      <User size={24} className="text-gray-400" />
                    ) : premiumInfo.status === 'expiring' || premiumInfo.status === 'expired' ? (
                      <Calendar size={24} className="text-orange-400" />
                    ) : (
                      <Crown size={24} className="text-white" />
                    )}
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${
                      premiumInfo.status === 'free' ? 'text-gray-300' : 
                      premiumInfo.status === 'expiring' ? 'text-orange-400' :
                      premiumInfo.status === 'expired' ? 'text-red-400' :
                      'text-white'
                    }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {premiumInfo.text}
                    </p>
                    <p className="text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {premiumInfo.subtext}
                    </p>
                  </div>
                </div>
                {premiumInfo.status === 'free' && (
                  <button 
                    className="px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#4c1d95] rounded-full text-sm font-medium hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all"
                    data-testid="upgrade-now-btn"
                  >
                    Upgrade
                  </button>
                )}
                {(premiumInfo.status === 'expiring' || premiumInfo.status === 'expired') && (
                  <button 
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-sm font-medium hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all"
                    onClick={(e) => { e.stopPropagation(); navigate('/premium'); }}
                    data-testid="renew-now-btn"
                  >
                    Renew
                  </button>
                )}
                {premiumInfo.status === 'premium' && (
                  <Star size={24} className="text-yellow-400 fill-yellow-400" />
                )}
              </div>
            </div>
          </div>

          {/* Games Section */}
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Games
              {!isPremium && (
                <span className="text-sm font-normal text-gray-400 flex items-center gap-1">
                  <Lock size={14} className="text-yellow-400" />
                  Premium only
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Raccoon Feud Card */}
              <div 
                className={`group relative p-8 bg-gradient-to-br from-[#1a237e]/50 to-[#0d1442]/50 backdrop-blur-xl border ${isPremium ? 'border-[#ffd700]/30 hover:border-[#ffd700]/60' : 'border-white/10'} rounded-2xl transition-all cursor-pointer hover:shadow-[0_0_30px_rgba(255,215,0,0.2)]`}
                onClick={() => handleGameClick('Raccoon Feud')}
                data-testid="feud-game-card"
              >
                {!isPremium && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center border border-yellow-400/30">
                    <Lock size={16} className="text-yellow-400" />
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#ffd700] to-[#ff8c00] rounded-2xl flex items-center justify-center">
                    <Trophy size={28} className="text-[#1a237e]" />
                  </div>
                  <span className={`px-3 py-1 ${isPremium ? 'bg-[#ffd700]/20 text-[#ffd700]' : 'bg-yellow-500/10 text-yellow-500/60'} rounded-full text-xs font-bold`}>
                    {isPremium ? 'PLAY NOW' : 'PREMIUM'}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Raccoon Feud</h3>
                <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {isPremium ? 'Race to type answers first! Fast-paced typing competition.' : 'Unlock with Premium to play!'}
                </p>
                <div className="mt-4 flex items-center gap-2 text-[#ffd700]/60 text-sm">
                  <span>Speed Mode</span>
                  <span>•</span>
                  <span>2 Players</span>
                </div>
              </div>
              
              {/* Raccoon UNO Card */}
              <div 
                className={`group relative p-8 bg-gradient-to-br from-[#7c3aed]/40 to-[#5b21b6]/40 backdrop-blur-xl border ${isPremium ? 'border-purple-500/30 hover:border-purple-500/60' : 'border-white/10'} rounded-2xl transition-all cursor-pointer hover:shadow-[0_0_30px_rgba(124,58,237,0.3)]`}
                onClick={() => handleGameClick('UNO')}
                data-testid="uno-game-card"
              >
                {!isPremium && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center border border-yellow-400/30">
                    <Lock size={16} className="text-yellow-400" />
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] rounded-2xl flex items-center justify-center text-2xl">
                    🦝
                  </div>
                  <span className={`px-3 py-1 ${isPremium ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/10 text-yellow-500/60'} rounded-full text-xs font-bold`}>
                    {isPremium ? 'PLAY NOW' : 'PREMIUM'}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Raccoon UNO</h3>
                <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {isPremium ? 'Classic card game with a raccoon twist!' : 'Unlock with Premium to play!'}
                </p>
                <div className="mt-4 flex items-center gap-2 text-purple-500/60 text-sm">
                  <span>🎴 Card Game</span>
                  <span>•</span>
                  <span>2 Players</span>
                </div>
              </div>
              
              {/* Draw & Guess Card */}
              <div 
                className={`group relative p-8 bg-gradient-to-br from-[#06b6d4]/40 to-[#0891b2]/40 backdrop-blur-xl border ${isPremium ? 'border-cyan-500/30 hover:border-cyan-500/60' : 'border-white/10'} rounded-2xl transition-all cursor-pointer hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]`}
                onClick={() => handleGameClick('Draw & Guess')}
                data-testid="draw-game-card"
              >
                {!isPremium && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center border border-yellow-400/30">
                    <Lock size={16} className="text-yellow-400" />
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#06b6d4] to-[#22d3ee] rounded-2xl flex items-center justify-center">
                    <Pencil size={28} className="text-white" />
                  </div>
                  <span className={`px-3 py-1 ${isPremium ? 'bg-cyan-500/20 text-cyan-400' : 'bg-yellow-500/10 text-yellow-500/60'} rounded-full text-xs font-bold`}>
                    {isPremium ? 'PLAY NOW' : 'PREMIUM'}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Draw & Guess</h3>
                <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {isPremium ? 'Draw and guess words in real-time!' : 'Unlock with Premium to play!'}
                </p>
                <div className="mt-4 flex items-center gap-2 text-cyan-500/60 text-sm">
                  <span>✏️ Drawing Game</span>
                  <span>•</span>
                  <span>2 Players</span>
                </div>
              </div>
            </div>

            {/* Premium Upgrade Banner (shown for non-premium users) */}
            {!isPremium && (
              <button
                onClick={() => navigate('/premium')}
                className="mt-8 w-full p-6 bg-gradient-to-r from-[#7c3aed]/20 to-[#4c1d95]/20 border border-[#7c3aed]/40 rounded-2xl hover:border-[#7c3aed]/60 transition-all text-center hover:scale-[1.01] group"
                data-testid="upgrade-banner"
              >
                <div className="flex items-center justify-center gap-3">
                  <Crown size={24} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xl font-bold text-[#a78bfa]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Unlock All Premium Features
                  </span>
                </div>
                <p className="text-gray-400 mt-2 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Get access to games, filters, and more!
                </p>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
