import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RaccoonLogo, RaccoonBrand } from '@/components/branding/RaccoonLogo';
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
    <div className="min-h-screen bg-[#030306] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Deep space background */}
      <div className="absolute inset-0 z-0">
        {/* Base gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(17, 24, 39, 0.5) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(30, 10, 60, 0.3) 0%, transparent 50%)'
          }}
        />
        
        {/* Animated orbs with mouse parallax */}
        <div 
          className="absolute w-[800px] h-[800px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 60%)',
            left: `calc(20% + ${(mousePosition.x - 50) * 0.1}px)`,
            top: `calc(10% + ${(mousePosition.y - 50) * 0.1}px)`,
            filter: 'blur(60px)',
            transition: 'all 0.3s ease-out'
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 60%)',
            right: `calc(10% + ${(50 - mousePosition.x) * 0.1}px)`,
            bottom: `calc(20% + ${(50 - mousePosition.y) * 0.1}px)`,
            filter: 'blur(80px)',
            transition: 'all 0.3s ease-out'
          }}
        />
        
        {/* Star field effect */}
        <div className="absolute inset-0 opacity-40">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.7 + 0.3,
                animation: `twinkle ${Math.random() * 3 + 2}s infinite ${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
        
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(124,58,237,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.5) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Raccoon Logo - Central focal point */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* Outer glow ring */}
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
                transform: 'scale(2)',
                filter: 'blur(30px)'
              }}
            />
            <RaccoonLogo size={140} animated />
          </div>
        </div>

        {/* Brand name */}
        <h1 
          className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-purple-200 bg-clip-text text-transparent"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Raccoon
        </h1>

        {/* Tagline */}
        <p 
          className="text-xl md:text-2xl text-gray-400 mb-3 font-light"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Meet Strangers. Play Games. Go Wild.
        </p>
        
        {/* Subtitle */}
        <p 
          className="text-sm text-gray-500 mb-12"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Video chat with real people from around the world
        </p>

        {/* Primary CTA */}
        <button
          onClick={handleStart}
          className="group relative px-10 py-5 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#8b5cf6] hover:to-[#a855f7] rounded-2xl font-bold text-lg transition-all duration-300 shadow-[0_0_40px_rgba(124,58,237,0.4)] hover:shadow-[0_0_60px_rgba(124,58,237,0.6)] hover:scale-105 active:scale-100"
          style={{ fontFamily: 'Outfit, sans-serif' }}
          data-testid="landing-start-button"
        >
          <span className="flex items-center gap-3">
            <Sparkles size={22} className="group-hover:rotate-12 transition-transform" />
            Start Now
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </span>
          
          {/* Button glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#9333ea] opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
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
          <span className="text-gray-700">•</span>
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
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
