import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { RaccoonIcon } from '@/components/branding/RaccoonLogo';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const AgeVerification = () => {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Redirect if already verified or not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.age_verified) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleConfirm = async () => {
    setLoading(true);
    
    try {
      await axios.post(
        `${API_URL}/auth/verify-age`,
        { confirmed: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh user data to get updated age_verified status
      await refreshUser();
      
      toast.success('Age verified! Welcome to Raccoon!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Age verification error:', error);
      toast.error('Failed to verify age. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    // Redirect away from the site
    window.location.href = 'https://www.google.com';
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(124, 58, 237, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)'
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#0a0a15] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(124,58,237,0.3)]">
        {/* Header */}
        <div className="p-8 text-center border-b border-white/10">
          <div className="relative w-24 h-24 mx-auto mb-5">
            {/* Glow effect */}
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
                transform: 'scale(1.5)',
                filter: 'blur(20px)'
              }}
            />
            {/* Logo container */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.4)]">
              <RaccoonIcon size={56} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Age Verification
          </h1>
          <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
            One last step before you begin
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-orange-400 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-300 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Raccoon App is an <strong className="text-white">adult platform</strong> for users who are 
                <strong className="text-white"> 18 years of age or older</strong>. 
                By continuing, you confirm that you meet this age requirement.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <CheckCircle size={18} className="text-[#7c3aed]" />
              <span>I confirm I am 18 years of age or older</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <CheckCircle size={18} className="text-[#7c3aed]" />
              <span>I agree to the Terms of Service</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <CheckCircle size={18} className="text-[#7c3aed]" />
              <span>I understand and will follow the Community Guidelines</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#8b5cf6] hover:to-[#a855f7] rounded-2xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              style={{ fontFamily: 'Outfit, sans-serif' }}
              data-testid="age-verify-confirm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  Verifying...
                </span>
              ) : (
                "I confirm I am 18+ - Continue"
              )}
            </button>
            <button
              onClick={handleDeny}
              disabled={loading}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium text-gray-400 hover:text-white transition-all disabled:opacity-50"
              style={{ fontFamily: 'Manrope, sans-serif' }}
              data-testid="age-verify-deny"
            >
              I am under 18 - Leave
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-gray-500 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-[#7c3aed] hover:underline">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="text-[#7c3aed] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgeVerification;
