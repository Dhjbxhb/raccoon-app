import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Zap, Star, User, Clock, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, isGuest } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleStartMatching = () => {
    navigate('/match');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

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
        {/* Navbar */}
        <nav className="px-6 py-6 flex justify-between items-center border-b border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-full flex items-center justify-center text-xl">
              🦝
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>RACCOON</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
              <User size={18} />
              <span style={{ fontFamily: 'Manrope, sans-serif' }}>{user.username}</span>
              {user.premium_status && <Star size={16} className="text-yellow-400 fill-yellow-400" />}
            </div>
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
            <button
              onClick={handleStartMatching}
              className="group px-12 py-5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-full font-bold text-xl tracking-wide shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.8)] transition-all duration-300 hover:scale-110"
              data-testid="start-matching-button"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <span className="flex items-center gap-3">
                Start Matching
                <Zap size={24} className="group-hover:rotate-12 transition-transform" />
              </span>
            </button>
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

          {/* Coming Soon Features */}
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>Coming Soon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl opacity-60">
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Raccoon Feud</h3>
                <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>Play Family Feud-style games with your matches</p>
              </div>
              <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl opacity-60">
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Truth or Dare</h3>
                <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>Spin the bottle and have fun with challenges</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
