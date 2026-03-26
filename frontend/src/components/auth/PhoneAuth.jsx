import React, { useState, useEffect, useCallback } from 'react';
import { Phone, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { validatePhone, validateOTP } from '@/utils/auth';

/**
 * Phone Number Input Component
 */
const PhoneInput = ({ 
  value, 
  onChange, 
  error, 
  disabled = false,
  onClear
}) => {
  return (
    <div className="space-y-2">
      <label 
        className="block text-sm font-medium text-gray-300"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        Phone Number
      </label>
      <div className="relative">
        <Phone 
          className={`absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${error ? 'text-red-400' : 'text-gray-500'}`} 
        />
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="+1 (555) 000-0000"
          disabled={disabled}
          data-testid="phone-number-input"
          className={`
            w-full h-12 pl-11 pr-4 rounded-xl outline-none transition-all
            bg-black/40 text-white placeholder:text-gray-500
            border ${error 
              ? 'border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20' 
              : 'border-white/10 focus:border-[#7c3aed]/60 focus:ring-2 focus:ring-[#7c3aed]/20'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          style={{ fontFamily: 'Manrope, sans-serif' }}
        />
      </div>
      {error && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
        We'll send you a verification code via SMS
      </p>
    </div>
  );
};

/**
 * OTP Input Component - 6 digit code
 */
const OTPInput = ({ 
  value, 
  onChange, 
  error,
  disabled = false,
  phoneNumber
}) => {
  const handleChange = (e) => {
    // Only allow digits
    const newValue = e.target.value.replace(/\D/g, '').slice(0, 6);
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Code sent to <span className="text-white font-medium">{phoneNumber}</span>
        </p>
      </div>
      
      <div className="space-y-2">
        <label 
          className="block text-sm font-medium text-gray-300"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Verification Code
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder="000000"
          disabled={disabled}
          maxLength={6}
          data-testid="otp-code-input"
          className={`
            w-full h-14 px-4 rounded-xl outline-none transition-all
            bg-black/40 text-white text-center text-2xl font-mono tracking-[0.5em]
            placeholder:text-gray-600 placeholder:tracking-[0.5em]
            border ${error 
              ? 'border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20' 
              : 'border-white/10 focus:border-[#7c3aed]/60 focus:ring-2 focus:ring-[#7c3aed]/20'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
      </div>
      {error && (
        <p className="text-red-400 text-xs flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Resend Code Timer
 */
const ResendTimer = ({ onResend, disabled }) => {
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = () => {
    if (canResend && !disabled) {
      onResend();
      setCountdown(30);
      setCanResend(false);
    }
  };

  return (
    <div className="text-center">
      {canResend ? (
        <button
          type="button"
          onClick={handleResend}
          disabled={disabled}
          className="text-sm text-[#7c3aed] hover:text-[#a855f7] transition-colors disabled:opacity-50"
          style={{ fontFamily: 'Manrope, sans-serif' }}
          data-testid="resend-otp-button"
        >
          Resend Code
        </button>
      ) : (
        <p className="text-sm text-gray-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Resend code in <span className="text-white">{countdown}s</span>
        </p>
      )}
    </div>
  );
};

/**
 * Phone Auth Flow Component
 * Handles the complete phone OTP authentication flow
 * 
 * States:
 * - phone: Enter phone number
 * - otp: Enter verification code
 * - success: Verified (optional callback)
 */
export const PhoneAuth = ({
  onSendOTP,
  onVerifyOTP,
  onResendOTP,
  onBack,
  onSuccess,
  loading = false,
  firebaseReady = false,
  className = ''
}) => {
  // State
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'success'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Format phone number for display
  const formatPhone = useCallback((phone) => {
    if (!phone) return '';
    // Mask middle digits for privacy
    if (phone.length > 6) {
      return phone.slice(0, 4) + '****' + phone.slice(-4);
    }
    return phone;
  }, []);

  // Handle send OTP
  const handleSendOTP = async () => {
    // Validate phone
    const validation = validatePhone(phoneNumber);
    if (!validation.valid) {
      setPhoneError(validation.error);
      return;
    }
    setPhoneError('');

    setIsLoading(true);
    try {
      // Format phone number with country code if not present
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
      await onSendOTP(formattedPhone);
      setStep('otp');
    } catch (error) {
      setPhoneError(error.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verify OTP
  const handleVerifyOTP = async () => {
    // Validate OTP
    const validation = validateOTP(otpCode);
    if (!validation.valid) {
      setOtpError(validation.error);
      return;
    }
    setOtpError('');

    setIsLoading(true);
    try {
      const result = await onVerifyOTP(otpCode);
      setStep('success');
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      if (error.code === 'auth/invalid-verification-code') {
        setOtpError('Invalid verification code');
      } else if (error.code === 'auth/code-expired') {
        setOtpError('Code expired. Please request a new one.');
      } else {
        setOtpError(error.message || 'Failed to verify code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    setOtpError('');
    setOtpCode('');
    setIsLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
      await (onResendOTP || onSendOTP)(formattedPhone);
    } catch (error) {
      setOtpError('Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtpCode('');
      setOtpError('');
    } else if (onBack) {
      onBack();
    }
  };

  // Clear phone error when typing
  const handlePhoneChange = (value) => {
    setPhoneNumber(value);
    if (phoneError) setPhoneError('');
  };

  // Clear OTP error when typing
  const handleOtpChange = (value) => {
    setOtpCode(value);
    if (otpError) setOtpError('');
  };

  // Combine loading states
  const currentLoading = loading || isLoading;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Recaptcha container - required for Firebase phone auth */}
      <div id="recaptcha-container" />

      {step === 'phone' && (
        <>
          <PhoneInput
            value={phoneNumber}
            onChange={handlePhoneChange}
            error={phoneError}
            disabled={currentLoading}
          />
          
          <button
            type="button"
            onClick={handleSendOTP}
            disabled={currentLoading || !phoneNumber}
            data-testid="send-otp-button"
            className="w-full py-3.5 rounded-xl font-semibold transition-all duration-300 
              bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#8b5cf6] hover:to-[#a855f7] 
              text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] 
              hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] 
              hover:scale-[1.02] active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              flex items-center justify-center gap-2"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {currentLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Verification Code'
            )}
          </button>
        </>
      )}

      {step === 'otp' && (
        <>
          <OTPInput
            value={otpCode}
            onChange={handleOtpChange}
            error={otpError}
            disabled={currentLoading}
            phoneNumber={formatPhone(phoneNumber)}
          />
          
          <button
            type="button"
            onClick={handleVerifyOTP}
            disabled={currentLoading || otpCode.length !== 6}
            data-testid="verify-otp-button"
            className="w-full py-3.5 rounded-xl font-semibold transition-all duration-300 
              bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#8b5cf6] hover:to-[#a855f7] 
              text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] 
              hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] 
              hover:scale-[1.02] active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              flex items-center justify-center gap-2"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {currentLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>

          <ResendTimer onResend={handleResendOTP} disabled={currentLoading} />
        </>
      )}

      {step === 'success' && (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Phone Verified!
          </h3>
          <p className="text-sm text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Your phone number has been verified successfully.
          </p>
        </div>
      )}

      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        disabled={currentLoading}
        className="w-full py-3 rounded-xl font-medium transition-all 
          bg-transparent hover:bg-white/5 text-gray-400 hover:text-white
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
        style={{ fontFamily: 'Manrope, sans-serif' }}
        data-testid="phone-auth-back-button"
      >
        <ArrowLeft className="w-4 h-4" />
        {step === 'otp' ? 'Change Phone Number' : 'Back to Email Login'}
      </button>
    </div>
  );
};

export default PhoneAuth;
