import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Zap, Users } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-30"
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
        <nav className="px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-full flex items-center justify-center text-xl">
              🦝
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>RACCOON</span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all duration-300 font-medium"
              data-testid="nav-login-button"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-full transition-all duration-300 font-bold tracking-wide shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] hover:scale-105"
              data-testid="nav-signup-button"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Sign Up
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="container mx-auto px-6 pt-20 pb-32 text-center">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed]/20 border border-[#7c3aed]/50 rounded-full backdrop-blur-md">
              <Sparkles size={16} className="text-[#7c3aed]" />
              <span className="text-sm font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>18+ Real-time Matching Platform</span>
            </div>

            {/* Main Heading */}
            <h1 
              className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight"
              style={{ 
                fontFamily: 'Outfit, sans-serif',
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #ffffff 0%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Meet Strangers.<br />Play Games.<br />Go Wild.
            </h1>

            {/* Subheading */}
            <p 
              className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Random video matching, real-time chat, and interactive games.
              The nocturnal playground for instant connections.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <button
                onClick={() => navigate('/signup')}
                className="group relative px-10 py-5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-full transition-all duration-300 font-bold text-lg tracking-wide shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.8)] hover:scale-110"
                data-testid="hero-start-button"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                <span className="flex items-center gap-3">
                  Start Matching
                  <Zap size={20} className="group-hover:rotate-12 transition-transform" />
                </span>
                <div className="absolute inset-0 rounded-full bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </button>
              
              <button
                onClick={() => navigate('/guest')}
                className="px-10 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all duration-300 font-semibold text-lg"
                data-testid="hero-guest-button"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Try as Guest
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-32">
            <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-[#7c3aed]/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-14 h-14 bg-[#7c3aed]/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Users size={28} className="text-[#7c3aed]" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Random Matching</h3>
              <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>Connect with strangers instantly. Skip anytime. No limits.</p>
            </div>

            <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-[#10b981]/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-14 h-14 bg-[#10b981]/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Zap size={28} className="text-[#10b981]" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Interactive Games</h3>
              <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>Play Raccoon Feud and Truth or Dare together. Stay engaged.</p>
            </div>

            <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-[#f43f5e]/50 transition-all duration-300 hover:transform hover:scale-105">
              <div className="w-14 h-14 bg-[#f43f5e]/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Sparkles size={28} className="text-[#f43f5e]" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Premium Features</h3>
              <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>Get verified badge. Stand out. Show you're serious.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
