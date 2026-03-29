import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ArrowLeft, User, Mail, Globe, Calendar, Star, Shield,
  TrendingUp, Clock, Gamepad2, Trophy, Settings, LogOut, Crown
} from 'lucide-react';
import SpaceBackground from '@/components/background/SpaceBackground';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, isGuest, token, refreshUser } = useAuth();
  const [fullUserData, setFullUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch full user data including stats and premium status
    const fetchFullData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/stats/full`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setFullUserData(data);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFullData();

    // Start heartbeat for time tracking
    const sendHeartbeat = async () => {
      try {
        await fetch(`${API_URL}/api/stats/heartbeat`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    };

    // Send heartbeat every 30 seconds
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);
    sendHeartbeat(); // Send immediately

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [user, navigate, token]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeSpent = (seconds) => {
    if (!seconds || seconds === 0) return '0m';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  };

  // Use fullUserData if available, otherwise fall back to user from context
  const stats = fullUserData?.stats || {
    total_sessions: user.total_sessions || 0,
    total_time_spent: user.total_time_spent || 0,
    games_played: user.games_played || 0,
    games_won: user.games_won || 0
  };

  const premium = fullUserData?.premium || {
    is_premium: user.premium_status || false,
    plan_name: null,
    expiry_date: null,
    days_remaining: null,
    time_remaining_formatted: null,
    is_lifetime: false,
    is_expired: false
  };

  const displayUser = fullUserData || user;

  return (
    <div className="min-h-screen text-white relative">
      {/* Cinematic space background */}
      <SpaceBackground intensity="minimal" showNebula={true} showRedGlow={true} showShootingStars={false} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 backdrop-blur-md bg-black/50">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-white/10 rounded-full transition-all"
                data-testid="back-to-dashboard-btn"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Profile</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl transition-all"
              data-testid="logout-btn"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12 max-w-4xl">
          {/* Profile Header */}
          <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-full flex items-center justify-center text-5xl">
                  {displayUser.username?.charAt(0).toUpperCase() || '🦝'}
                </div>
                {premium.is_premium && (
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Star size={20} className="text-white fill-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {displayUser.username}
                  </h2>
                  {isGuest() && (
                    <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">Guest</span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-400 mb-4">
                  {displayUser.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={16} />
                      <span>{displayUser.email}</span>
                    </div>
                  )}
                  {displayUser.country && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{displayUser.country_flag || '🌐'}</span>
                      <span>{displayUser.country}</span>
                    </div>
                  )}
                </div>

                {!premium.is_premium && !isGuest() && (
                  <button
                    onClick={() => navigate('/premium')}
                    className="px-6 py-2 bg-gradient-to-r from-[#7c3aed] to-[#4c1d95] rounded-full hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all"
                    data-testid="upgrade-premium-btn"
                  >
                    <span className="flex items-center gap-2">
                      <Star size={16} />
                      Upgrade to Premium
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Premium Subscription Status - Only for premium users */}
          {premium.is_premium && !isGuest() && (
            <div className="p-6 bg-gradient-to-r from-[#7c3aed]/20 to-[#4c1d95]/20 backdrop-blur-xl border border-[#7c3aed]/40 rounded-2xl mb-8" data-testid="premium-status-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center">
                    <Crown size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-yellow-400" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {premium.plan_name || 'Premium Member'}
                    </h3>
                    {premium.is_lifetime ? (
                      <p className="text-gray-300">Lifetime access - Never expires!</p>
                    ) : premium.is_expired ? (
                      <p className="text-red-400">Subscription expired</p>
                    ) : (
                      <p className="text-gray-300">
                        {premium.time_remaining_formatted}
                        {premium.expiry_date && (
                          <span className="text-gray-500 ml-2">
                            (expires {premium.expiry_date})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                {premium.days_remaining !== null && premium.days_remaining <= 7 && !premium.is_lifetime && !premium.is_expired && (
                  <span className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-full text-sm font-bold animate-pulse">
                    Renew Soon
                  </span>
                )}
              </div>
              {premium.auto_renew && !premium.is_lifetime && (
                <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                  <Shield size={14} />
                  Auto-renewal enabled
                </p>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="stats-grid">
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-center" data-testid="sessions-stat">
              <div className="w-12 h-12 bg-[#7c3aed]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={24} className="text-[#7c3aed]" />
              </div>
              <p className="text-3xl font-bold mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.total_sessions}
              </p>
              <p className="text-gray-400 text-sm">Sessions</p>
            </div>
            
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-center" data-testid="time-spent-stat">
              <div className="w-12 h-12 bg-[#10b981]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock size={24} className="text-[#10b981]" />
              </div>
              <p className="text-3xl font-bold mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {formatTimeSpent(stats.total_time_spent)}
              </p>
              <p className="text-gray-400 text-sm">Time Spent</p>
            </div>
            
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-center" data-testid="games-played-stat">
              <div className="w-12 h-12 bg-[#f59e0b]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Gamepad2 size={24} className="text-[#f59e0b]" />
              </div>
              <p className="text-3xl font-bold mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.games_played}
              </p>
              <p className="text-gray-400 text-sm">Games Played</p>
            </div>
            
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-center" data-testid="games-won-stat">
              <div className="w-12 h-12 bg-[#ec4899]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Trophy size={24} className="text-[#ec4899]" />
              </div>
              <p className="text-3xl font-bold mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.games_won}
              </p>
              <p className="text-gray-400 text-sm">Games Won</p>
            </div>
          </div>

          {/* Account Details */}
          <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl" data-testid="account-details">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Settings size={20} className="text-[#7c3aed]" />
              Account Details
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Username</span>
                <span className="font-semibold">{displayUser.username}</span>
              </div>
              
              {displayUser.email && (
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-gray-400">Email</span>
                  <span className="font-semibold">{displayUser.email}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Gender</span>
                <span className="font-semibold capitalize">{displayUser.gender || 'Not set'}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Country</span>
                <span className="font-semibold">{displayUser.country || 'Not detected'}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Account Type</span>
                <span className={`font-semibold flex items-center gap-2 ${premium.is_premium ? 'text-yellow-400' : ''}`}>
                  {premium.is_premium ? (
                    <>
                      <Star size={16} className="fill-yellow-400" />
                      {premium.plan_name || 'Premium'}
                    </>
                  ) : isGuest() ? 'Guest' : 'Free'}
                </span>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <span className="text-gray-400">Member Since</span>
                <span className="font-semibold">{formatDate(displayUser.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
