import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Phone, ArrowRight, ArrowLeft } from 'lucide-react';
import OTPInput from './OTPInput';
import { AuthButton } from './AuthComponents';
import { sendPhoneOTP } from '@/services/firebase.service';

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * Self-contained phone number -> OTP verification flow (Firebase Phone Auth).
 * On success, calls onVerified({ idToken, uid, phoneNumber }) and lets the
 * parent page (Login/Signup) sync the verified identity with the backend -
 * this component only owns the Firebase side of phone verification.
 */
const PhoneAuthSection = ({ onVerified, disabled }) => {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const confirmationRef = useRef(null);
  const recaptchaContainerId = useRef(`recaptcha-container-${Math.random().toString(36).slice(2)}`).current;

  const handleSendCode = async () => {
    if (sending || disabled) return;
    const trimmed = phone.trim();
    if (!PHONE_REGEX.test(trimmed)) {
      setError('Enter a valid phone number with country code, e.g. +1 234 567 8900');
      return;
    }

    setError('');
    setSending(true);
    try {
      confirmationRef.current = await sendPhoneOTP(trimmed, recaptchaContainerId);
      setStep('otp');
      toast.success('Verification code sent!');
    } catch (err) {
      if (err.code === 'auth/invalid-phone-number') {
        setError('That phone number looks invalid. Please check and try again.');
      } else if (err.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error('Failed to send code. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verifying || disabled) return;
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }

    setError('');
    setVerifying(true);
    try {
      const result = await confirmationRef.current.confirm(code);
      const idToken = await result.user.getIdToken();
      await onVerified({
        idToken,
        uid: result.user.uid,
        phoneNumber: result.user.phoneNumber
      });
    } catch (err) {
      setError('Incorrect or expired code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setCode('');
    setError('');
  };

  return (
    <div className="space-y-4">
      {/* Firebase renders its invisible reCAPTCHA challenge into this container */}
      <div id={recaptchaContainerId} />

      {step === 'phone' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Phone Number
            </label>
            <div className="relative">
              <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : 'text-gray-500'}`} size={18} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); if (error) setError(''); }}
                placeholder="+1 234 567 8900"
                disabled={disabled || sending}
                data-testid="phone-number-input"
                className={`w-full bg-black/40 rounded-xl h-12 pl-11 pr-4 text-white placeholder:text-gray-500 outline-none transition-all border ${
                  error
                    ? 'border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20'
                    : 'border-white/10 focus:border-[#7c3aed]/60 focus:ring-2 focus:ring-[#7c3aed]/20'
                }`}
                style={{ fontFamily: 'Manrope, sans-serif' }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Include your country code
            </p>
            {error && (
              <p className="text-red-400 text-xs mt-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>{error}</p>
            )}
          </div>

          <AuthButton loading={sending} disabled={disabled || sending} type="button" onClick={handleSendCode} testId="send-otp-button">
            Send Code
            <ArrowRight size={18} />
          </AuthButton>
        </>
      ) : (
        <>
          <p className="text-center text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Enter the 6-digit code sent to <span className="text-white font-medium">{phone.trim()}</span>
          </p>

          <OTPInput
            value={code}
            onChange={(val) => { setCode(val); if (error) setError(''); }}
            error={error}
            testId="phone-otp-input"
          />

          <AuthButton loading={verifying} disabled={disabled || verifying} type="button" onClick={handleVerifyCode} testId="verify-otp-button">
            Verify & Continue
            <ArrowRight size={18} />
          </AuthButton>

          <button
            type="button"
            onClick={handleChangeNumber}
            disabled={verifying}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            <ArrowLeft size={14} />
            Change phone number
          </button>
        </>
      )}
    </div>
  );
};

export default PhoneAuthSection;
