import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Globe, Flag, SkipForward, Shield, Clock, Loader2 } from 'lucide-react';

/**
 * MatchTopBar - Premium top bar for live match controls
 * 
 * Features:
 * - Stranger info (username, country, premium badge)
 * - Report button (always visible)
 * - Skip button (prominent, easy access, with loading state)
 * - Glass-morphism design
 * - Safe area aware (notch/status bar)
 */
const MatchTopBar = ({
  partner,
  sessionDuration = 0,
  onReport,
  onSkip,
  onBack,
  isSearching = false,
  isSkipping = false
}) => {
  const navigate = useNavigate();
  const [avatarFailed, setAvatarFailed] = useState(false);

  // Reset the "image failed to load" flag whenever the partner (and thus the
  // avatar URL) changes, so a new partner's photo gets a fresh chance to load.
  useEffect(() => {
    setAvatarFailed(false);
  }, [partner?.avatar_url]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/dashboard');
    }
  };

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="match-topbar" data-testid="match-topbar">
      {/* Safe area spacer for notch */}
      <div className="match-topbar__safe-area" />
      
      <div className="match-topbar__content">
        {/* Left: Back Button */}
        <button 
          onClick={handleBack}
          className="match-topbar__back"
          data-testid="back-button"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Center: Partner Info */}
        {partner ? (
          <div className="match-topbar__partner" data-testid="partner-info">
            {/* Avatar */}
            <div className="match-topbar__avatar">
              {partner.avatar_url && !avatarFailed ? (
                <img
                  src={partner.avatar_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="match-topbar__avatar-img"
                  onError={() => {
                    console.warn('[MatchTopBar] Partner avatar failed to load:', partner.avatar_url);
                    setAvatarFailed(true);
                  }}
                />
              ) : (
                <span className="match-topbar__avatar-letter">
                  {partner.username?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
              {partner.is_premium && (
                <div className="match-topbar__premium-badge">
                  <Star size={8} className="fill-current" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="match-topbar__info">
              <div className="match-topbar__name-row">
                <span className="match-topbar__name">
                  {partner.username || 'Stranger'}
                  {Number.isInteger(partner.age) && <span className="match-topbar__age">, {partner.age}</span>}
                </span>
                {partner.verified && (
                  <Shield size={12} className="text-blue-400" />
                )}
              </div>
              <div className="match-topbar__location">
                <span className="match-topbar__flag">
                  {partner.country_flag || '🌍'}
                </span>
                <Globe size={10} />
                <span>{partner.country || 'Unknown'}</span>
              </div>
            </div>

            {/* Duration (if active) */}
            {sessionDuration > 0 && (
              <div className="match-topbar__duration">
                <Clock size={12} />
                <span>{formatDuration(sessionDuration)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="match-topbar__searching">
            <span className="match-topbar__searching-text">
              {isSkipping ? 'Skipping...' : isSearching ? 'Finding match...' : 'Connecting...'}
            </span>
          </div>
        )}

        {/* Right: Action Buttons */}
        <div className="match-topbar__actions">
          {/* Report Button */}
          {partner && (
            <button
              onClick={onReport}
              className="match-topbar__report"
              data-testid="report-button"
              aria-label="Report user"
              disabled={isSkipping}
            >
              <Flag size={16} />
              <span className="match-topbar__report-text">Report</span>
            </button>
          )}

          {/* Skip Button */}
          <button
            onClick={onSkip}
            className={`match-topbar__skip ${isSkipping ? 'match-topbar__skip--loading' : ''}`}
            data-testid="skip-button"
            aria-label="Skip to next match"
            disabled={isSkipping}
          >
            {isSkipping ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Skipping...</span>
              </>
            ) : (
              <>
                <SkipForward size={16} />
                <span>Skip</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchTopBar;
