import React, { memo, useMemo, useEffect, useState } from 'react';

/**
 * SpaceBackground - Premium Cinematic Space Theme
 * 
 * Features:
 * - Deep space layered gradient
 * - Purple nebula glow
 * - Red energy accent pulses
 * - Twinkling star particles
 * - Subtle cosmic flash effects
 * - Optimized for performance
 */

const SpaceBackground = memo(({ 
  intensity = 'normal', // 'minimal', 'normal', 'intense'
  showNebula = true,
  showRedGlow = true,
  showShootingStars = true,
  className = ''
}) => {
  // Star count based on intensity
  const starCounts = {
    minimal: { far: 30, mid: 15, near: 8 },
    normal: { far: 60, mid: 35, near: 15 },
    intense: { far: 100, mid: 60, near: 25 }
  };

  const counts = starCounts[intensity] || starCounts.normal;

  // Generate stable star positions
  const farStars = useMemo(() => generateStars(counts.far, 0.2, 0.5, 0.5, 1.5), [counts.far]);
  const midStars = useMemo(() => generateStars(counts.mid, 0.4, 0.7, 1, 2), [counts.mid]);
  const nearStars = useMemo(() => generateStars(counts.near, 0.6, 1, 1.5, 2.5), [counts.near]);

  return (
    <div 
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    >
      {/* === BASE GRADIENT === */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, 
              #020205 0%, 
              #050510 15%,
              #0a0818 35%, 
              #0d0a20 55%,
              #080612 75%,
              #030305 100%
            )
          `
        }}
      />

      {/* === NEBULA LAYERS === */}
      {showNebula && (
        <>
          {/* Primary Purple Nebula - Top Left */}
          <div 
            className="absolute w-full h-full"
            style={{
              background: 'radial-gradient(ellipse 70% 50% at 20% 20%, rgba(88, 28, 135, 0.25) 0%, transparent 60%)',
              animation: 'nebulaFloat 40s ease-in-out infinite',
              willChange: 'transform'
            }}
          />
          
          {/* Secondary Magenta Nebula - Center Right */}
          <div 
            className="absolute w-full h-full"
            style={{
              background: 'radial-gradient(ellipse 60% 45% at 80% 50%, rgba(124, 58, 237, 0.18) 0%, transparent 55%)',
              animation: 'nebulaFloat 45s ease-in-out infinite reverse',
              willChange: 'transform'
            }}
          />

          {/* Deep Purple Dust - Bottom */}
          <div 
            className="absolute w-full h-full"
            style={{
              background: 'radial-gradient(ellipse 80% 40% at 50% 90%, rgba(76, 29, 149, 0.2) 0%, transparent 50%)',
              animation: 'nebulaFloat 50s ease-in-out infinite',
              willChange: 'transform'
            }}
          />

          {/* Violet Accent - Center */}
          <div 
            className="absolute w-full h-full"
            style={{
              background: 'radial-gradient(ellipse 40% 35% at 50% 40%, rgba(139, 92, 246, 0.12) 0%, transparent 50%)',
              animation: 'nebulaFloat 35s ease-in-out infinite reverse',
              willChange: 'transform'
            }}
          />
        </>
      )}

      {/* === RED ENERGY ACCENTS === */}
      {showRedGlow && (
        <>
          {/* Red Glow Pulse - Subtle energy effect */}
          <div 
            className="absolute w-full h-full"
            style={{
              background: 'radial-gradient(ellipse 30% 25% at 75% 25%, rgba(220, 38, 38, 0.08) 0%, transparent 50%)',
              animation: 'redPulse 8s ease-in-out infinite',
              willChange: 'opacity'
            }}
          />
          
          {/* Secondary Red Accent */}
          <div 
            className="absolute w-full h-full"
            style={{
              background: 'radial-gradient(ellipse 25% 20% at 15% 70%, rgba(185, 28, 28, 0.06) 0%, transparent 45%)',
              animation: 'redPulse 12s ease-in-out infinite 4s',
              willChange: 'opacity'
            }}
          />

          {/* Cinematic Red Flash - Very subtle */}
          <div 
            className="absolute w-full h-full"
            style={{
              background: 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(239, 68, 68, 0.03) 0%, transparent 70%)',
              animation: 'cosmicFlash 20s ease-in-out infinite',
              willChange: 'opacity'
            }}
          />
        </>
      )}

      {/* === STAR LAYERS === */}
      <div className="absolute inset-0">
        {farStars.map((star, i) => (
          <Star key={`far-${i}`} {...star} />
        ))}
        {midStars.map((star, i) => (
          <Star key={`mid-${i}`} {...star} />
        ))}
        {nearStars.map((star, i) => (
          <Star key={`near-${i}`} {...star} />
        ))}
      </div>

      {/* === SHOOTING STARS === */}
      {showShootingStars && <ShootingStars count={3} />}

      {/* === VIGNETTE OVERLAY === */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 20%, rgba(0,0,0,0.5) 100%)'
        }}
      />

      {/* === CSS KEYFRAMES === */}
      <style>{`
        @keyframes nebulaFloat {
          0%, 100% { 
            transform: translate(0, 0) scale(1); 
          }
          25% { 
            transform: translate(1.5%, 0.5%) scale(1.01); 
          }
          50% { 
            transform: translate(-0.5%, 1%) scale(1.02); 
          }
          75% { 
            transform: translate(-1%, -0.5%) scale(1.01); 
          }
        }

        @keyframes redPulse {
          0%, 100% { 
            opacity: 0.5;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @keyframes cosmicFlash {
          0%, 85%, 100% { 
            opacity: 0;
          }
          90% { 
            opacity: 0.3;
          }
          95% {
            opacity: 0.1;
          }
        }

        @keyframes twinkleStar {
          0%, 100% { 
            opacity: var(--star-opacity, 0.5);
            transform: scale(1);
          }
          50% { 
            opacity: calc(var(--star-opacity, 0.5) * 2);
            transform: scale(1.3);
          }
        }

        @keyframes twinkleStarSlow {
          0%, 100% { 
            opacity: var(--star-opacity, 0.5);
          }
          50% { 
            opacity: calc(var(--star-opacity, 0.5) * 1.5);
          }
        }

        @keyframes shootingStar {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          70% {
            opacity: 0.8;
          }
          100% {
            transform: translateX(350px) translateY(250px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
});

SpaceBackground.displayName = 'SpaceBackground';

// Generate star data with color variations
function generateStars(count, minOpacity, maxOpacity, minSize, maxSize) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let color = '#ffffff';
    
    // Add color variations: 10% purple, 5% blue, 3% red-pink
    if (rand > 0.97) {
      color = '#fca5a5'; // Red-pink tint
    } else if (rand > 0.92) {
      color = '#c4b5fd'; // Purple tint
    } else if (rand > 0.87) {
      color = '#93c5fd'; // Blue tint
    }
    
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: minSize + Math.random() * (maxSize - minSize),
      opacity: minOpacity + Math.random() * (maxOpacity - minOpacity),
      twinkleDuration: 2 + Math.random() * 5,
      twinkleDelay: Math.random() * 6,
      color
    });
  }
  return stars;
}

// Individual Star component
const Star = memo(({ x, y, size, opacity, twinkleDuration, twinkleDelay, color }) => {
  const isLarge = size > 1.8;
  
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        '--star-opacity': opacity,
        opacity: opacity,
        animation: `${isLarge ? 'twinkleStar' : 'twinkleStarSlow'} ${twinkleDuration}s ease-in-out infinite`,
        animationDelay: `${twinkleDelay}s`,
        boxShadow: isLarge 
          ? `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}` 
          : `0 0 ${size}px ${color}`,
        willChange: 'opacity, transform'
      }}
    />
  );
});
Star.displayName = 'Star';

