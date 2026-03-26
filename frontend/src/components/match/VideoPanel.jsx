import React, { forwardRef } from 'react';
import { Loader2, User } from 'lucide-react';

/**
 * VideoPanel - Reusable video container for Match page
 * 
 * Props:
 * - videoRef: React ref for the video element
 * - label: Label text (e.g., "You", "Stranger")
 * - isLocal: Boolean - true for local video (muted, mirrored)
 * - isConnecting: Boolean - show connecting placeholder
 * - username: Username for connecting placeholder
 * - filterStyle: CSS filter string for video effects
 * - labelPosition: 'top-left' | 'top-right' (default based on isLocal)
 * - children: Additional overlay content (filters, games)
 * - onTouchStart/onTouchEnd: Touch handlers for swipe gestures
 */
const VideoPanel = forwardRef(({
  videoRef,
  label = 'User',
  isLocal = false,
  isConnecting = false,
  username = 'Stranger',
  filterStyle = 'none',
  labelPosition,
  children,
  onTouchStart,
  onTouchEnd,
  className = '',
  ...props
}, ref) => {
  // Default label position based on local/remote
  const position = labelPosition || (isLocal ? 'top-left' : 'top-right');
  
  // Label indicator colors
  const indicatorColor = isLocal ? 'bg-green-500' : 'bg-blue-500';
  
  return (
    <div 
      ref={ref}
      className={`video-panel ${isLocal ? 'video-panel--local' : 'video-panel--remote'} ${className}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid={isLocal ? 'local-video-panel' : 'remote-video-panel'}
      {...props}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`video-panel__video ${isLocal ? 'video-panel__video--mirrored' : ''}`}
        style={{ filter: filterStyle }}
      />
      
      {/* Connecting Placeholder (for remote video) */}
      {!isLocal && isConnecting && (
        <div className="video-panel__placeholder">
          <div className="video-panel__placeholder-content">
            <div className="video-panel__placeholder-avatar">
              <Loader2 size={32} className="video-panel__spinner" />
            </div>
            <p className="video-panel__placeholder-text">
              Connecting to {username}...
            </p>
          </div>
        </div>
      )}
      
      {/* No Camera Placeholder (for local video) */}
      {isLocal && !videoRef?.current?.srcObject && (
        <div className="video-panel__placeholder video-panel__placeholder--local">
          <div className="video-panel__placeholder-content">
            <div className="video-panel__placeholder-avatar video-panel__placeholder-avatar--local">
              <User size={32} className="text-white/60" />
            </div>
            <p className="video-panel__placeholder-text">
              Camera starting...
            </p>
          </div>
        </div>
      )}
      
      {/* Label Badge */}
      <div className={`video-panel__label video-panel__label--${position}`}>
        <div className={`video-panel__indicator ${indicatorColor}`} />
        <span>{label}</span>
      </div>
      
      {/* Custom overlay content (filters, games, etc.) */}
      {children}
    </div>
  );
});

VideoPanel.displayName = 'VideoPanel';

export default VideoPanel;
