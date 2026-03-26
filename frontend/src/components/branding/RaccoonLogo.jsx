import React from 'react';

/**
 * Premium Raccoon Logo - Minimal, elegant, futuristic design
 * No emoji, no cartoon - just clean geometric lines
 */

// Main Logo - Full raccoon face with geometric style
export const RaccoonLogo = ({ size = 80, className = '', animated = false }) => {
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Glow effect */}
      {animated && (
        <div 
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
            filter: 'blur(20px)',
            transform: 'scale(1.5)'
          }}
        />
      )}
      
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full"
      >
        {/* Raccoon face outline */}
        <defs>
          <linearGradient id="raccoonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
          <linearGradient id="maskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0f0f1a" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Ears */}
        <path
          d="M25 35 L15 15 L35 25 Z"
          fill="url(#raccoonGradient)"
          opacity="0.9"
        />
        <path
          d="M75 35 L85 15 L65 25 Z"
          fill="url(#raccoonGradient)"
          opacity="0.9"
        />
        
        {/* Inner ears */}
        <path
          d="M27 32 L22 20 L32 27 Z"
          fill="#0f0f1a"
          opacity="0.8"
        />
        <path
          d="M73 32 L78 20 L68 27 Z"
          fill="#0f0f1a"
          opacity="0.8"
        />
        
        {/* Head shape */}
        <ellipse
          cx="50"
          cy="55"
          rx="38"
          ry="35"
          fill="url(#maskGradient)"
          stroke="url(#raccoonGradient)"
          strokeWidth="2"
        />
        
        {/* Mask pattern - left */}
        <path
          d="M20 45 Q25 35, 35 40 Q40 45, 38 55 Q35 60, 25 58 Q18 55, 20 45"
          fill="#0a0a12"
          stroke="rgba(124,58,237,0.3)"
          strokeWidth="1"
        />
        
        {/* Mask pattern - right */}
        <path
          d="M80 45 Q75 35, 65 40 Q60 45, 62 55 Q65 60, 75 58 Q82 55, 80 45"
          fill="#0a0a12"
          stroke="rgba(124,58,237,0.3)"
          strokeWidth="1"
        />
        
        {/* Eyes - left */}
        <ellipse
          cx="35"
          cy="48"
          rx="6"
          ry="7"
          fill="#f8fafc"
          filter="url(#glow)"
        />
        <ellipse
          cx="36"
          cy="48"
          rx="3"
          ry="4"
          fill="#7c3aed"
        />
        <circle cx="37" cy="46" r="1.5" fill="#fff" opacity="0.9" />
        
        {/* Eyes - right */}
        <ellipse
          cx="65"
          cy="48"
          rx="6"
          ry="7"
          fill="#f8fafc"
          filter="url(#glow)"
        />
        <ellipse
          cx="66"
          cy="48"
          rx="3"
          ry="4"
          fill="#7c3aed"
        />
        <circle cx="67" cy="46" r="1.5" fill="#fff" opacity="0.9" />
        
        {/* Nose */}
        <ellipse
          cx="50"
          cy="62"
          rx="5"
          ry="4"
          fill="#1a1a2e"
          stroke="rgba(124,58,237,0.4)"
          strokeWidth="1"
        />
        <ellipse
          cx="50"
          cy="61"
          rx="2"
          ry="1.5"
          fill="rgba(124,58,237,0.6)"
        />
        
        {/* Subtle mouth line */}
        <path
          d="M45 68 Q50 72, 55 68"
          fill="none"
          stroke="rgba(124,58,237,0.3)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        
        {/* Whisker dots */}
        <circle cx="30" cy="60" r="1" fill="rgba(124,58,237,0.4)" />
        <circle cx="28" cy="64" r="1" fill="rgba(124,58,237,0.4)" />
        <circle cx="70" cy="60" r="1" fill="rgba(124,58,237,0.4)" />
        <circle cx="72" cy="64" r="1" fill="rgba(124,58,237,0.4)" />
      </svg>
    </div>
  );
};

// Icon variant - Simplified for small sizes
export const RaccoonIcon = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      
      {/* Simplified ears */}
      <path d="M8 11 L5 5 L11 9 Z" fill="url(#iconGradient)" />
      <path d="M24 11 L27 5 L21 9 Z" fill="url(#iconGradient)" />
      
      {/* Head */}
      <ellipse cx="16" cy="17" rx="12" ry="11" fill="#1a1a2e" stroke="url(#iconGradient)" strokeWidth="1.5" />
      
      {/* Mask marks */}
      <ellipse cx="10" cy="15" rx="4" ry="3" fill="#0a0a12" />
      <ellipse cx="22" cy="15" rx="4" ry="3" fill="#0a0a12" />
      
      {/* Eyes */}
      <circle cx="11" cy="15" r="2" fill="#f8fafc" />
      <circle cx="11.5" cy="15" r="1" fill="#7c3aed" />
      <circle cx="21" cy="15" r="2" fill="#f8fafc" />
      <circle cx="21.5" cy="15" r="1" fill="#7c3aed" />
      
      {/* Nose */}
      <ellipse cx="16" cy="20" rx="2" ry="1.5" fill="#0a0a12" />
    </svg>
  );
};

// Loading variant - Animated ring with raccoon
export const RaccoonLoader = ({ size = 60, className = '' }) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Spinning ring */}
      <svg
        className="absolute inset-0 animate-spin"
        style={{ animationDuration: '2s' }}
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
            <stop offset="50%" stopColor="#7c3aed" stopOpacity="1" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#loaderGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="200"
          strokeDashoffset="50"
        />
      </svg>
      
      {/* Static icon in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <RaccoonIcon size={size * 0.5} />
      </div>
    </div>
  );
};

// Logo mark with text
export const RaccoonBrand = ({ size = 'md', showText = true, className = '' }) => {
  const sizes = {
    sm: { logo: 32, text: 'text-lg' },
    md: { logo: 48, text: 'text-2xl' },
    lg: { logo: 64, text: 'text-3xl' },
    xl: { logo: 80, text: 'text-4xl' }
  };
  
  const s = sizes[size] || sizes.md;
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <RaccoonIcon size={s.logo} />
      {showText && (
        <span 
          className={`font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent ${s.text}`}
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Raccoon
        </span>
      )}
    </div>
  );
};

export default RaccoonLogo;
