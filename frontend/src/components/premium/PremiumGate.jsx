import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, X } from 'lucide-react';

/**
 * PremiumGate Component
 * 
 * Wraps premium-only features and shows a locked state for non-premium users.
 * This is for UI feedback only - backend enforcement is the source of truth.
 */
const PremiumGate = ({ 
  children, 
  isPremium, 
  feature,
  featureName,
  showLock = true,
  variant = 'overlay', // 'overlay', 'inline', 'disable'
  onPremiumRequired
}) => {
  const navigate = useNavigate();

  const handleUpgradeClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onPremiumRequired) {
      onPremiumRequired();
    } else {
      navigate('/premium');
    }
  };

  // If premium, just render children
  if (isPremium) {
    return <>{children}</>;
  }

  // Non-premium views based on variant
  if (variant === 'disable') {
    // Simply disable interaction
    return (
      <div className="relative pointer-events-none opacity-50">
        {children}
        {showLock && (
          <div className="absolute top-1 right-1">
            <Lock size={12} className="text-yellow-400" />
          </div>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    // Inline lock indicator
    return (
      <button
        onClick={handleUpgradeClick}
        className="relative flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <span className="opacity-60">{children}</span>
        <span className="flex items-center gap-1 text-yellow-400">
          <Lock size={12} />
          <span className="text-xs">Premium</span>
        </span>
      </button>
    );
  }

  // Default: overlay variant
  return (
    <div className="relative">
      {/* Grayed out content */}
      <div className="opacity-40 pointer-events-none">
        {children}
      </div>
      
      {/* Overlay */}
      <div 
        onClick={handleUpgradeClick}
        className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/40 backdrop-blur-[2px] rounded-lg transition-all hover:bg-black/50"
      >
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <Crown size={20} className="text-yellow-400" />
          </div>
          <p className="text-sm text-white font-medium">
            {featureName || 'Premium Feature'}
          </p>
          <button className="px-4 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-xs font-bold text-black hover:opacity-90 transition-opacity">
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * PremiumBadge Component
 * 
 * Shows a small premium indicator on features
 */
export const PremiumBadge = ({ 
  isPremium, 
  size = 'sm',
  onClick 
}) => {
  if (isPremium) return null;
  
  const sizeClasses = {
    xs: 'p-0.5',
    sm: 'p-1',
    md: 'p-1.5'
  };
  
  const iconSizes = {
    xs: 10,
    sm: 12,
    md: 14
  };

  return (
    <div 
      onClick={onClick}
      className={`${sizeClasses[size]} bg-yellow-500/20 rounded-full cursor-pointer hover:bg-yellow-500/30 transition-colors`}
    >
      <Crown size={iconSizes[size]} className="text-yellow-400" />
    </div>
  );
};

/**
 * PremiumPrompt Modal
 * 
 * Shows when a non-premium user tries to access a premium feature
 */
export const PremiumPromptModal = ({ 
  isOpen, 
  onClose, 
  feature,
  featureName,
  onUpgrade
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/premium');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-sm bg-gradient-to-br from-[#1a1a2e] to-[#0a0a15] border border-white/10 rounded-2xl p-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={18} className="text-gray-400" />
        </button>

        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Crown size={32} className="text-black" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">Premium Feature</h3>
        
        <p className="text-gray-400 text-sm mb-6">
          <span className="text-white font-medium">{featureName || 'This feature'}</span> is available exclusively for Premium members.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleUpgrade}
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-black hover:opacity-90 transition-opacity"
          >
            Upgrade to Premium
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * FeatureLockedToast
 * 
 * Inline message for locked features
 */
export const FeatureLockedToast = ({ message, onUpgrade }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
      <Lock size={18} className="text-yellow-400 flex-shrink-0" />
      <p className="text-sm text-yellow-200 flex-1">{message}</p>
      <button
        onClick={onUpgrade}
        className="px-3 py-1 bg-yellow-500 rounded-lg text-xs font-bold text-black hover:bg-yellow-400 transition-colors flex-shrink-0"
      >
        Upgrade
      </button>
    </div>
  );
};

export default PremiumGate;
