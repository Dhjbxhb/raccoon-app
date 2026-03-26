import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Premium Button Component
 * Unified design system for all buttons across the app
 * 
 * Variants:
 * - primary: Purple gradient, main CTA
 * - secondary: Transparent with border
 * - ghost: Minimal, text-like
 * - danger: Red for destructive actions
 * 
 * Sizes:
 * - sm: Compact
 * - md: Default
 * - lg: Large CTA
 * - xl: Hero buttons
 */

const buttonVariants = {
  primary: `
    bg-gradient-to-r from-[#7c3aed] to-[#9333ea] 
    hover:from-[#8b5cf6] hover:to-[#a855f7] 
    text-white font-semibold
    shadow-[0_0_20px_rgba(124,58,237,0.3)] 
    hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]
    active:shadow-[0_0_15px_rgba(124,58,237,0.4)]
    border-0
  `,
  secondary: `
    bg-white/5 hover:bg-white/10 
    text-white font-medium
    border border-white/10 hover:border-white/20
    active:bg-white/15
  `,
  ghost: `
    bg-transparent hover:bg-white/5 
    text-gray-400 hover:text-white font-medium
    border-0
    active:bg-white/10
  `,
  danger: `
    bg-gradient-to-r from-red-600 to-red-500 
    hover:from-red-500 hover:to-red-400 
    text-white font-semibold
    shadow-[0_0_15px_rgba(239,68,68,0.3)] 
    hover:shadow-[0_0_25px_rgba(239,68,68,0.5)]
    border-0
  `,
  outline: `
    bg-transparent 
    text-[#a855f7] hover:text-white
    border border-[#7c3aed]/50 hover:border-[#7c3aed]
    hover:bg-[#7c3aed]/10
    font-medium
  `
};

const buttonSizes = {
  sm: 'h-9 px-4 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-6 text-sm rounded-xl gap-2',
  lg: 'h-12 px-8 text-base rounded-xl gap-2.5',
  xl: 'h-14 px-10 text-lg rounded-2xl gap-3'
};

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  onClick,
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center',
        'transition-all duration-200 ease-out',
        'transform hover:scale-[1.02] active:scale-[0.98]',
        'focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:ring-offset-2 focus:ring-offset-[#0a0a12]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100',
        
        // Variant styles
        buttonVariants[variant],
        
        // Size styles
        buttonSizes[size],
        
        // Full width
        fullWidth && 'w-full',
        
        // Custom classes
        className
      )}
      style={{ fontFamily: 'Manrope, sans-serif' }}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      
      {/* Left icon */}
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className="w-4 h-4 flex-shrink-0" />
      )}
      
      {/* Content */}
      <span className={loading ? 'opacity-70' : ''}>
        {children}
      </span>
      
      {/* Right icon */}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 flex-shrink-0" />
      )}
    </button>
  );
});

Button.displayName = 'Button';

/**
 * Icon Button - Square button for icons only
 */
export const IconButton = React.forwardRef(({
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconInnerSizes = {
    sm: 16,
    md: 18,
    lg: 20
  };

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl',
        'transition-all duration-200 ease-out',
        'transform hover:scale-105 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        buttonVariants[variant],
        iconSizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        Icon && <Icon size={iconInnerSizes[size]} />
      )}
    </button>
  );
});

IconButton.displayName = 'IconButton';

export default Button;
