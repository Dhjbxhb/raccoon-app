import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RaccoonLogo } from '@/components/branding/RaccoonLogo';
import SpaceBackground from '@/components/background/SpaceBackground';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const handleStart = () => {
    navigate('/guest');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Cinematic space background */}
      <SpaceBackground intensity="normal" showNebula={true} showShootingStars={true} />

      {/* Main content - flex-grow pushes footer down, centered content */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-8 pb-4">
        {/* Raccoon Mascot - Central focal point */}
        <div className="mb-4 sm:mb-6 flex justify-center">
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
            <RaccoonLogo size={160} animated className="sm:w-[200px] sm:h-[200px]" />
          </div>
        </div>

        {/* Brand name */}
        <h1 
          className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white via-gray-100 to-purple-200 bg-clip-text text-transparent drop-shadow-lg text-center"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Raccoon
        </h1>

        {/* Tagline */}
        <p 
          className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-1 sm:mb-2 font-medium text-center px-2"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Meet Strangers. Play Games. Go Wild.
        </p>
        
        {/* Subtitle */}
        <p 
          className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-10 text-center px-4"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Video chat with real people from around the world
        </p>

        {/* Primary CTA - High z-index, always clickable */}
        <div className="relative z-50">
          <Button
            onClick={handleStart}
            size="xl"
            icon={Sparkles}
            iconPosition="left"
            className="shadow-[0_0_50px_rgba(124,58,237,0.5)] hover:shadow-[0_0_70px_rgba(124,58,237,0.7)] min-w-[200px] sm:min-w-[240px]"
            data-testid="landing-start-button"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Start Now
            <ArrowRight size={20} className="ml-2" />
          </Button>
        </div>

        {/* Secondary links */}
        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-4 sm:gap-6 text-sm">
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

      {/* Bottom footer - NOT absolute, flows naturally */}
      <div className="relative z-10 w-full">
        <div className="flex flex-col items-center pb-4 sm:pb-6 px-4">
          {/* SEO Content Section - Hidden on very small screens to prevent overlap */}
          <div className="max-w-xl text-center mb-4 sm:mb-6 hidden sm:block">
            <h2 
              className="text-base sm:text-lg md:text-xl font-semibold text-gray-300 mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Random Video Chat – Talk to Strangers Online
            </h2>
            <p 
              className="text-xs sm:text-sm text-gray-500 leading-relaxed"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Raccoon App is a random video chat platform where you can talk to strangers instantly. 
              If you are looking for an Omegle alternative, this is a fast and simple way to meet new people online.
            </p>
          </div>
          
          {/* Legal links */}
          <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-4 text-xs text-gray-600 mb-2">
            <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <span>•</span>
            <Link to="/guidelines" className="hover:text-gray-400 transition-colors">Guidelines</Link>
            <span>•</span>
            <Link to="/refund" className="hover:text-gray-400 transition-colors">Refund</Link>
          </div>
          <p className="text-xs text-gray-700 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
            18+ only • Video chat with strangers
          </p>
        </div>
      </div>

    </div>
  );
};

export default Landing;
