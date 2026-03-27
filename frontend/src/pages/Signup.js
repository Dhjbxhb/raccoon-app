import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { 
  AuthLayout, 
  AuthCard, 
  AuthInput, 
  AuthButton, 
  AuthFooterLink 
} from '@/components/auth/AuthComponents';
import { SocialAuthSection } from '@/components/auth/SocialAuthButtons';
import { isFirebaseReady, signInWithGoogle, signInAnonymousUser } from '@/services/firebase.service';
import { 
  validateSignupForm, 
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
    gender: 'male'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
        date_of_birth: '2000-01-01',
        browser_locale: browserLocale,
        terms_accepted: agreedToTerms,
        privacy_accepted: agreedToTerms
      });
      
      login(response.data.token, response.data.user);
      toast.success('Account created! Welcome to Raccoon!');
      navigate('/verify-age');
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      
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

  // Google signup handler
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

  // Anonymous signup handler
  const handleAnonymousSignup = async () => {
    if (socialLoading) return;
    
    setSocialLoading('anonymous');
    try {
      // If Firebase is ready, use Firebase anonymous auth
      if (firebaseReady) {
        const userData = await signInAnonymousUser();
        await syncSocialAuth(userData);
      } else {
        // Fallback to backend guest creation
        const browserLocale = getBrowserLocale();
        const response = await axios.post(`${API_URL}/auth/guest`, { 
          gender: 'male',
          browser_locale: browserLocale
        });
        
        login(response.data.token, response.data.user);
        toast.success(`Welcome, ${response.data.user.username}!`);
        navigate('/verify-age');
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSocialLoading(null);
    }
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

        {/* Social Signup Section - Google + Anonymous */}
        <SocialAuthSection
          onGoogleClick={handleGoogleSignup}
          onAnonymousClick={handleAnonymousSignup}
          loadingProvider={socialLoading}
          disabled={loading}
        />

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
