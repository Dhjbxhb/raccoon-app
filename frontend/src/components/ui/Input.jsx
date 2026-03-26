import React, { useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

/**
 * Premium Input Component
 * Unified design system for all form inputs across the app
 * 
 * Features:
 * - Focus glow effect
 * - Error state with message
 * - Success state
 * - Disabled state
 * - Icon support (left/right)
 * - Password visibility toggle
 * - Consistent sizing and styling
 */

export const Input = forwardRef(({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  success,
  disabled = false,
  required = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  inputClassName = '',
  hint,
  autoComplete,
  'data-testid': testId,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const hasIcon = !!Icon;
  const hasError = !!error;
  const hasSuccess = success && !hasError;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      {label && (
        <label 
          className="block text-sm font-medium text-gray-300"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Focus glow effect */}
        {isFocused && !disabled && (
          <div 
            className="absolute -inset-0.5 rounded-xl opacity-75 blur-sm transition-opacity pointer-events-none"
            style={{
              background: hasError 
                ? 'linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.2))' 
                : hasSuccess 
                  ? 'linear-gradient(90deg, rgba(34,197,94,0.3), rgba(34,197,94,0.2))'
                  : 'linear-gradient(90deg, rgba(124,58,237,0.4), rgba(147,51,234,0.3))'
            }}
          />
        )}

        {/* Left Icon */}
        {hasIcon && iconPosition === 'left' && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <Icon 
              className={cn(
                'w-[18px] h-[18px] transition-colors',
                hasError ? 'text-red-400' : 
                hasSuccess ? 'text-green-400' :
                isFocused ? 'text-[#a855f7]' : 'text-gray-500'
              )} 
            />
          </div>
        )}

        {/* Input Field */}
        <input
          ref={ref}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          data-testid={testId}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            // Base styles
            'relative w-full h-12 rounded-xl outline-none transition-all duration-200',
            'bg-black/40 backdrop-blur-sm',
            'text-white placeholder:text-gray-500',
            'border',
            
            // Border states
            hasError 
              ? 'border-red-500/50 focus:border-red-500/70' 
              : hasSuccess 
                ? 'border-green-500/50 focus:border-green-500/70'
                : 'border-white/10 focus:border-[#7c3aed]/60',
            
            // Focus ring
            'focus:ring-2',
            hasError 
              ? 'focus:ring-red-500/20' 
              : hasSuccess 
                ? 'focus:ring-green-500/20'
                : 'focus:ring-[#7c3aed]/20',
            
            // Padding with icons
            hasIcon && iconPosition === 'left' ? 'pl-11' : 'pl-4',
            isPassword || (hasIcon && iconPosition === 'right') ? 'pr-11' : 'pr-4',
            
            // Disabled state
            disabled && 'opacity-50 cursor-not-allowed bg-white/5',
            
            // Custom class
            inputClassName
          )}
          style={{ fontFamily: 'Manrope, sans-serif' }}
          {...props}
        />

        {/* Right Icon / Password Toggle / Status Icon */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
          {/* Status icons */}
          {hasError && !isPassword && (
            <AlertCircle className="w-[18px] h-[18px] text-red-400" />
          )}
          {hasSuccess && !isPassword && (
            <Check className="w-[18px] h-[18px] text-green-400" />
          )}
          
          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-[18px] h-[18px]" />
              ) : (
                <Eye className="w-[18px] h-[18px]" />
              )}
            </button>
          )}

          {/* Right icon (if not password) */}
          {!isPassword && hasIcon && iconPosition === 'right' && !hasError && !hasSuccess && (
            <Icon 
              className={cn(
                'w-[18px] h-[18px] transition-colors',
                isFocused ? 'text-[#a855f7]' : 'text-gray-500'
              )} 
            />
          )}
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <p 
          className="text-sm text-red-400 flex items-center gap-1.5"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Hint Text */}
      {hint && !hasError && (
        <p 
          className="text-xs text-gray-500"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Textarea Component - Multi-line input
 */
export const Textarea = forwardRef(({
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  rows = 4,
  className = '',
  'data-testid': testId,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = !!error;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label 
          className="block text-sm font-medium text-gray-300"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {isFocused && !disabled && (
          <div 
            className="absolute -inset-0.5 rounded-xl opacity-75 blur-sm transition-opacity pointer-events-none"
            style={{
              background: hasError 
                ? 'linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.2))' 
                : 'linear-gradient(90deg, rgba(124,58,237,0.4), rgba(147,51,234,0.3))'
            }}
          />
        )}

        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          data-testid={testId}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            'relative w-full rounded-xl outline-none transition-all duration-200',
            'bg-black/40 backdrop-blur-sm',
            'text-white placeholder:text-gray-500',
            'border p-4',
            'resize-none',
            hasError 
              ? 'border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20' 
              : 'border-white/10 focus:border-[#7c3aed]/60 focus:ring-2 focus:ring-[#7c3aed]/20',
            disabled && 'opacity-50 cursor-not-allowed bg-white/5'
          )}
          style={{ fontFamily: 'Manrope, sans-serif' }}
          {...props}
        />
      </div>

      {hasError && (
        <p 
          className="text-sm text-red-400 flex items-center gap-1.5"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

/**
 * Select Component - Dropdown select
 */
export const Select = forwardRef(({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  disabled = false,
  required = false,
  className = '',
  'data-testid': testId,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = !!error;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label 
          className="block text-sm font-medium text-gray-300"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {isFocused && !disabled && (
          <div 
            className="absolute -inset-0.5 rounded-xl opacity-75 blur-sm transition-opacity pointer-events-none"
            style={{
              background: hasError 
                ? 'linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.2))' 
                : 'linear-gradient(90deg, rgba(124,58,237,0.4), rgba(147,51,234,0.3))'
            }}
          />
        )}

        <select
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          data-testid={testId}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            'relative w-full h-12 rounded-xl outline-none transition-all duration-200',
            'bg-black/40 backdrop-blur-sm',
            'text-white',
            'border px-4',
            'appearance-none cursor-pointer',
            hasError 
              ? 'border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20' 
              : 'border-white/10 focus:border-[#7c3aed]/60 focus:ring-2 focus:ring-[#7c3aed]/20',
            disabled && 'opacity-50 cursor-not-allowed bg-white/5',
            !value && 'text-gray-500'
          )}
          style={{ fontFamily: 'Manrope, sans-serif' }}
          {...props}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-[#1a1a24] text-white"
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Dropdown arrow */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg 
            className={cn(
              'w-4 h-4 transition-colors',
              isFocused ? 'text-[#a855f7]' : 'text-gray-500'
            )} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {hasError && (
        <p 
          className="text-sm text-red-400 flex items-center gap-1.5"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Input;
