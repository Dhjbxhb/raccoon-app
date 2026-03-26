import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, Phone, ArrowRight } from 'lucide-react';
import { 
  AuthLayout, 
  AuthCard, 
  AuthInput, 
  AuthButton, 
  AuthDivider, 
  SocialButton,
  AuthFooterLink 
} from '@/components/auth/AuthComponents';
import { isFirebaseReady, signInWithGoogle, signInWithApple, setupRecaptcha, sendOTP, verifyOTP } from '@/services/firebase.service';
import { 
  validateLoginForm, 
  validatePhone, 
  validateOTP, 
  getErrorMessage,
  getBrowserLocale 
} from '@/utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  
  // Phone auth state
  const [authMode, setAuthMode] = useState('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const firebaseReady = isFirebaseReady();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      if (!user.age_verified) {
        navigate('/verify-age');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, navigate]);

  // Clear field error when user types
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Handle email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submits
    if (loading) return;
    
    // Client-side validation
    const validation = validateLoginForm(formData.email, formData.password);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    
    setErrors({});
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email,
        password: formData.password
      });
      
      // Store token and user data
      login(response.data.token, response.data.user);
      toast.success('Welcome back!');
      
      // Redirect based on age verification status
      if (response.data.user.age_verified) {
        navigate('/dashboard');
      } else {
        navigate('/verify-age');
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      
      // Show inline error for credential issues
      if (errorMsg.toLowerCase().includes('email') || errorMsg.toLowerCase().includes('password')) {
        setErrors({ form: errorMsg });
      } else if (errorMsg.toLowerCase().includes('banned')) {
        toast.error(errorMsg);
      } else {
        setErrors({ form: errorMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle social auth backend sync
  const syncSocialAuth = async (userData) => {
    try {
      const browserLocale = getBrowserLocale();
      
      const response = await axios.post(`${API_URL}/auth/social`, {
        ...userData,
        browser_locale: browserLocale
      });
      
      login(response.data.token, response.data.user);
      toast.success('Welcome!');
      
      if (response.data.user.age_verified) {
        navigate('/dashboard');
      } else {
        navigate('/verify-age');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Google login
  const handleGoogleLogin = async () => {
    if (!firebaseReady) {
      toast.info('Google login requires Firebase configuration');
      return;
    }
    if (socialLoading) return;

    setSocialLoading('google');
    try {
      const userData = await signInWithGoogle();
      await syncSocialAuth(userData);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error('Google login failed');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  // Apple login
  const handleAppleLogin = async () => {
    if (!firebaseReady) {
      toast.info('Apple login requires Firebase configuration');
      return;
    }
    if (socialLoading) return;

    setSocialLoading('apple');
    try {
      const userData = await signInWithApple();
      await syncSocialAuth(userData);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error('Apple login failed');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  // Phone OTP - Send
  const handleSendOTP = async () => {
    const validation = validatePhone(phoneNumber);
    if (!validation.valid) {
      setPhoneError(validation.error);
      return;
    }
    setPhoneError('');

    if (!firebaseReady) {
      toast.info('Phone login requires Firebase configuration');
      return;
    }
    if (socialLoading) return;

    setSocialLoading('phone');
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;
      await setupRecaptcha('recaptcha-container');
      await sendOTP(formattedPhone);
      setOtpSent(true);
      toast.success('Verification code sent!');
    } catch (error) {
      setPhoneError('Failed to send code. Check your phone number.');
    } finally {
      setSocialLoading(null);
    }
  };

  // Phone OTP - Verify
  const handleVerifyOTP = async () => {
    const validation = validateOTP(otpCode);
    if (!validation.valid) {
      setOtpError(validation.error);
      return;
    }
    setOtpError('');
    
    if (socialLoading) return;

    setSocialLoading('phone');
    try {
      const userData = await verifyOTP(otpCode);
      await syncSocialAuth(userData);
    } catch (error) {
      setOtpError('Invalid code. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  // Guest login
  const handleGuestLogin = async () => {
    if (socialLoading) return;
    
    setSocialLoading('guest');
    try {
      const browserLocale = getBrowserLocale();
      const response = await axios.post(`${API_URL}/auth/guest`, { 
        gender: 'male', // Default to male for guest
        browser_locale: browserLocale
      });
      login(response.data.token, response.data.user);
      toast.success('Welcome, Guest!');
      navigate('/verify-age');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSocialLoading(null);
    }
  };

  // Reset phone auth state
  const handleBackToEmail = () => {
    setAuthMode('email');
    setOtpSent(false);
    setOtpCode('');
    setPhoneNumber('');
    setPhoneError('');
    setOtpError('');
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard 
        title="Welcome Back"
        subtitle="Sign in to continue to Raccoon"
      >
        {authMode === 'email' ? (
          <>
            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form-level error */}
              {errors.form && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm" data-testid="login-form-error">
                  {errors.form}
                </div>
              )}
              
              <AuthInput
                label="Email"
                icon={Mail}
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                testId="login-email-input"
                error={errors.email}
              />
              <AuthInput
                label="Password"
                icon={Lock}
                type="password"
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                testId="login-password-input"
                error={errors.password}
              />
              <AuthButton 
                loading={loading} 
                disabled={loading || !!socialLoading}
                testId="login-submit-button"
              >
                Sign In
                <ArrowRight size={18} />
              </AuthButton>
            </form>

            <AuthDivider />

            {/* Social Login Grid */}
            <div className="grid grid-cols-2 gap-3">
              <SocialButton 
                provider="google" 
                onClick={handleGoogleLogin}
                loading={socialLoading === 'google'}
                disabled={loading || (socialLoading && socialLoading !== 'google')}
                testId="login-google-button"
              />
              <SocialButton 
                provider="apple" 
                onClick={handleAppleLogin}
                loading={socialLoading === 'apple'}
                disabled={loading || (socialLoading && socialLoading !== 'apple')}
                testId="login-apple-button"
              />
              <SocialButton 
                provider="phone" 
                onClick={() => setAuthMode('phone')}
                disabled={loading || !!socialLoading}
                testId="login-phone-button"
              />
              <SocialButton 
                provider="guest" 
                onClick={handleGuestLogin}
                loading={socialLoading === 'guest'}
                disabled={loading || (socialLoading && socialLoading !== 'guest')}
                testId="login-guest-button"
              />
            </div>
          </>
        ) : (
          <>
            {/* Phone Login */}
            <div className="space-y-4">
              {!otpSent ? (
                <>
                  <AuthInput
                    label="Phone Number"
                    icon={Phone}
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder="+1 (555) 000-0000"
                    testId="login-phone-input"
                    error={phoneError}
                  />
                  <div id="recaptcha-container" />
                  <AuthButton 
                    type="button"
                    onClick={handleSendOTP}
                    loading={socialLoading === 'phone'}
                    disabled={socialLoading === 'phone'}
                    testId="login-send-otp-button"
                  >
                    Send Verification Code
                  </AuthButton>
                </>
              ) : (
                <>
                  <AuthInput
                    label="Verification Code"
                    type="text"
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (otpError) setOtpError('');
                    }}
                    placeholder="000000"
                    testId="login-otp-input"
                    error={otpError}
                  />
                  <AuthButton 
                    type="button"
                    onClick={handleVerifyOTP}
                    loading={socialLoading === 'phone'}
                    disabled={socialLoading === 'phone'}
                    testId="login-verify-otp-button"
                  >
                    Verify & Sign In
                  </AuthButton>
                </>
              )}
              
              <AuthButton 
                type="button"
                variant="ghost"
                onClick={handleBackToEmail}
                disabled={socialLoading === 'phone'}
              >
                ← Back to Email Login
              </AuthButton>
            </div>
          </>
        )}

        <AuthFooterLink 
          text="Don't have an account?"
          linkText="Sign Up"
          linkTo="/signup"
        />
      </AuthCard>
    </AuthLayout>
  );
};

export default Login;
