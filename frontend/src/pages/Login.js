import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [authMode, setAuthMode] = useState('email'); // email, phone
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const firebaseReady = isFirebaseReady();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (!user.age_verified) {
        navigate('/verify-age');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  // Handle email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, formData);
      login(response.data.token, response.data.user);
      toast.success('Welcome back!');
      
      if (response.data.user.age_verified) {
        navigate('/dashboard');
      } else {
        navigate('/verify-age');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Handle social auth backend sync
  const syncSocialAuth = async (userData) => {
    try {
      const browserLocale = navigator.language || navigator.userLanguage || 'en-US';
      
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
      toast.error(error.response?.data?.detail || 'Authentication failed');
    }
  };

  // Google login
  const handleGoogleLogin = async () => {
    if (!firebaseReady) {
      toast.info('Google login requires Firebase configuration');
      return;
    }

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

  // Phone OTP
  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!firebaseReady) {
      toast.info('Phone login requires Firebase configuration');
      return;
    }

    setSocialLoading('phone');
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;
      await setupRecaptcha('recaptcha-container');
      await sendOTP(formattedPhone);
      setOtpSent(true);
      toast.success('Verification code sent!');
    } catch (error) {
      toast.error('Failed to send code. Check your phone number.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setSocialLoading('phone');
    try {
      const userData = await verifyOTP(otpCode);
      await syncSocialAuth(userData);
    } catch (error) {
      toast.error('Invalid code. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  // Guest login
  const handleGuestLogin = async () => {
    setSocialLoading('guest');
    try {
      const browserLocale = navigator.language || navigator.userLanguage || 'en-US';
      const response = await axios.post(`${API_URL}/auth/guest`, { 
        gender: 'any',
        browser_locale: browserLocale
      });
      login(response.data.token, response.data.user);
      toast.success('Welcome, Guest!');
      navigate('/verify-age');
    } catch (error) {
      toast.error('Guest login failed');
    } finally {
      setSocialLoading(null);
    }
  };

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
              <AuthInput
                label="Email"
                icon={Mail}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
                autoComplete="email"
                testId="login-email-input"
              />
              <AuthInput
                label="Password"
                icon={Lock}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                testId="login-password-input"
              />
              <AuthButton loading={loading} testId="login-submit-button">
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
                testId="login-google-button"
              />
              <SocialButton 
                provider="apple" 
                onClick={handleAppleLogin}
                loading={socialLoading === 'apple'}
                testId="login-apple-button"
              />
              <SocialButton 
                provider="phone" 
                onClick={() => setAuthMode('phone')}
                testId="login-phone-button"
              />
              <SocialButton 
                provider="guest" 
                onClick={handleGuestLogin}
                loading={socialLoading === 'guest'}
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
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    testId="login-phone-input"
                  />
                  <div id="recaptcha-container" />
                  <AuthButton 
                    type="button"
                    onClick={handleSendOTP}
                    loading={socialLoading === 'phone'}
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
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    testId="login-otp-input"
                  />
                  <AuthButton 
                    type="button"
                    onClick={handleVerifyOTP}
                    loading={socialLoading === 'phone'}
                    testId="login-verify-otp-button"
                  >
                    Verify & Sign In
                  </AuthButton>
                </>
              )}
              
              <AuthButton 
                type="button"
                variant="ghost"
                onClick={() => {
                  setAuthMode('email');
                  setOtpSent(false);
                  setOtpCode('');
                }}
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
