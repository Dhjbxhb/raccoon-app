import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { MailCheck, ArrowRight } from 'lucide-react';
import { AuthLayout, AuthCard, AuthButton } from '@/components/auth/AuthComponents';
import OTPInput from '@/components/auth/OTPInput';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage, getPostAuthRedirect } from '@/utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const EmailVerificationPending = () => {
  const { user, token, logout, login } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = useCallback(async (e) => {
    e.preventDefault();
    if (verifying) return;

    if (!code || code.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      await axios.post(API_URL + '/auth/verify-email', { code }, {
        headers: { Authorization: 'Bearer ' + token }
      });

      // Fetch the updated user directly instead of going through the
      // context's refreshUser(): that helper flips a global "loading" flag,
      // which makes the route guard around this page briefly swap it out
      // for a spinner and remount it - wiping local state before it can
      // navigate, and making the whole thing look like the page reloaded
      // and did nothing. Fetching directly here avoids that entirely.
      const meResponse = await axios.get(API_URL + '/auth/me', {
        headers: { Authorization: 'Bearer ' + token }
      });
      login(token, meResponse.data);

      toast.success('Email verified!');
      navigate(getPostAuthRedirect(meResponse.data), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setVerifying(false);
    }
  }, [code, token, verifying, login, navigate]);

  const handleResend = useCallback(async () => {
    if (resending) return;
    setResending(true);
    try {
      await axios.post(API_URL + '/auth/resend-verification-email', {}, {
        headers: { Authorization: 'Bearer ' + token }
      });
      toast.success('Verification code sent - check your inbox.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  }, [token, resending]);

  const handleSignOut = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <AuthLayout>
      <AuthCard title="Verify Your Email" subtitle="One quick step before you can continue">
        <div className="flex flex-col items-center text-center gap-4 py-2 mb-2">
          <div className="w-14 h-14 rounded-full bg-[#7c3aed]/10 flex items-center justify-center">
            <MailCheck className="text-[#7c3aed]" size={28} />
          </div>
          <p className="text-gray-300 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
            We sent a 6-digit code to <span className="text-white font-medium">{user?.email}</span>.
            Enter it below to continue.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <OTPInput
            value={code}
            onChange={(val) => { setCode(val); if (error) setError(''); }}
            error={error}
            testId="email-verification-code-input"
          />

          <AuthButton loading={verifying} disabled={verifying} testId="verify-email-code-button">
            Verify Email
            <ArrowRight size={18} />
          </AuthButton>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Didn't get a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-[#7c3aed] hover:text-[#a855f7] font-medium transition-colors disabled:opacity-50"
          >
            Resend
          </button>
        </p>

        <p className="text-center text-sm text-gray-500 mt-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Wrong account?{' '}
          <button
            type="button"
            onClick={handleSignOut}
            className="text-[#7c3aed] hover:text-[#a855f7] font-medium transition-colors"
          >
            Sign Out
          </button>
        </p>
      </AuthCard>
    </AuthLayout>
  );
};

export default EmailVerificationPending;
