import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Zap, Users, Star, Gamepad2 } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [glowIntensity, setGlowIntensity] = useState(0.4);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Subtle breathing glow effect
  useEffect(() => {
    const interval = setInterval(() => {
      setGlowIntensity(prev => {
        const newVal = prev + (Math.random() * 0.1 - 0.05);
        return Math.max(0.3, Math.min(0.6, newVal));
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-hidden relative">
      {/* Cinematic City Background */}
      <div className="fixed inset-0 z-0">
        {/* High-quality city image */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            filter: 'brightness(0.3) contrast(1.2) saturate(0.8)'
          }}
        />
        {/* Purple cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#0a0510]/90 to-[#1a0a2e]/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050508]/80 via-transparent to-[#050508]/80" />
        
        {/* Animated ambient glow orbs */}
        <div 
          className="absolute top-20 right-1/4 w-[600px] h-[600px] rounded-full transition-opacity duration-1000"
          style={{
            background: `radial-gradient(circle, rgba(124,58,237,${glowIntensity}) 0%, transparent 70%)`,
            filter: 'blur(80px)'
          }}
        />
        <div 
          className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(76,29,149,0.4) 0%, transparent 70%)',
            filter: 'blur(100px)'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navbar */}
        <nav className="px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span 
              className="text-2xl font-black tracking-tight"
              style={{ 
                fontFamily: 'Outfit, sans-serif',
                background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 40px rgba(124,58,237,0.5)'
              }}
            >
              RACCOON
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-full transition-all duration-300 font-medium text-sm"
              data-testid="nav-login-button"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-5 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-full transition-all duration-300 font-bold text-sm shadow-[0_0_25px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_rgba(124,58,237,0.7)] hover:scale-105"
              data-testid="nav-signup-button"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Sign Up
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="container mx-auto px-6 pt-8 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto min-h-[70vh]">
            {/* Left: Text Content */}
            <div className="space-y-8 order-2 lg:order-1">
              {/* Brand Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7c3aed]/20 to-[#4c1d95]/20 border border-[#7c3aed]/40 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-pulse" />
                <span className="text-xs font-bold tracking-widest text-[#a78bfa]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  THE NOCTURNAL PLAYGROUND
                </span>
              </div>

              {/* Main Heading */}
              <h1 
                className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]"
                style={{ 
                  fontFamily: 'Outfit, sans-serif',
                  letterSpacing: '-0.03em'
                }}
              >
                <span className="text-white">Meet.</span>
                <br />
                <span className="text-white">Play.</span>
                <br />
                <span 
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #c4b5fd 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Go Wild.
                </span>
              </h1>

              {/* Subheading */}
              <p 
                className="text-lg text-gray-400 max-w-md leading-relaxed"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Random video matching, real-time chat, and interactive games. 
                Your new favorite way to connect.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  onClick={() => navigate('/signup')}
                  className="group relative px-10 py-4 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-2xl transition-all duration-300 font-bold text-base shadow-[0_4px_30px_rgba(124,58,237,0.5)] hover:shadow-[0_4px_50px_rgba(124,58,237,0.7)] hover:scale-[1.02]"
                  data-testid="hero-start-button"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <span className="flex items-center justify-center gap-3">
                    Start Matching
                    <Zap size={18} className="group-hover:rotate-12 transition-transform" />
                  </span>
                </button>
                
                <button
                  onClick={() => navigate('/guest')}
                  className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-sm rounded-2xl transition-all duration-300 font-semibold text-base"
                  data-testid="hero-guest-button"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Try as Guest
                </button>
              </div>
            </div>

            {/* Right: Raccoon Character - Integrated & Alive */}
            <div className="relative order-1 lg:order-2 flex items-center justify-center">
              {/* Multi-layer glow effect */}
              <div 
                className="absolute w-[500px] h-[500px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(124,58,237,0.5) 0%, rgba(124,58,237,0.2) 40%, transparent 70%)',
                  filter: 'blur(60px)',
                  animation: 'pulse 4s ease-in-out infinite'
                }}
              />
              <div 
                className="absolute w-[400px] h-[400px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 60%)',
                  filter: 'blur(40px)',
                  animation: 'pulse 4s ease-in-out infinite 0.5s'
                }}
              />
              
              {/* Raccoon Container with mask for clean edges */}
              <div 
                className="relative z-10 w-80 h-80 sm:w-96 sm:h-96 rounded-full overflow-hidden"
                style={{
                  background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)'
                }}
              >
                <img 
                  src="https://customer-assets.emergentagent.com/job_realtime-raccoon/artifacts/818jgnvw_Screenshot%202026-03-22%20at%202.50.16%E2%80%AFPM.png"
                  alt="Cool Raccoon"
                  className="w-full h-full object-cover scale-150"
                  style={{
                    objectPosition: 'center 30%',
                    animation: 'float 4s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 60px rgba(124,58,237,0.6))'
                  }}
                />
              </div>
              
              {/* Floating particles around raccoon */}
              <div className="absolute top-10 right-10 w-3 h-3 bg-[#7c3aed] rounded-full opacity-60" style={{ animation: 'float 3s ease-in-out infinite' }} />
              <div className="absolute bottom-20 left-10 w-2 h-2 bg-[#a78bfa] rounded-full opacity-40" style={{ animation: 'float 3s ease-in-out infinite 0.5s' }} />
              <div className="absolute top-1/2 right-5 w-2 h-2 bg-[#c4b5fd] rounded-full opacity-50" style={{ animation: 'float 3s ease-in-out infinite 1s' }} />
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto mt-24">
            {/* Random Matching */}
            <button
              onClick={() => navigate('/guest')}
              className="group p-6 bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl hover:border-[#7c3aed]/40 transition-all duration-500 hover:bg-white/[0.05] text-left"
              data-testid="feature-matching"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed]/20 to-[#7c3aed]/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users size={22} className="text-[#7c3aed]" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Random Matching</h3>
              <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Connect with strangers instantly. Skip anytime.
              </p>
            </button>

            {/* Interactive Games */}
            <button
              onClick={() => navigate('/guest')}
              className="group p-6 bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl hover:border-[#10b981]/40 transition-all duration-500 hover:bg-white/[0.05] text-left"
              data-testid="feature-games"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Gamepad2 size={22} className="text-[#10b981]" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Interactive Games</h3>
              <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Play Raccoon Feud and Truth or Dare together.
              </p>
            </button>

            {/* Premium Features */}
            <button
              onClick={() => navigate('/premium')}
              className="group p-6 bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl hover:border-[#f43f5e]/40 transition-all duration-500 hover:bg-white/[0.05] text-left"
              data-testid="feature-premium"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#f43f5e]/20 to-[#f43f5e]/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Star size={22} className="text-[#f43f5e]" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Premium Features</h3>
              <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Unlock filters, games, and priority matching.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Global Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1.5); }
          50% { transform: translateY(-15px) scale(1.5); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
