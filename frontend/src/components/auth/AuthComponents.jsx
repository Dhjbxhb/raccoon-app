import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { RaccoonIcon } from '@/components/branding/RaccoonLogo';
import SpaceBackground from '@/components/background/SpaceBackground';

/**
 * Premium Auth Layout - Shared wrapper for Login/Signup pages
 * Features: Dark glassmorphism, centered card, consistent styling
 */
const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Cinematic space background */}
      <SpaceBackground intensity="minimal" showNebula={true} showShootingStars={false} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
};

/**
 * Premium Auth Card - Glassmorphism card for auth forms
 */
const AuthCard = ({ 
  title, 
  subtitle, 
  children, 
  showBackButton = true,
  backLink = '/',
  backText = 'Back to Home'
}) => {
  return (
    <div className="space-y-4">
      {/* Back Button */}
      {showBackButton && (
        <Link
          to={backLink}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>{backText}</span>
        </Link>
      )}

      {/* Card */}
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#7c3aed]/20 to-[#4f46e5]/20 rounded-[28px] blur-xl opacity-60" />
        
        {/* Card content */}
        <div className="relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Premium Raccoon Logo */}
            <div className="relative w-20 h-20 mx-auto mb-5">
              {/* Glow behind logo */}
              <div 
                className="absolute inset-0 rounded-2xl animate-pulse"
                style={{
                  background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)',
                  transform: 'scale(1.5)',
                  filter: 'blur(15px)'
                }}
              />
              {/* Logo container */}
              <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.4)]">
                <RaccoonIcon size={48} />
              </div>
            </div>
            <h1 
              className="text-2xl font-bold text-white mb-1"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {title}
            </h1>
            <p 
              className="text-gray-400 text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Auth Input - Consistent input styling
 */
const AuthInput = ({ 
  label, 
  icon: Icon, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  required = false,
  autoComplete,
  testId
}) => {
  return (
    <div>
      <label 
        className="block text-sm font-medium text-gray-300 mb-2"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          data-testid={testId}
          className={`w-full bg-black/40 border border-white/10 focus:border-[#7c3aed]/60 focus:ring-2 focus:ring-[#7c3aed]/20 rounded-xl h-12 ${Icon ? 'pl-11' : 'pl-4'} pr-4 text-white placeholder:text-gray-500 outline-none transition-all`}
          style={{ fontFamily: 'Manrope, sans-serif' }}
        />
      </div>
    </div>
  );
};

/**
 * Auth Button - Primary action button
 */
const AuthButton = ({ 
  children, 
  loading, 
  disabled, 
  type = 'submit',
  onClick,
  testId,
  variant = 'primary'
}) => {
  const baseClasses = "w-full py-3.5 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#8b5cf6] hover:to-[#a855f7] text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] hover:scale-[1.02] active:scale-[0.98]",
    secondary: "bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white"
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      data-testid={testId}
      className={`${baseClasses} ${variants[variant]}`}
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Loading...
        </>
      ) : children}
    </button>
  );
};

/**
 * Auth Divider - "or continue with" divider
 */
const AuthDivider = ({ text = 'or continue with' }) => {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <span 
        className="text-gray-500 text-xs uppercase tracking-wider"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {text}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
};

/**
 * Social Auth Button
 */
const SocialButton = ({ 
  provider, 
  onClick, 
  loading, 
  disabled,
  testId 
}) => {
  const icons = {
    google: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    apple: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    ),
    phone: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
      </svg>
    ),
    guest: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4"/>
        <path d="M20 21a8 8 0 10-16 0"/>
      </svg>
    )
  };

  const labels = {
    google: 'Google',
    apple: 'Apple',
    phone: 'Phone',
    guest: 'Guest'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={testId}
      className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2.5 border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed group"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <span className="group-hover:scale-110 transition-transform">{icons[provider]}</span>
      )}
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{labels[provider]}</span>
    </button>
  );
};

/**
 * Auth Footer Link
 */
const AuthFooterLink = ({ text, linkText, linkTo }) => {
  return (
    <p 
      className="text-center text-sm text-gray-500 mt-6"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {text}{' '}
      <Link 
        to={linkTo} 
        className="text-[#7c3aed] hover:text-[#a855f7] font-medium transition-colors"
      >
        {linkText}
      </Link>
    </p>
  );
};

export { 
  AuthLayout, 
  AuthCard, 
  AuthInput, 
  AuthButton, 
  AuthDivider, 
  SocialButton,
  AuthFooterLink 
};
