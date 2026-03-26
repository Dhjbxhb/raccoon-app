import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Social Auth Button Icons
 */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);

const GuestIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

/**
 * Social Auth Button Component
 * Reusable button for social authentication methods
 */
export const SocialAuthButton = ({ 
  provider, 
  onClick, 
  loading = false, 
  disabled = false,
  testId,
  className = ''
}) => {
  const providerConfig = {
    google: {
      icon: GoogleIcon,
      label: 'Google',
      bgClass: 'bg-white/5 hover:bg-white/10',
      textClass: 'text-white'
    },
    apple: {
      icon: AppleIcon,
      label: 'Apple',
      bgClass: 'bg-white/5 hover:bg-white/10',
      textClass: 'text-white'
    },
    phone: {
      icon: PhoneIcon,
      label: 'Phone',
      bgClass: 'bg-white/5 hover:bg-white/10',
      textClass: 'text-white'
    },
    guest: {
      icon: GuestIcon,
      label: 'Guest',
      bgClass: 'bg-white/5 hover:bg-white/10',
      textClass: 'text-white'
    }
  };

  const config = providerConfig[provider];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={testId}
      className={`
        flex items-center justify-center gap-2 py-3 px-4 rounded-xl
        border border-white/10 hover:border-white/20
        transition-all duration-200 
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${config.bgClass} ${config.textClass}
        ${className}
      `}
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Icon />
      )}
      <span className="text-sm font-medium">{config.label}</span>
    </button>
  );
};

/**
 * Social Auth Button Grid
 * Pre-configured grid of social auth buttons
 */
export const SocialAuthButtonGrid = ({
  onGoogleClick,
  onAppleClick,
  onPhoneClick,
  onGuestClick,
  loadingProvider = null,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <SocialAuthButton
        provider="google"
        onClick={onGoogleClick}
        loading={loadingProvider === 'google'}
        disabled={disabled || (loadingProvider && loadingProvider !== 'google')}
        testId="social-google-button"
      />
      <SocialAuthButton
        provider="apple"
        onClick={onAppleClick}
        loading={loadingProvider === 'apple'}
        disabled={disabled || (loadingProvider && loadingProvider !== 'apple')}
        testId="social-apple-button"
      />
      <SocialAuthButton
        provider="phone"
        onClick={onPhoneClick}
        loading={loadingProvider === 'phone'}
        disabled={disabled || (loadingProvider && loadingProvider !== 'phone')}
        testId="social-phone-button"
      />
      <SocialAuthButton
        provider="guest"
        onClick={onGuestClick}
        loading={loadingProvider === 'guest'}
        disabled={disabled || (loadingProvider && loadingProvider !== 'guest')}
        testId="social-guest-button"
      />
    </div>
  );
};

export default SocialAuthButton;
