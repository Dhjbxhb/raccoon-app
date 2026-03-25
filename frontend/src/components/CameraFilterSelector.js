import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CAMERA_FILTERS } from '@/hooks/useCameraFilters';
import { Crown } from 'lucide-react';

/**
 * Snapchat-style swipeable camera filter selector
 * - Horizontal swipe to change filters
 * - Circular icons with center = active
 * - Smooth transitions and real-time preview
 */
const CameraFilterSelector = ({ 
  currentFilter, 
  onFilterChange, 
  isPremium,
  onPremiumRequired,
  visible = true 
}) => {
  const filterKeys = Object.keys(CAMERA_FILTERS);
  const currentIndex = filterKeys.indexOf(currentFilter) || 0;
  
  const containerRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  
  // Number of visible icons on each side
  const visibleSideIcons = 2;

  // Get visible filter indices
  const getVisibleIndices = useCallback(() => {
    const indices = [];
    for (let i = -visibleSideIcons; i <= visibleSideIcons; i++) {
      let idx = currentIndex + i;
      if (idx < 0) idx = filterKeys.length + idx;
      if (idx >= filterKeys.length) idx = idx - filterKeys.length;
      indices.push({ index: idx, offset: i });
    }
    return indices;
  }, [currentIndex, filterKeys.length]);

  // Handle filter change with premium check
  const changeToFilter = useCallback((newIndex) => {
    if (animating) return;
    
    // Normalize index
    let normalizedIndex = newIndex;
    if (normalizedIndex < 0) normalizedIndex = filterKeys.length - 1;
    if (normalizedIndex >= filterKeys.length) normalizedIndex = 0;
    
    const filterKey = filterKeys[normalizedIndex];
    const filter = CAMERA_FILTERS[filterKey];
    
    // Check premium
    if (filter.premium && !isPremium) {
      onPremiumRequired?.();
      return;
    }
    
    setAnimating(true);
    onFilterChange(filterKey);
    
    setTimeout(() => setAnimating(false), 150);
  }, [filterKeys, isPremium, onFilterChange, onPremiumRequired, animating]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e) => {
    setTouchStart(e.touches[0].clientX);
    setIsDragging(true);
    setTouchDelta(0);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStart === null) return;
    
    const currentX = e.touches[0].clientX;
    const delta = currentX - touchStart;
    setTouchDelta(delta);
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(touchDelta) > threshold) {
      if (touchDelta > 0) {
        // Swipe right = previous filter
        changeToFilter(currentIndex - 1);
      } else {
        // Swipe left = next filter
        changeToFilter(currentIndex + 1);
      }
    }
    
    setTouchStart(null);
    setTouchDelta(0);
    setIsDragging(false);
  }, [isDragging, touchDelta, currentIndex, changeToFilter]);

  // Mouse handlers for desktop
  const handleMouseDown = useCallback((e) => {
    setTouchStart(e.clientX);
    setIsDragging(true);
    setTouchDelta(0);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || touchStart === null) return;
    
    const delta = e.clientX - touchStart;
    setTouchDelta(delta);
  }, [isDragging, touchStart]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    const threshold = 50;
    
    if (Math.abs(touchDelta) > threshold) {
      if (touchDelta > 0) {
        changeToFilter(currentIndex - 1);
      } else {
        changeToFilter(currentIndex + 1);
      }
    }
    
    setTouchStart(null);
    setTouchDelta(0);
    setIsDragging(false);
  }, [isDragging, touchDelta, currentIndex, changeToFilter]);

  // Cleanup mouse events
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, handleMouseUp]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!visible) return;
      
      if (e.key === 'ArrowLeft') {
        changeToFilter(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        changeToFilter(currentIndex + 1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, currentIndex, changeToFilter]);

  if (!visible) return null;

  const visibleFilters = getVisibleIndices();
  const currentFilterData = CAMERA_FILTERS[filterKeys[currentIndex]];
  const dragOffset = isDragging ? touchDelta * 0.3 : 0;

  return (
    <div 
      className="camera-filter-selector"
      data-testid="camera-filter-selector"
    >
      {/* Filter name display */}
      <div 
        className="filter-name-display"
        style={{
          opacity: animating ? 0.5 : 1,
          transform: `translateY(${animating ? -5 : 0}px)`,
        }}
      >
        <span className="filter-icon">{currentFilterData?.icon}</span>
        <span className="filter-name">{currentFilterData?.name}</span>
        {currentFilterData?.premium && !isPremium && (
          <Crown size={12} className="premium-crown" />
        )}
      </div>

      {/* Swipeable filter carousel */}
      <div
        ref={containerRef}
        className="filter-carousel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => isDragging && handleMouseUp()}
        data-testid="filter-carousel"
      >
        <div 
          className="filter-track"
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {visibleFilters.map(({ index, offset }) => {
            const filterKey = filterKeys[index];
            const filter = CAMERA_FILTERS[filterKey];
            const isCenter = offset === 0;
            const isLocked = filter.premium && !isPremium;
            
            // Calculate scale and opacity based on distance from center
            const distance = Math.abs(offset);
            const scale = isCenter ? 1 : 0.7 - (distance - 1) * 0.1;
            const opacity = isCenter ? 1 : 0.5 - (distance - 1) * 0.15;
            
            return (
              <button
                key={`${filterKey}-${offset}`}
                className={`filter-icon-btn ${isCenter ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                onClick={() => !isDragging && changeToFilter(index)}
                style={{
                  transform: `scale(${scale})`,
                  opacity: Math.max(0.2, opacity),
                  zIndex: isCenter ? 10 : 5 - distance,
                }}
                data-testid={`filter-${filterKey}`}
              >
                <span className="icon-emoji">{filter.icon}</span>
                {isLocked && (
                  <div className="lock-overlay">
                    <Crown size={10} />
                  </div>
                )}
                {isCenter && <div className="active-ring" />}
              </button>
            );
          })}
        </div>

        {/* Swipe hint indicators */}
        <div className="swipe-hints">
          <div className="hint-arrow left">‹</div>
          <div className="hint-arrow right">›</div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="filter-dots">
        {filterKeys.map((key, idx) => (
          <button
            key={key}
            className={`dot ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => changeToFilter(idx)}
            aria-label={`Select ${CAMERA_FILTERS[key].name} filter`}
          />
        ))}
      </div>

      <style jsx>{`
        .camera-filter-selector {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px;
          user-select: none;
          -webkit-user-select: none;
        }

        .filter-name-display {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.15s ease;
        }

        .filter-icon {
          font-size: 16px;
        }

        .filter-name {
          font-size: 13px;
          font-weight: 600;
          color: white;
        }

        .premium-crown {
          color: #fbbf24;
          margin-left: 2px;
        }

        .filter-carousel {
          position: relative;
          width: 100%;
          max-width: 280px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          touch-action: pan-y;
        }

        .filter-carousel:active {
          cursor: grabbing;
        }

        .filter-track {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          will-change: transform;
        }

        .filter-icon-btn {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(30, 30, 40, 0.9);
          border: 2px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          flex-shrink: 0;
          backdrop-filter: blur(8px);
        }

        .filter-icon-btn:hover:not(.locked) {
          border-color: rgba(124, 58, 237, 0.5);
          background: rgba(124, 58, 237, 0.2);
        }

        .filter-icon-btn.active {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.4), rgba(168, 85, 247, 0.4));
          border-color: rgba(124, 58, 237, 0.8);
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.1);
        }

        .filter-icon-btn.locked {
          opacity: 0.6;
        }

        .icon-emoji {
          font-size: 22px;
          line-height: 1;
        }

        .filter-icon-btn.active .icon-emoji {
          font-size: 26px;
        }

        .lock-overlay {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(0, 0, 0, 0.8);
        }

        .lock-overlay svg {
          color: white;
        }

        .active-ring {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(124, 58, 237, 0.6);
          animation: pulse-ring 1.5s infinite;
        }

        @keyframes pulse-ring {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.1);
          }
        }

        .swipe-hints {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          pointer-events: none;
          padding: 0 4px;
        }

        .hint-arrow {
          font-size: 20px;
          color: rgba(255, 255, 255, 0.3);
          animation: hint-fade 2s infinite;
        }

        .hint-arrow.left {
          animation-delay: 0s;
        }

        .hint-arrow.right {
          animation-delay: 1s;
        }

        @keyframes hint-fade {
          0%, 100% { opacity: 0.2; transform: translateX(0); }
          50% { opacity: 0.5; }
        }

        .hint-arrow.left {
          animation: hint-left 2s infinite;
        }

        .hint-arrow.right {
          animation: hint-right 2s infinite;
        }

        @keyframes hint-left {
          0%, 100% { opacity: 0.2; transform: translateX(0); }
          50% { opacity: 0.4; transform: translateX(-3px); }
        }

        @keyframes hint-right {
          0%, 100% { opacity: 0.2; transform: translateX(0); }
          50% { opacity: 0.4; transform: translateX(3px); }
        }

        .filter-dots {
          display: flex;
          gap: 6px;
          padding: 4px;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }

        .dot:hover {
          background: rgba(255, 255, 255, 0.5);
        }

        .dot.active {
          width: 18px;
          border-radius: 10px;
          background: linear-gradient(90deg, #7c3aed, #a855f7);
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .filter-carousel {
            max-width: 240px;
          }
          
          .filter-icon-btn {
            width: 42px;
            height: 42px;
          }
          
          .filter-icon-btn.active {
            width: 50px;
            height: 50px;
          }
          
          .icon-emoji {
            font-size: 18px;
          }
          
          .filter-icon-btn.active .icon-emoji {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
};

export default CameraFilterSelector;
