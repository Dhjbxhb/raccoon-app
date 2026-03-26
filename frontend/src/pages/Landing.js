import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RaccoonLogo } from '@/components/branding/RaccoonLogo';
import { ArrowRight, Sparkles } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  // Redirect authenticated users appropriately
  useEffect(() => {
    if (user) {
      if (!user.age_verified) {
        navigate('/verify-age');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  // Track mouse for parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleStart = () => {
    navigate('/guest');
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Deep space/purple background */}
      <div className="absolute inset-0 z-0">
        {/* Base gradient - purple tones */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(88, 28, 135, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(30, 10, 60, 0.4) 0%, transparent 50%)'
          }}
        />
        
        {/* Animated orbs with mouse parallax */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 60%)',
            left: `calc(30% + ${(mousePosition.x - 50) * 0.15}px)`,
            top: `calc(20% + ${(mousePosition.y - 50) * 0.15}px)`,
            filter: 'blur(60px)',
            transition: 'all 0.3s ease-out'
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(79,70,229,0.25) 0%, transparent 60%)',
            right: `calc(20% + ${(50 - mousePosition.x) * 0.15}px)`,
            bottom: `calc(30% + ${(50 - mousePosition.y) * 0.15}px)`,
            filter: 'blur(80px)',
            transition: 'all 0.3s ease-out'
          }}
        />
        
        {/* Star field effect */}
        <div className="absolute inset-0 opacity-50">
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.2,
                animation: `twinkle ${Math.random() * 3 + 2}s infinite ${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Raccoon Mascot - Central focal point */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            {/* Outer glow ring */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 60%)',
                transform: 'scale(1.8)',
                filter: 'blur(40px)'
              }}
            />
            <RaccoonLogo size={200} animated />
          </div>
        </div>

        {/* Brand name */}
        <h1 
          className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-purple-200 bg-clip-text text-transparent drop-shadow-lg"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Raccoon
        </h1>

        {/* Tagline */}
        <p 
          className="text-xl md:text-2xl text-gray-300 mb-2 font-medium"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Meet Strangers. Play Games. Go Wild.
        </p>
        
        {/* Subtitle */}
        <p 
          className="text-sm text-gray-500 mb-10"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Video chat with real people from around the world
        </p>

        {/* Primary CTA */}
        <button
          onClick={handleStart}
          className="group relative px-12 py-5 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#8b5cf6] hover:to-[#a855f7] rounded-2xl font-bold text-lg transition-all duration-300 shadow-[0_0_50px_rgba(124,58,237,0.5)] hover:shadow-[0_0_70px_rgba(124,58,237,0.7)] hover:scale-105 active:scale-100"
          style={{ fontFamily: 'Outfit, sans-serif' }}
          data-testid="landing-start-button"
        >
          <span className="flex items-center gap-3">
            <Sparkles size={22} className="group-hover:rotate-12 transition-transform" />
            Start Now
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </span>
          
          {/* Button glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#9333ea] opacity-0 group-hover:opacity-30 blur-xl transition-opacity" />
        </button>

        {/* Secondary links */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm">
          <Link 
            to="/login" 
            className="text-gray-400 hover:text-white transition-colors"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Sign In
          </Link>
          <span className="text-gray-600">•</span>
          <Link 
            to="/signup" 
            className="text-gray-400 hover:text-white transition-colors"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Create Account
          </Link>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="flex flex-col items-center pb-6">
          {/* Legal links */}
          <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
            <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <span>•</span>
            <Link to="/guidelines" className="hover:text-gray-400 transition-colors">Guidelines</Link>
          </div>
          <p className="text-xs text-gray-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
            18+ only • Video chat with strangers
          </p>
        </div>
      </div>

      {/* CSS for star twinkle animation */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
