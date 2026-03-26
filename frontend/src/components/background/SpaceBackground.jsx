import React, { useRef, useEffect, useState, useMemo } from 'react';

/**
 * SpaceBackground - Cinematic animated starfield background
 * Features:
 * - Multi-layer starfield with depth
 * - Subtle animated nebula gradients
 * - Twinkling star animations
 * - Shooting stars
 * - Performant on mobile
 */

const SpaceBackground = ({ 
  intensity = 'normal', // 'minimal', 'normal', 'intense'
  showNebula = true,
  showShootingStars = true,
  className = ''
}) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Star count based on intensity
  const starCounts = {
    minimal: { far: 40, mid: 25, near: 10 },
    normal: { far: 80, mid: 50, near: 20 },
    intense: { far: 120, mid: 80, near: 35 }
  };

  const counts = starCounts[intensity] || starCounts.normal;

  // Generate stars with stable positions using useMemo
  const farStars = useMemo(() => 
    generateStars(counts.far, 0.3, 0.6, 1, 1.5), [counts.far]);
  const midStars = useMemo(() => 
    generateStars(counts.mid, 0.5, 0.8, 1.5, 2), [counts.mid]);
  const nearStars = useMemo(() => 
    generateStars(counts.near, 0.7, 1, 2, 3), [counts.near]);

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ 
        background: 'linear-gradient(180deg, #030306 0%, #0a0612 30%, #0d0820 60%, #08040f 100%)',
        zIndex: 0 
      }}
    >
      {/* Deep space base layer */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(20, 10, 40, 0.4) 0%, transparent 60%)'
        }}
      />

      {/* Nebula layers */}
      {showNebula && (
        <>
          {/* Primary nebula - deep purple */}
          <div 
            className="absolute w-full h-full opacity-30"
            style={{
              background: 'radial-gradient(ellipse 60% 40% at 30% 30%, rgba(88, 28, 135, 0.35) 0%, transparent 50%)',
              animation: 'nebulaFloat 30s ease-in-out infinite'
            }}
          />
          
          {/* Secondary nebula - blue accent */}
          <div 
            className="absolute w-full h-full opacity-20"
            style={{
              background: 'radial-gradient(ellipse 50% 35% at 70% 60%, rgba(79, 70, 229, 0.3) 0%, transparent 50%)',
              animation: 'nebulaFloat 35s ease-in-out infinite reverse'
            }}
          />
          
          {/* Tertiary nebula - subtle pink */}
          <div 
            className="absolute w-full h-full opacity-15"
            style={{
              background: 'radial-gradient(ellipse 45% 30% at 60% 40%, rgba(167, 139, 250, 0.25) 0%, transparent 45%)',
              animation: 'nebulaFloat 40s ease-in-out infinite'
            }}
          />

          {/* Deep space dust */}
          <div 
            className="absolute w-full h-full opacity-10"
            style={{
              background: 'radial-gradient(ellipse 70% 50% at 40% 70%, rgba(124, 58, 237, 0.2) 0%, transparent 55%)',
              animation: 'nebulaFloat 45s ease-in-out infinite reverse'
            }}
          />
        </>
      )}

      {/* Star layers */}
      <div className="absolute inset-0">
        {/* Far stars - smallest, slowest twinkle */}
        {farStars.map((star, i) => (
          <Star key={`far-${i}`} {...star} />
        ))}
        
        {/* Mid stars - medium size */}
        {midStars.map((star, i) => (
          <Star key={`mid-${i}`} {...star} />
        ))}
        
        {/* Near stars - largest, brightest */}
        {nearStars.map((star, i) => (
          <Star key={`near-${i}`} {...star} />
        ))}
      </div>

      {/* Shooting stars */}
      {showShootingStars && (
        <ShootingStars count={3} />
      )}

      {/* Subtle vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(0,0,0,0.4) 100%)'
        }}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes nebulaFloat {
          0%, 100% { 
            transform: translate(0, 0) scale(1); 
            opacity: inherit;
          }
          25% { 
            transform: translate(2%, 1%) scale(1.02); 
          }
          50% { 
            transform: translate(-1%, 2%) scale(1.01); 
            opacity: calc(inherit * 1.1);
          }
          75% { 
            transform: translate(-2%, -1%) scale(1.03); 
          }
        }

        @keyframes twinkleStar {
          0%, 100% { 
            opacity: var(--base-opacity); 
            transform: scale(1);
          }
          50% { 
            opacity: calc(var(--base-opacity) * 1.8); 
            transform: scale(1.2);
          }
        }

        @keyframes shootingStar {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(300px) translateY(200px);
            opacity: 0;
          }
        }

        @keyframes gentlePulse {
          0%, 100% { 
            box-shadow: 0 0 2px currentColor, 0 0 4px currentColor; 
          }
          50% { 
            box-shadow: 0 0 4px currentColor, 0 0 8px currentColor, 0 0 12px currentColor; 
          }
        }
      `}</style>
    </div>
  );
};

// Generate star data
function generateStars(count, minOpacity, maxOpacity, minSize, maxSize) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: minSize + Math.random() * (maxSize - minSize),
      opacity: minOpacity + Math.random() * (maxOpacity - minOpacity),
      twinkleDuration: 2 + Math.random() * 4,
      twinkleDelay: Math.random() * 5,
      // Some stars have a subtle color tint
      color: Math.random() > 0.85 
        ? `rgba(167, 139, 250, ${minOpacity + Math.random() * 0.3})` // Purple tint
        : Math.random() > 0.9 
          ? `rgba(147, 197, 253, ${minOpacity + Math.random() * 0.3})` // Blue tint
          : 'white'
    });
  }
  return stars;
}

// Individual Star component
const Star = ({ x, y, size, opacity, twinkleDuration, twinkleDelay, color }) => (
  <div
    className="absolute rounded-full"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      '--base-opacity': opacity,
      opacity: opacity,
      animation: `twinkleStar ${twinkleDuration}s ease-in-out infinite`,
      animationDelay: `${twinkleDelay}s`,
      boxShadow: size > 2 
        ? `0 0 ${size}px ${color === 'white' ? 'rgba(255,255,255,0.5)' : color}` 
        : 'none'
    }}
  />
);

// Shooting stars component
const ShootingStars = ({ count = 3 }) => {
  const [shootingStars, setShootingStars] = useState([]);

  useEffect(() => {
    const createShootingStar = () => {
      const id = Date.now();
      const star = {
        id,
        x: 10 + Math.random() * 60,
        y: Math.random() * 40,
        angle: 30 + Math.random() * 30,
        duration: 1 + Math.random() * 1.5
      };
      
      setShootingStars(prev => [...prev.slice(-count + 1), star]);
      
      // Remove after animation
      setTimeout(() => {
        setShootingStars(prev => prev.filter(s => s.id !== id));
      }, star.duration * 1000);
    };

    // Initial delay
    const initialTimeout = setTimeout(() => {
      createShootingStar();
    }, 3000);

    // Random interval for shooting stars (8-20 seconds)
    const interval = setInterval(() => {
      if (Math.random() > 0.4) { // 60% chance to create
        createShootingStar();
      }
    }, 8000 + Math.random() * 12000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [count]);

  return (
    <>
      {shootingStars.map(star => (
        <div
          key={star.id}
          className="absolute"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: '100px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), white)',
            borderRadius: '2px',
            transform: `rotate(${star.angle}deg)`,
            animation: `shootingStar ${star.duration}s ease-out forwards`,
            boxShadow: '0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(124,58,237,0.5)'
          }}
        />
      ))}
    </>
  );
};

export default SpaceBackground;
