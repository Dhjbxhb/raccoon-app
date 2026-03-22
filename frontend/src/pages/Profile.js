import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ArrowLeft, User, Mail, Globe, Calendar, Star, Shield,
  TrendingUp, Clock, Gamepad2, Trophy, Settings, LogOut
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, isGuest } = useAuth();
  const [stats, setStats] = useState({
    total_sessions: 0,
    total_time_spent: 0,
    games_played: 0,
    games_won: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0 opacity-15"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1635931225069-4968458f04f8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwzfHxjeWJlcnB1bmslMjBjaXR5JTIwbmlnaHQlMjBibHVycmVkJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3NzQxNzU5Mjd8MA&ixlib=rb-4.1.0&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(3px)'
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 backdrop-blur-md bg-black/50">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Profile</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl transition-all"
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
                  {user.username?.charAt(0).toUpperCase() || '🦝'}
                </div>
                {user.premium_status && (
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Star size={20} className="text-white fill-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {user.username}
                  </h2>
                  {isGuest() && (
                    <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">Guest</span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-400 mb-4">
                  {user.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={16} />
                      <span>{user.email}</span>
                    </div>
                  )}
                  {user.country && (
                    <div className="flex items-center gap-2">
                      <Globe size={16} />
                      <span>{user.country}</span>
                    </div>
                  )}
                </div>

                {!user.premium_status && !isGuest() && (
                  <button
                    onClick={() => navigate('/premium')}
                    className="px-6 py-2 bg-gradient-to-r from-[#7c3aed] to-[#4c1d95] rounded-full hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all"
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

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-center">
              <div className="w-12 h-12 bg-[#7c3aed]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={24} className="text-[#7c3aed]" />
              </div>
              <p className="text-3xl font-bold mb-1">{user.total_sessions || 0}</p>
              <p className="text-gray-400 text-sm">Sessions</p>
            </div>
            
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-center">
              <div className="w-12 h-12 bg-[#10b981]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock size={24} className="text-[#10b981]" />
              </div>
              <p className="text-3xl font-bold mb-1">{Math.floor((user.total_time_spent || 0) / 60)}m</p>
              <p className="text-gray-400 text-sm">Time Spent</p>
            </div>
            
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-center">
              <div className="w-12 h-12 bg-[#f59e0b]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Gamepad2 size={24} className="text-[#f59e0b]" />
              </div>
              <p className="text-3xl font-bold mb-1">{user.games_played || 0}</p>
              <p className="text-gray-400 text-sm">Games Played</p>
            </div>
            
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-center">
              <div className="w-12 h-12 bg-[#ec4899]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Trophy size={24} className="text-[#ec4899]" />
              </div>
              <p className="text-3xl font-bold mb-1">{user.games_won || 0}</p>
              <p className="text-gray-400 text-sm">Games Won</p>
            </div>
          </div>

          {/* Account Details */}
          <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Settings size={20} className="text-[#7c3aed]" />
              Account Details
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Username</span>
                <span className="font-semibold">{user.username}</span>
              </div>
              
              {user.email && (
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-gray-400">Email</span>
                  <span className="font-semibold">{user.email}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Gender</span>
                <span className="font-semibold capitalize">{user.gender || 'Not set'}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Country</span>
                <span className="font-semibold">{user.country || 'Not detected'}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Account Type</span>
                <span className={`font-semibold flex items-center gap-2 ${user.premium_status ? 'text-yellow-400' : ''}`}>
                  {user.premium_status ? (
                    <>
                      <Star size={16} className="fill-yellow-400" />
                      Premium
                    </>
                  ) : isGuest() ? 'Guest' : 'Free'}
                </span>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <span className="text-gray-400">Member Since</span>
                <span className="font-semibold">{formatDate(user.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
