import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
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
  validateSignupForm, 
  validatePhone, 
  validateOTP, 
  getErrorMessage,
  getBrowserLocale 
} from '@/utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Signup = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    gender: 'male' // Default to male (backend only accepts male/female)
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
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

  // Handle email/password signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submits
    if (loading) return;
    
    // Terms validation
    if (!agreedToTerms) {
      setErrors(prev => ({ ...prev, terms: 'Please agree to the Terms of Service and Privacy Policy' }));
      return;
    }
    
    // Client-side validation
    const validation = validateSignupForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    
    setErrors({});
    setLoading(true);

    try {
      const browserLocale = getBrowserLocale();
      
      const response = await axios.post(`${API_URL}/auth/signup`, {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        gender: formData.gender.toLowerCase(),
        date_of_birth: '2000-01-01', // Default date, age verification happens separately
        browser_locale: browserLocale
      });
      
      // Store token and user data
      login(response.data.token, response.data.user);
      toast.success('Account created! Welcome to Raccoon!');
      
      // Always redirect to age verification for new signups
      navigate('/verify-age');
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      
      // Map specific backend errors to form fields
      if (errorMsg.toLowerCase().includes('email')) {
        setErrors({ email: errorMsg });
      } else if (errorMsg.toLowerCase().includes('username')) {
        setErrors({ username: errorMsg });
      } else if (errorMsg.toLowerCase().includes('password')) {
        setErrors({ password: errorMsg });
      } else if (errorMsg.toLowerCase().includes('gender')) {
        setErrors({ gender: errorMsg });
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
      toast.success('Welcome to Raccoon!');
      
      if (response.data.user.age_verified) {
        navigate('/dashboard');
      } else {
        navigate('/verify-age');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Google signup
  const handleGoogleSignup = async () => {
    if (!firebaseReady) {
      toast.info('Google signup requires Firebase configuration');
      return;
    }
    if (socialLoading) return;

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
    if (socialLoading) return;

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

  // Phone OTP - Send
  const handleSendOTP = async () => {
    const validation = validatePhone(phoneNumber);
    if (!validation.valid) {
      setPhoneError(validation.error);
      return;
    }
    setPhoneError('');

    if (!firebaseReady) {
      toast.info('Phone signup requires Firebase configuration');
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

  // Guest signup
  const handleGuestSignup = async () => {
    if (socialLoading) return;
    
    setSocialLoading('guest');
    try {
      const browserLocale = getBrowserLocale();
      const response = await axios.post(`${API_URL}/auth/guest`, { 
        gender: 'male',
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
        title="Create Account"
        subtitle="Join Raccoon and start meeting people"
      >
        {authMode === 'email' ? (
          <>
            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form-level error */}
              {errors.form && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm" data-testid="signup-form-error">
                  {errors.form}
                </div>
              )}
              
              <AuthInput
                label="Username"
                icon={User}
                type="text"
                value={formData.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                placeholder="Choose a username"
                required
                autoComplete="username"
                testId="signup-username-input"
                error={errors.username}
              />
              <AuthInput
                label="Email"
                icon={Mail}
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                testId="signup-email-input"
                error={errors.email}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <AuthInput
                  label="Password"
                  icon={Lock}
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  testId="signup-password-input"
                  error={errors.password}
                />
                <AuthInput
                  label="Confirm"
                  icon={Lock}
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  testId="signup-confirm-password-input"
                  error={errors.confirmPassword}
                />
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['male', 'female'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleFieldChange('gender', g)}
                      className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        formData.gender === g
                          ? 'bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                      }`}
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                      data-testid={`signup-gender-${g}`}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
                {errors.gender && (
                  <p className="text-red-400 text-xs mt-2">{errors.gender}</p>
                )}
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (errors.terms) {
                      setErrors(prev => ({ ...prev, terms: '' }));
                    }
                  }}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-[#7c3aed] focus:ring-[#7c3aed] focus:ring-offset-0"
                  data-testid="signup-terms-checkbox"
                />
                <span className="text-xs text-gray-400 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  I agree to the{' '}
                  <Link to="/terms" className="text-[#7c3aed] hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-[#7c3aed] hover:underline">Privacy Policy</Link>
                  , and confirm I am 18 years or older.
                </span>
              </label>
              {errors.terms && (
                <p className="text-red-400 text-xs -mt-2">{errors.terms}</p>
              )}

              <AuthButton 
                loading={loading} 
                disabled={loading || !!socialLoading}
                testId="signup-submit-button"
              >
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
                disabled={loading || (socialLoading && socialLoading !== 'google')}
                testId="signup-google-button"
              />
              <SocialButton 
                provider="apple" 
                onClick={handleAppleSignup}
                loading={socialLoading === 'apple'}
                disabled={loading || (socialLoading && socialLoading !== 'apple')}
                testId="signup-apple-button"
              />
              <SocialButton 
                provider="phone" 
                onClick={() => setAuthMode('phone')}
                disabled={loading || !!socialLoading}
                testId="signup-phone-button"
              />
              <SocialButton 
                provider="guest" 
                onClick={handleGuestSignup}
                loading={socialLoading === 'guest'}
                disabled={loading || (socialLoading && socialLoading !== 'guest')}
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
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder="+1 (555) 000-0000"
                    testId="signup-phone-input"
                    error={phoneError}
                  />
                  <div id="recaptcha-container" />
                  <AuthButton 
                    type="button"
                    onClick={handleSendOTP}
                    loading={socialLoading === 'phone'}
                    disabled={socialLoading === 'phone'}
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
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (otpError) setOtpError('');
                    }}
                    placeholder="000000"
                    testId="signup-otp-input"
                    error={otpError}
                  />
                  <AuthButton 
                    type="button"
                    onClick={handleVerifyOTP}
                    loading={socialLoading === 'phone'}
                    disabled={socialLoading === 'phone'}
                    testId="signup-verify-otp-button"
                  >
                    Verify & Create Account
                  </AuthButton>
                </>
              )}
              
              <AuthButton 
                type="button"
                variant="ghost"
                onClick={handleBackToEmail}
                disabled={socialLoading === 'phone'}
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
