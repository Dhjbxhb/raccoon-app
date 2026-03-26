import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, User, Phone, ArrowRight, Calendar } from 'lucide-react';
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

const Signup = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    gender: 'any',
    date_of_birth: ''
  });
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [authMode, setAuthMode] = useState('email'); // email, phone
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

  // Handle email/password signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const browserLocale = navigator.language || navigator.userLanguage || 'en-US';
      
      const response = await axios.post(`${API_URL}/auth/signup`, {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth || '2000-01-01',
        browser_locale: browserLocale
      });
      login(response.data.token, response.data.user);
      toast.success('Account created! Welcome to Raccoon!');
      navigate('/verify-age');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Signup failed');
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
      toast.success('Welcome to Raccoon!');
      
      if (response.data.user.age_verified) {
        navigate('/dashboard');
      } else {
        navigate('/verify-age');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    }
  };

  // Google signup
  const handleGoogleSignup = async () => {
    if (!firebaseReady) {
      toast.info('Google signup requires Firebase configuration');
      return;
    }

    setSocialLoading('google');
    try {
      const userData = await signInWithGoogle();
      await syncSocialAuth(userData);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error('Google signup failed');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  // Apple signup
  const handleAppleSignup = async () => {
    if (!firebaseReady) {
      toast.info('Apple signup requires Firebase configuration');
      return;
    }

    setSocialLoading('apple');
    try {
      const userData = await signInWithApple();
      await syncSocialAuth(userData);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error('Apple signup failed');
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
      toast.info('Phone signup requires Firebase configuration');
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

  // Guest signup
  const handleGuestSignup = async () => {
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
      toast.error('Guest signup failed');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <AuthLayout>
      <AuthCard 
        title="Create Account"
        subtitle="Join Raccoon and start meeting people"
      >
        {authMode === 'email' ? (
          <>
            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AuthInput
                label="Username"
                icon={User}
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Choose a username"
                required
                autoComplete="username"
                testId="signup-username-input"
              />
              <AuthInput
                label="Email"
                icon={Mail}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
                autoComplete="email"
                testId="signup-email-input"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <AuthInput
                  label="Password"
                  icon={Lock}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  testId="signup-password-input"
                />
                <AuthInput
                  label="Confirm"
                  icon={Lock}
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  testId="signup-confirm-password-input"
                />
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['male', 'female', 'non-binary'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                        formData.gender === g
                          ? 'bg-[#7c3aed] text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                      }`}
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-[#7c3aed] focus:ring-[#7c3aed] focus:ring-offset-0"
                />
                <span className="text-xs text-gray-400 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  I agree to the{' '}
                  <Link to="/terms" className="text-[#7c3aed] hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-[#7c3aed] hover:underline">Privacy Policy</Link>
                  , and confirm I am 18 years or older.
                </span>
              </label>

              <AuthButton loading={loading} testId="signup-submit-button">
                Create Account
                <ArrowRight size={18} />
              </AuthButton>
            </form>

            <AuthDivider />

            {/* Social Signup Grid */}
            <div className="grid grid-cols-2 gap-3">
              <SocialButton 
                provider="google" 
                onClick={handleGoogleSignup}
                loading={socialLoading === 'google'}
                testId="signup-google-button"
              />
              <SocialButton 
                provider="apple" 
                onClick={handleAppleSignup}
                loading={socialLoading === 'apple'}
                testId="signup-apple-button"
              />
              <SocialButton 
                provider="phone" 
                onClick={() => setAuthMode('phone')}
                testId="signup-phone-button"
              />
              <SocialButton 
                provider="guest" 
                onClick={handleGuestSignup}
                loading={socialLoading === 'guest'}
                testId="signup-guest-button"
              />
            </div>
          </>
        ) : (
          <>
            {/* Phone Signup */}
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
                    testId="signup-phone-input"
                  />
                  <div id="recaptcha-container" />
                  <AuthButton 
                    type="button"
                    onClick={handleSendOTP}
                    loading={socialLoading === 'phone'}
                    testId="signup-send-otp-button"
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
                    testId="signup-otp-input"
                  />
                  <AuthButton 
                    type="button"
                    onClick={handleVerifyOTP}
                    loading={socialLoading === 'phone'}
                    testId="signup-verify-otp-button"
                  >
                    Verify & Create Account
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
                ← Back to Email Signup
              </AuthButton>
            </div>
          </>
        )}

        <AuthFooterLink 
          text="Already have an account?"
          linkText="Sign In"
          linkTo="/login"
        />
      </AuthCard>
    </AuthLayout>
  );
};

export default Signup;