// Shooting Stars component
const ShootingStars = memo(({ count = 3 }) => {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    const createStar = () => {
      const id = Date.now() + Math.random();
      const star = {
        id,
        x: 5 + Math.random() * 50,
        y: Math.random() * 30,
        angle: 25 + Math.random() * 35,
        duration: 0.8 + Math.random() * 1.2
      };
      
      setStars(prev => [...prev.slice(-(count - 1)), star]);
      
      setTimeout(() => {
        setStars(prev => prev.filter(s => s.id !== id));
      }, star.duration * 1000);
    };

    // Initial delay
    const initialTimeout = setTimeout(createStar, 5000);
    
    // Random interval (10-25 seconds)
    const interval = setInterval(() => {
      if (Math.random() > 0.5) createStar();
    }, 10000 + Math.random() * 15000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [count]);

  return (
    <>
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: '120px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), white)',
            borderRadius: '2px',
            transform: `rotate(${star.angle}deg)`,
            animation: `shootingStar ${star.duration}s ease-out forwards`,
            boxShadow: '0 0 6px rgba(255,255,255,0.8), 0 0 15px rgba(124,58,237,0.4), 0 0 25px rgba(239,68,68,0.2)',
            willChange: 'transform, opacity'
          }}
        />
      ))}
    </>
  );
});
ShootingStars.displayName = 'ShootingStars';

export default SpaceBackground;
