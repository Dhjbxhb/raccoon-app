import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const AgeVerificationModal = ({ onConfirm }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already confirmed age
    const hasVerified = localStorage.getItem('raccoon_age_verified');
    if (!hasVerified) {
      setIsVisible(true);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem('raccoon_age_verified', 'true');
    setIsVisible(false);
    if (onConfirm) onConfirm();
  };

  const handleDeny = () => {
    // Redirect to a safe page or show message
    window.location.href = 'https://www.google.com';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#0a0a15] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(124,58,237,0.3)]">
        {/* Header */}
        <div className="p-6 text-center border-b border-white/10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center">
            <Shield size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Age Verification Required
          </h2>
          <p className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Raccoon App is for adults only
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-orange-400 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-300 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                This platform contains content intended for users who are <strong className="text-white">18 years of age or older</strong>. 
                By entering, you confirm that you meet the age requirement and agree to our Terms of Service.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <CheckCircle size={16} className="text-[#7c3aed]" />
              <span>I am 18 years of age or older</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <CheckCircle size={16} className="text-[#7c3aed]" />
              <span>I agree to the Terms of Service</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <CheckCircle size={16} className="text-[#7c3aed]" />
              <span>I understand the Community Guidelines</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              className="w-full py-4 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#8b5cf6] hover:to-[#a855f7] rounded-2xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] hover:scale-[1.02] active:scale-[0.98]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
              data-testid="age-verify-confirm"
            >
              I am 18 or older - Enter
            </button>
            <button
              onClick={handleDeny}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium text-gray-400 hover:text-white transition-all"
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
            By clicking "Enter", you agree to our{' '}
            <a href="/terms" className="text-[#7c3aed] hover:underline">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="text-[#7c3aed] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
