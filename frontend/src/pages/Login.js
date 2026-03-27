import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight } from 'lucide-react';
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
  validateLoginForm, 
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
    
    if (loading) return;
    
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
      
      login(response.data.token, response.data.user);
      toast.success('Welcome back!');
      
      if (response.data.user.age_verified) {
        navigate('/dashboard');
      } else {
        navigate('/verify-age');
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      
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

  // Google login handler
  const handleGoogleLogin = async () => {
    if (!firebaseReady) {
      toast.error('Google Sign-In requires Firebase configuration. Please use email login or continue as guest.');
      return;
    }
    if (socialLoading) return;

    setSocialLoading('google');
    try {
      const userData = await signInWithGoogle();
      await syncSocialAuth(userData);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error('Google login failed. Please try again or use another method.');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  // Anonymous login handler - ALWAYS works (uses backend directly)
  const handleAnonymousLogin = async () => {
    if (socialLoading) return;
    
    setSocialLoading('anonymous');
    try {
      // Always use backend guest creation for reliability
      const browserLocale = getBrowserLocale();
      const response = await axios.post(`${API_URL}/auth/guest`, { 
        gender: 'male',
        browser_locale: browserLocale
      });
      
      login(response.data.token, response.data.user);
      toast.success(`Welcome, ${response.data.user.username}!`);
      navigate('/verify-age');
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
        title="Welcome Back"
        subtitle="Sign in to continue to Raccoon"
      >
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

        {/* Social Login Section - Google + Anonymous */}
        <SocialAuthSection
          onGoogleClick={handleGoogleLogin}
          onAnonymousClick={handleAnonymousLogin}
          loadingProvider={socialLoading}
          disabled={loading}
        />

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
