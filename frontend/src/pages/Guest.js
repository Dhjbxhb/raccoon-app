import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { Play, Lock, Crown, Globe, Users, Zap, Loader2 } from 'lucide-react';
import SpaceBackground from '@/components/background/SpaceBackground';
import { Button } from '@/components/ui/button';
import { RaccoonLogo } from '@/components/branding/RaccoonLogo';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Guest = () => {
  const navigate = useNavigate();
  const { loginAsGuest, user } = useAuth();
  const [selectedGender, setSelectedGender] = useState('male');
  const [selectedCountry, setSelectedCountry] = useState('ANY');
  const [preferGender, setPreferGender] = useState('any');
  const [loading, setLoading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      if (!user.age_verified) {
        navigate('/verify-age');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  // Detect country from IP
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await axios.get('https://ipapi.co/json/');
        if (response.data) {
          setDetectedCountry({
            name: response.data.country_name,
            code: response.data.country_code,
            flag: response.data.country_code ? 
              String.fromCodePoint(...[...response.data.country_code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) 
              : '🌍'
          });
        }
      } catch (error) {
        console.log('Could not detect country');
      }
    };
    detectCountry();
  }, []);

  const isPremium = user?.is_premium === true;

  const handleLockedFeature = (feature) => {
    setShowPremiumModal(true);
  };

  const handleStartMatching = async () => {
    setLoading(true);
    try {
      const userData = await loginAsGuest(selectedGender);
      
      // Store preferences
      sessionStorage.setItem('match_preferences', JSON.stringify({
        gender: preferGender,
        country: selectedCountry
      }));
      
      // Guests always need age verification
      navigate('/verify-age');
    } catch (error) {
      toast.error('Failed to start. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white overflow-hidden relative">
      {/* Cinematic space background */}
      <SpaceBackground intensity="minimal" showNebula={true} showShootingStars={false} />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <RaccoonLogo size={64} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Quick Match
              </h1>
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Set your preferences and start instantly
              </p>
            </div>

            {/* Your Gender */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-3 block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                I am
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'male', label: 'Male', icon: '👨' },
                  { value: 'female', label: 'Female', icon: '👩' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedGender(option.value)}
                    className={`p-4 rounded-2xl transition-all flex items-center justify-center gap-3 ${
                      selectedGender === option.value
                        ? 'bg-[#7c3aed] text-white shadow-[0_0_25px_rgba(124,58,237,0.4)]'
                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Match Preferences */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-3 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <Users size={14} />
                Match me with
                {!isPremium && <Lock size={12} className="text-yellow-400 ml-1" />}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'any', label: 'Anyone' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' }
                ].map((option) => {
                  const isLocked = !isPremium && option.value !== 'any';
                  return (
                    <button
                      key={option.value}
                      onClick={() => isLocked ? handleLockedFeature('gender') : setPreferGender(option.value)}
                      className={`relative p-3 rounded-xl transition-all text-sm ${
                        preferGender === option.value && !isLocked
                          ? 'bg-[#7c3aed] text-white'
                          : isLocked 
                            ? 'bg-white/5 text-gray-500 border border-white/5 cursor-pointer'
                            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                      }`}
                    >
                      {isLocked && (
                        <Lock size={10} className="absolute top-2 right-2 text-yellow-400" />
                      )}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Country Filter */}
            <div className="mb-8">
              <label className="text-sm text-gray-400 mb-3 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <Globe size={14} />
                Country
                {!isPremium && <Lock size={12} className="text-yellow-400 ml-1" />}
              </label>
              <button
                onClick={() => !isPremium ? handleLockedFeature('country') : null}
                className={`w-full p-4 rounded-xl transition-all flex items-center justify-between ${
                  isPremium 
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                    : 'bg-white/5 border border-white/5 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{detectedCountry?.flag || '🌍'}</span>
                  <span className={isPremium ? 'text-white' : 'text-gray-500'}>
                    {isPremium ? (detectedCountry?.name || 'Any Country') : 'Any Country'}
                  </span>
                </div>
                {!isPremium && <Lock size={14} className="text-yellow-400" />}
              </button>
              
              {detectedCountry && (
                <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                  <span>Detected:</span>
                  <span>{detectedCountry.flag}</span>
                  <span>{detectedCountry.name}</span>
                </p>
              )}
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStartMatching}
              loading={loading}
              fullWidth
              size="lg"
              icon={Zap}
              iconPosition="left"
              className="shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)]"
              data-testid="start-matching-btn"
            >
              Start Matching
            </Button>
            {/* Already have account link */}
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-gray-500 hover:text-[#7c3aed] transition-colors"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Already have an account? <span className="text-[#7c3aed]">Sign in</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPremiumModal(false)} />
          <div className="relative w-full max-w-sm bg-gradient-to-br from-[#1a1a2e] to-[#0a0a15] border border-white/10 rounded-3xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Crown size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Unlock Premium
            </h3>
            <p className="text-gray-400 text-sm mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Upgrade to choose who you match with
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setShowPremiumModal(false);
                  navigate('/premium');
                }}
                fullWidth
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black shadow-[0_0_30px_rgba(251,191,36,0.4)]"
              >
                View Plans
              </Button>
              <Button
                onClick={() => setShowPremiumModal(false)}
                variant="secondary"
                fullWidth
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Guest;
