import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, X, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { VIDEO_FILTERS, getOrderedFilters, isFilterFree } from '@/utils/videoFilters';
import { PremiumPromptModal } from '@/components/premium/PremiumGate';
import '@/styles/filters.css';

/**
 * CameraFilters - Premium Face-Focused Camera Filter Selector
 * 
 * RULES:
 * - First 3 filters (None, Beauty, Warm) are FREE
 * - All other filters require Premium
 * - Filters are visible to both users (processed via canvas)
 * - Swipe/drag to navigate, tap to select
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
  const navigate = useNavigate();
  const filters = useMemo(() => getOrderedFilters(), []);
  const filterIds = useMemo(() => filters.map(f => f.id), [filters]);
  const currentIndex = filterIds.indexOf(currentFilter);
  
  // Touch/drag state
  const containerRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Premium prompt modal state
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [premiumFilterName, setPremiumFilterName] = useState('');
  
  // Count free vs premium filters for UI
  const freeCount = filters.filter(f => !f.premium).length;
  const premiumCount = filters.filter(f => f.premium).length;
  
  // Haptic feedback
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
  
  // Handle premium upgrade navigation
  const handlePremiumUpgrade = useCallback(() => {
    setShowPremiumPrompt(false);
    if (onPremiumRequired) {
      onPremiumRequired();
    } else {
      navigate('/premium');
    }
  }, [onPremiumRequired, navigate]);

  // Show premium prompt with filter name
  const showPremiumModal = useCallback((filterName) => {
    setPremiumFilterName(filterName);
    setShowPremiumPrompt(true);
  }, []);

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
      showPremiumModal(`${filter.name} Filter`);
      vibrate();
      return;
    }
    
    setIsAnimating(true);
    vibrate();
    onFilterChange(filter.id);
    
    requestAnimationFrame(() => {
      setTimeout(() => setIsAnimating(false), 150);
    });
  }, [filters, filterIds.length, isPremium, onFilterChange, isAnimating, vibrate, showPremiumModal]);
  
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
    
    const threshold = 40;
    
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
  
  // Mouse handlers
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
      {/* Close button */}
      {onClose && !compact && (
        <button 
          className="camera-filters__close"
          onClick={onClose}
          data-testid="close-camera-filters"
        >
          <X size={16} />
        </button>
      )}
      
      {/* Filter name + status */}
      <div 
        className={`camera-filters__label ${isAnimating ? 'camera-filters__label--animating' : ''}`}
      >
        <span className="camera-filters__label-icon">{currentFilterData.icon}</span>
        <span className="camera-filters__label-name">{currentFilterData.name}</span>
        {isLocked && <Crown size={12} className="camera-filters__label-crown" />}
        {!currentFilterData.premium && currentFilterData.id !== 'none' && (
          <span className="camera-filters__label-free">FREE</span>
        )}
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
        {/* Left arrow */}
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
                  ${!filter.premium && filter.id !== 'none' ? 'camera-filters__icon--free' : ''}
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
                    <Lock size={8} />
                  </div>
                )}
                
                {/* Free badge (for non-active free filters) */}
                {!filter.premium && filter.id !== 'none' && !isCenter && (
                  <div className="camera-filters__icon-free-badge" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Right arrow */}
        <button 
          className="camera-filters__arrow camera-filters__arrow--right"
          onClick={goToNext}
          aria-label="Next filter"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      
      {/* Filter type indicator */}
      {!compact && (
        <div className="camera-filters__info">
          <span className="camera-filters__info-free">{freeCount} Free</span>
          <span className="camera-filters__info-divider">|</span>
          <span className="camera-filters__info-premium">
            <Crown size={10} className="inline mr-1" />
            {premiumCount} Premium
          </span>
        </div>
      )}
      
      {/* Dot indicators */}
      {!compact && (
        <div className="camera-filters__dots">
          {filterIds.map((id, idx) => {
            const filter = VIDEO_FILTERS[id];
            const dotLocked = filter?.premium && !isPremium;
            const dotFree = !filter?.premium && id !== 'none';
            return (
              <button
                key={id}
                className={`
                  camera-filters__dot
                  ${idx === currentIndex ? 'camera-filters__dot--active' : ''}
                  ${dotLocked ? 'camera-filters__dot--locked' : ''}
                  ${dotFree ? 'camera-filters__dot--free' : ''}
                `}
                onClick={() => changeToIndex(idx)}
                aria-label={`Select ${filter?.name || 'filter'}`}
              />
            );
          })}
        </div>
      )}
      
      {/* Swipe hint */}
      {!compact && (
        <div className="camera-filters__hint">
          Swipe to change filter
        </div>
      )}

      {/* Premium Prompt Modal */}
      <PremiumPromptModal
        isOpen={showPremiumPrompt}
        onClose={() => setShowPremiumPrompt(false)}
        featureName={premiumFilterName}
        onUpgrade={handlePremiumUpgrade}
      />
    </div>
  );
};

export default CameraFilters;
