import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Zap, Star, User, Clock, TrendingUp, Trophy, Sparkles, Crown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import SpaceBackground from '@/components/background/SpaceBackground';
import { Button } from '@/components/ui/Button';
import { RaccoonLogo } from '@/components/branding/RaccoonLogo';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, isGuest } = useAuth();

  const isPremium = user?.premium_status;

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
            
            {/* Start Matching Button */}
            <Button
              onClick={handleStartMatching}
              size="xl"
              icon={Zap}
              iconPosition="right"
              className="shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.8)]"
              data-testid="start-matching-button"
            >
              Start Matching
            </Button>
          </div>

          {/* Stats Grid */}
          {!isGuest() && (
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-[#7c3aed]/50 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#7c3aed]/20 rounded-lg flex items-center justify-center">
                    <TrendingUp size={20} className="text-[#7c3aed]" />
                  </div>
                  <span className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{user.total_sessions || 0}</span>
                </div>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Total Sessions</p>
              </div>

              <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-[#10b981]/50 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#10b981]/20 rounded-lg flex items-center justify-center">
                    <Clock size={20} className="text-[#10b981]" />
                  </div>
                  <span className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{Math.floor((user.total_time_spent || 0) / 60)}m</span>
                </div>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Time Spent</p>
              </div>

              <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-[#f43f5e]/50 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#f43f5e]/20 rounded-lg flex items-center justify-center">
                    <Star size={20} className="text-[#f43f5e]" />
                  </div>
                  <span className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{user.premium_status ? 'Premium' : 'Free'}</span>
                </div>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Account Status</p>
              </div>
            </div>
          )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  {isPremium ? 'Guess the top answers and compete with your match!' : 'Unlock with Premium to play!'}
                </p>
                <div className="mt-4 flex items-center gap-2 text-[#ffd700]/60 text-sm">
                  <span>🎯 Survey Says Style</span>
                  <span>•</span>
                  <span>2 Players</span>
                </div>
              </div>

              {/* Truth or Dare Card */}
              <div 
                className={`group relative p-8 bg-gradient-to-br from-[#4a1a6b]/50 to-[#2d1b4e]/50 backdrop-blur-xl border ${isPremium ? 'border-pink-500/30 hover:border-pink-500/60' : 'border-white/10'} rounded-2xl transition-all cursor-pointer hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]`}
                onClick={() => handleGameClick('Truth or Dare')}
                data-testid="tod-game-card"
              >
                {!isPremium && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center border border-yellow-400/30">
                    <Lock size={16} className="text-yellow-400" />
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Sparkles size={28} className="text-white" />
                  </div>
                  <span className={`px-3 py-1 ${isPremium ? 'bg-pink-500/20 text-pink-400' : 'bg-yellow-500/10 text-yellow-500/60'} rounded-full text-xs font-bold`}>
                    {isPremium ? 'PLAY NOW' : 'PREMIUM'}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Truth or Dare</h3>
                <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {isPremium ? 'Spin the bottle and challenge your match!' : 'Unlock with Premium to play!'}
                </p>
                <div className="mt-4 flex items-center gap-2 text-pink-500/60 text-sm">
                  <span>🍾 Bottle Spin</span>
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
