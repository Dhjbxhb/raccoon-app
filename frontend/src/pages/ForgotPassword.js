import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  AuthLayout,
  AuthCard,
  AuthInput,
  AuthButton,
  AuthFooterLink
} from '@/components/auth/AuthComponents';
import OTPInput from '@/components/auth/OTPInput';
import { validateEmail, validatePassword, validatePasswordMatch, getErrorMessage } from '@/utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const BackLink = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4"
    style={{ fontFamily: 'Manrope, sans-serif' }}
  >
    <ArrowLeft size={16} />
    Back
  </button>
);

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // The current step lives in the URL (?step=code / ?step=password), so the
  // browser's own Back button moves between steps naturally instead of
  // leaving the page entirely or appearing to do nothing.
  const step = searchParams.get('step') || 'email';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const goToStep = (nextStep) => setSearchParams({ step: nextStep });

  const requestCode = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    const validation = validateEmail(email);
    if (!validation.valid) {
      setErrors({ email: validation.error });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await axios.post(API_URL + '/auth/forgot-password', { email });
      goToStep('code');
      toast.success('If that email is registered, a code has been sent.');
    } catch (err) {
      setErrors({ email: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (code.length !== 6) {
      setErrors({ code: 'Enter the 6-digit code from your email' });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await axios.post(API_URL + '/auth/verify-reset-code', { email, code });
      goToStep('password');
    } catch (err) {
      setErrors({ code: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resending) return;
    setResending(true);
    try {
      await axios.post(API_URL + '/auth/forgot-password', { email });
      setCode('');
      toast.success('A new code has been sent.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const handlePasswordFieldChange = (field, value) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const passwordCheck = validatePassword(passwordData.password);
    const matchCheck = validatePasswordMatch(passwordData.password, passwordData.confirmPassword);
    if (!passwordCheck.valid || !matchCheck.valid) {
      setErrors({
        password: passwordCheck.valid ? '' : passwordCheck.error,
        confirmPassword: matchCheck.valid ? '' : matchCheck.error
      });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await axios.post(API_URL + '/auth/reset-password', {
        email,
        code,
        new_password: passwordData.password
      });
      toast.success('Password reset successfully! Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setErrors({ form: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'code' && email) {
    return (
      <AuthLayout>
        <AuthCard title="Enter Reset Code" subtitle={'We sent a 6-digit code to ' + email} showBackButton={false}>
          <BackLink onClick={() => goToStep('email')} />

          <form onSubmit={handleVerifyCode} className="space-y-5">
            <OTPInput value={code} onChange={setCode} error={errors.code} testId="reset-code-input" />

            <AuthButton loading={loading} disabled={loading} testId="verify-reset-code-button">
              Verify Code
              <ArrowRight size={18} />
            </AuthButton>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Didn't get a code?{' '}
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="text-[#7c3aed] hover:text-[#a855f7] font-medium transition-colors disabled:opacity-50"
            >
              Resend
            </button>
          </p>
        </AuthCard>
      </AuthLayout>
    );
  }

  if (step === 'password' && email) {
    return (
      <AuthLayout>
        <AuthCard title="Choose New Password" subtitle="Your code has been verified" showBackButton={false}>
          <BackLink onClick={() => goToStep('code')} />

          <form onSubmit={handleResetSubmit} className="space-y-4">
            {errors.form && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {errors.form}
              </div>
            )}

            <AuthInput
              label="New Password"
              icon={Lock}
              type="password"
              value={passwordData.password}
              onChange={(e) => handlePasswordFieldChange('password', e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              testId="reset-password-input"
              error={errors.password}
            />

            <AuthInput
              label="Confirm New Password"
              icon={Lock}
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => handlePasswordFieldChange('confirmPassword', e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              testId="reset-password-confirm-input"
              error={errors.confirmPassword}
            />

            <AuthButton loading={loading} disabled={loading} testId="reset-password-submit-button">
              Reset Password
              <ArrowRight size={18} />
            </AuthButton>
          </form>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Default: 'email' step (also the fallback if someone lands on ?step=code
  // or ?step=password directly without having gone through this page first,
  // e.g. via a bookmarked/shared URL with no email in memory)
  return (
    <AuthLayout>
      <AuthCard title="Forgot Password?" subtitle="Enter your email and we'll send you a reset code">
        <form onSubmit={requestCode} className="space-y-4">
          {errors.email && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {errors.email}
            </div>
          )}

          <AuthInput
            label="Email"
            icon={Mail}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({}); }}
            placeholder="your@email.com"
            required
            autoComplete="email"
            testId="forgot-password-email-input"
          />

          <AuthButton loading={loading} disabled={loading} testId="forgot-password-submit-button">
            Send Reset Code
            <ArrowRight size={18} />
          </AuthButton>
        </form>

        <AuthFooterLink text="Remembered your password?" linkText="Sign In" linkTo="/login" />
      </AuthCard>
    </AuthLayout>
  );
};

export default ForgotPassword;
