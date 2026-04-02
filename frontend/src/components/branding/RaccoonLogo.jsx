import React from 'react';

/**
 * Raccoon Brand System
 * Uses the cool raccoon mascot (sunglasses, chain, cigar) for main branding
 * Plus minimal SVG variants for small icons
 */

// Main Mascot Logo - Uses the actual raccoon character image
export const RaccoonLogo = ({ size = 120, className = '', animated = false }) => {
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Glow effect behind mascot */}
      {animated && (
        <div 
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.5) 0%, transparent 60%)',
            filter: 'blur(25px)',
            transform: 'scale(1.3)'
          }}
        />
      )}
      
      {/* Circular mask container */}
      <div 
        className="relative z-10 w-full h-full rounded-full overflow-hidden"
        style={{
          boxShadow: animated 
            ? '0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(124,58,237,0.3)' 
            : '0 0 30px rgba(124,58,237,0.3)'
        }}
      >
        {/* Mascot image - PERFORMANCE: lazy loading */}
        <img 
          src="/assets/raccoon-mascot.png" 
          alt="Raccoon" 
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          style={{
            transform: 'scale(1.15)',
            objectPosition: 'center 30%'
          }}
        />
      </div>
    </div>
  );
};

// Minimal Icon - For small UI elements (auth cards, buttons)
export const RaccoonIcon = ({ size = 32, className = '' }) => {
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Simplified raccoon face icon - minimal style */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        
        {/* Ears */}
        <path d="M10 14 L6 4 L16 10 Z" fill="url(#iconGrad)" opacity="0.9" />
        <path d="M30 14 L34 4 L24 10 Z" fill="url(#iconGrad)" opacity="0.9" />
        
        {/* Head */}
        <ellipse cx="20" cy="22" rx="14" ry="12" fill="#2d2d3a" stroke="url(#iconGrad)" strokeWidth="1.5" />
        
        {/* Mask marks */}
        <ellipse cx="13" cy="20" rx="5" ry="4" fill="#1a1a24" />
        <ellipse cx="27" cy="20" rx="5" ry="4" fill="#1a1a24" />
        
        {/* Sunglasses */}
        <rect x="8" y="17" width="10" height="6" rx="1" fill="#0a0a0f" stroke="#333" strokeWidth="0.5" />
        <rect x="22" y="17" width="10" height="6" rx="1" fill="#0a0a0f" stroke="#333" strokeWidth="0.5" />
        <path d="M18 20 L22 20" stroke="#333" strokeWidth="1" />
        <path d="M8 20 L5 18" stroke="#333" strokeWidth="0.8" />
        <path d="M32 20 L35 18" stroke="#333" strokeWidth="0.8" />
        
        {/* Shine on glasses */}
        <path d="M10 18 L14 18" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round" />
        <path d="M24 18 L28 18" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round" />
        
        {/* Nose */}
        <ellipse cx="20" cy="26" rx="2.5" ry="2" fill="#1a1a24" />
        <ellipse cx="20" cy="25.5" rx="1" ry="0.7" fill="rgba(124,58,237,0.5)" />
        
        {/* Smirk */}
        <path d="M17 29 Q20 31, 23 29" fill="none" stroke="#4a4a5a" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
};

// Loading variant - Animated ring with raccoon icon
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

// Brand logo with text
export const RaccoonBrand = ({ size = 'md', showText = true, className = '' }) => {
  const sizes = {
    sm: { logo: 40, text: 'text-xl' },
    md: { logo: 56, text: 'text-2xl' },
    lg: { logo: 72, text: 'text-3xl' },
    xl: { logo: 100, text: 'text-4xl' }
  };
  
  const s = sizes[size] || sizes.md;
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <RaccoonIcon size={s.logo} />
      {showText && (
        <span 
          className={`font-bold bg-gradient-to-r from-white via-gray-100 to-purple-200 bg-clip-text text-transparent ${s.text}`}
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Raccoon
        </span>
      )}
    </div>
  );
};

export default RaccoonLogo;
