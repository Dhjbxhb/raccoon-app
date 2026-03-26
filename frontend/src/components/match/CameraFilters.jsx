import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Crown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { VIDEO_FILTERS, getOrderedFilters, getCSSFilter } from '@/utils/videoFilters';
import '@/styles/filters.css';

/**
 * CameraFilters - Premium swipe-based camera filter selector
 * 
 * Features:
 * - Horizontal swipe interaction (touch + mouse)
 * - Circular filter icons with center selection
 * - Real-time filter preview
 * - Premium lock indicators
 * - Smooth 60fps animations
 * - Mobile-optimized performance
 */
const CameraFilters = ({
  currentFilter = 'none',
  onFilterChange,
  isPremium = false,
  onPremiumRequired,
  visible = true,
  onClose,
  compact = false
}) => {
  const filters = useMemo(() => getOrderedFilters(), []);
  const filterIds = useMemo(() => filters.map(f => f.id), [filters]);
  const currentIndex = filterIds.indexOf(currentFilter);
  
  // Touch/drag state
  const containerRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Haptic feedback (if available)
  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  }, []);
  
  // Visible icons count on each side
  const visibleSide = compact ? 1 : 2;
  
  // Get visible filter indices (circular)
  const getVisibleIndices = useCallback(() => {
    const indices = [];
    for (let i = -visibleSide; i <= visibleSide; i++) {
      let idx = currentIndex + i;
      if (idx < 0) idx = filterIds.length + idx;
      if (idx >= filterIds.length) idx = idx % filterIds.length;
      indices.push({ index: idx, offset: i });
    }
    return indices;
  }, [currentIndex, filterIds.length, visibleSide]);
  
  // Handle filter change with premium check
  const changeToIndex = useCallback((newIndex) => {
    if (isAnimating) return;
    
    // Normalize index (circular)
    let normalizedIndex = newIndex;
    if (normalizedIndex < 0) normalizedIndex = filterIds.length - 1;
    if (normalizedIndex >= filterIds.length) normalizedIndex = 0;
    
    const filter = filters[normalizedIndex];
    
    // Premium check
    if (filter.premium && !isPremium) {
      onPremiumRequired?.();
      vibrate();
      return;
    }
    
    setIsAnimating(true);
    vibrate();
    onFilterChange(filter.id);
    
    // Reset animation state
    requestAnimationFrame(() => {
      setTimeout(() => setIsAnimating(false), 150);
    });
  }, [filters, filterIds.length, isPremium, onFilterChange, onPremiumRequired, isAnimating, vibrate]);
  
  // Navigate to previous/next
  const goToPrevious = useCallback(() => changeToIndex(currentIndex - 1), [changeToIndex, currentIndex]);
  const goToNext = useCallback(() => changeToIndex(currentIndex + 1), [changeToIndex, currentIndex]);
  
  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    setTouchStart(e.touches[0].clientX);
    setIsDragging(true);
    setTouchDelta(0);
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    if (touchStart === null) return;
    const delta = e.touches[0].clientX - touchStart;
    setTouchDelta(delta);
  }, [touchStart]);
  
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    const threshold = 40; // Swipe sensitivity
    
    if (Math.abs(touchDelta) > threshold) {
      if (touchDelta > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }
    
    setTouchStart(null);
    setTouchDelta(0);
    setIsDragging(false);
  }, [isDragging, touchDelta, goToPrevious, goToNext]);
  
  // Mouse handlers (desktop swipe)
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setTouchStart(e.clientX);
    setIsDragging(true);
    setTouchDelta(0);
  }, []);
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || touchStart === null) return;
    setTouchDelta(e.clientX - touchStart);
  }, [isDragging, touchStart]);
  
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    const threshold = 40;
    
    if (Math.abs(touchDelta) > threshold) {
      touchDelta > 0 ? goToPrevious() : goToNext();
    }
    
    setTouchStart(null);
    setTouchDelta(0);
    setIsDragging(false);
  }, [isDragging, touchDelta, goToPrevious, goToNext]);
  
  // Global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) handleMouseUp();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, handleMouseUp]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'Escape' && onClose) onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, goToPrevious, goToNext, onClose]);
  
  if (!visible) return null;
  
  const visibleFilters = getVisibleIndices();
  const currentFilterData = filters[currentIndex] || VIDEO_FILTERS.none;
  const dragOffset = isDragging ? touchDelta * 0.4 : 0;
  const isLocked = currentFilterData.premium && !isPremium;
  
  return (
    <div 
      className={`camera-filters ${compact ? 'camera-filters--compact' : ''}`}
      data-testid="camera-filters"
    >
      {/* Close button (if provided) */}
      {onClose && !compact && (
        <button 
          className="camera-filters__close"
          onClick={onClose}
          data-testid="close-camera-filters"
        >
          <X size={16} />
        </button>
      )}
      
      {/* Filter name + category badge */}
      <div 
        className={`camera-filters__label ${isAnimating ? 'camera-filters__label--animating' : ''}`}
      >
        <span className="camera-filters__label-icon">{currentFilterData.icon}</span>
        <span className="camera-filters__label-name">{currentFilterData.name}</span>
        {isLocked && <Crown size={12} className="camera-filters__label-crown" />}
      </div>
      
      {/* Swipeable carousel */}
      <div 
        ref={containerRef}
        className="camera-filters__carousel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => isDragging && handleMouseUp()}
        data-testid="camera-filters-carousel"
      >
        {/* Left arrow hint */}
        <button 
          className="camera-filters__arrow camera-filters__arrow--left"
          onClick={goToPrevious}
          aria-label="Previous filter"
        >
          <ChevronLeft size={18} />
        </button>
        
        {/* Filter track */}
        <div 
          className="camera-filters__track"
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          {visibleFilters.map(({ index, offset }) => {
            const filter = filters[index];
            const isCenter = offset === 0;
            const filterLocked = filter.premium && !isPremium;
            
            // Scale and opacity based on distance from center
            const distance = Math.abs(offset);
            const scale = isCenter ? 1 : Math.max(0.55, 0.75 - distance * 0.1);
            const opacity = isCenter ? 1 : Math.max(0.3, 0.6 - distance * 0.15);
            
            return (
              <button
                key={`${filter.id}-${offset}`}
                className={`
                  camera-filters__icon
                  ${isCenter ? 'camera-filters__icon--active' : ''}
                  ${filterLocked ? 'camera-filters__icon--locked' : ''}
                `}
                onClick={() => !isDragging && changeToIndex(index)}
                style={{
                  transform: `scale(${scale})`,
                  opacity,
                  zIndex: isCenter ? 10 : 5 - distance
                }}
                data-testid={`camera-filter-${filter.id}`}
                aria-label={`${filter.name} filter${filterLocked ? ' (Premium)' : ''}`}
              >
                <span className="camera-filters__icon-emoji">{filter.icon}</span>
                
                {/* Active ring */}
                {isCenter && <div className="camera-filters__icon-ring" />}
                
                {/* Premium lock badge */}
                {filterLocked && (
                  <div className="camera-filters__icon-lock">
                    <Crown size={8} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Right arrow hint */}
        <button 
          className="camera-filters__arrow camera-filters__arrow--right"
          onClick={goToNext}
          aria-label="Next filter"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      
      {/* Dot indicators */}
      {!compact && (
        <div className="camera-filters__dots">
          {filterIds.map((id, idx) => {
            const filter = VIDEO_FILTERS[id];
            const dotLocked = filter?.premium && !isPremium;
            return (
              <button
                key={id}
                className={`
                  camera-filters__dot
                  ${idx === currentIndex ? 'camera-filters__dot--active' : ''}
                  ${dotLocked ? 'camera-filters__dot--locked' : ''}
                `}
                onClick={() => changeToIndex(idx)}
                aria-label={`Select ${filter?.name || 'filter'}`}
              />
            );
          })}
        </div>
      )}
      
      {/* Swipe hint text (mobile only) */}
      {!compact && (
        <div className="camera-filters__hint">
          Swipe to change filter
        </div>
      )}
    </div>
  );
};

export default CameraFilters;
