import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Sparkles } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState([]);

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

  // Generate floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
  }, []);

  const handleStart = () => {
    navigate('/guest');
  };

  return (
    <div className="min-h-screen bg-[#030305] text-white overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#030305] via-[#0a0515] to-[#030305]" />
        
        {/* Purple glow orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'pulse 8s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(147,51,234,0.4) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'pulse 10s ease-in-out infinite reverse'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 60%)',
            filter: 'blur(100px)',
            animation: 'breathe 6s ease-in-out infinite'
          }}
        />

        {/* Floating particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-purple-500/30"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `float ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`
            }}
          />
        ))}
      </div>

      {/* Main content - Centered */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Logo/Brand mark */}
        <div className="mb-8 relative">
          <div 
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center shadow-[0_0_60px_rgba(124,58,237,0.5)]"
            style={{ animation: 'float 4s ease-in-out infinite' }}
          >
            <span className="text-5xl">🦝</span>
          </div>
          <div className="absolute -inset-4 bg-[#7c3aed]/20 rounded-[40px] blur-2xl -z-10" />
        </div>

        {/* Main CTA Button */}
        <button
          onClick={handleStart}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group relative mb-8"
          data-testid="start-button"
        >
          {/* Glow effect */}
          <div 
            className={`absolute inset-0 rounded-full transition-all duration-500 ${
              isHovered 
                ? 'bg-[#7c3aed] blur-2xl opacity-60 scale-125' 
                : 'bg-[#7c3aed] blur-xl opacity-40 scale-100'
            }`}
          />
          
          {/* Button */}
          <div 
            className={`relative px-16 py-6 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] rounded-full font-bold text-2xl transition-all duration-300 ${
              isHovered ? 'scale-105 shadow-[0_0_50px_rgba(124,58,237,0.6)]' : 'shadow-[0_0_30px_rgba(124,58,237,0.4)]'
            }`}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            <div className="flex items-center gap-3">
              <Play size={28} className={`transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`} />
              <span>Start</span>
            </div>
          </div>
        </button>

        {/* Subtitle */}
        <p 
          className="text-gray-400 text-lg tracking-wide"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Talk to real people instantly
        </p>
      </div>

      {/* Footer Links */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex items-center justify-center gap-6 text-sm text-gray-500">
        <a href="/terms" className="hover:text-gray-300 transition-colors" style={{ fontFamily: 'Manrope, sans-serif' }}>Terms</a>
        <a href="/privacy" className="hover:text-gray-300 transition-colors" style={{ fontFamily: 'Manrope, sans-serif' }}>Privacy</a>
        <a href="/guidelines" className="hover:text-gray-300 transition-colors" style={{ fontFamily: 'Manrope, sans-serif' }}>Guidelines</a>
        <span className="text-gray-600">18+ only</span>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.4; }
        }
        @keyframes breathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
