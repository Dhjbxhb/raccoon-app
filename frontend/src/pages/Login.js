import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { isFirebaseReady, signInWithGoogle, getGoogleRedirectResult } from '@/services/firebase.service';
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
  const [checkingRedirect, setCheckingRedirect] = useState(true);
  
  // Ref to prevent double-processing of redirect result
  const redirectProcessed = useRef(false);

  const firebaseReady = isFirebaseReady();

  // Handle social auth backend sync - defined as ref to avoid dependency issues
  const syncSocialAuthRef = useRef(async (userData) => {
    console.log('=== SYNC SOCIAL AUTH START ===');
    console.log('Google user data received:', {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      provider: userData.provider
    });
    
    try {
      const browserLocale = getBrowserLocale();
      
      // Use dedicated /auth/google endpoint for Google login
      console.log('Sending to backend /api/auth/google...');
      const response = await axios.post(`${API_URL}/auth/google`, {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        idToken: userData.idToken,
        browser_locale: browserLocale
      });
      
      console.log('Backend response received:', {
        hasToken: !!response.data.token,
        user: response.data.user?.username || response.data.user?.email
      });
      
      // Store token and set user state
      login(response.data.token, response.data.user);
      
      console.log('Token stored, user logged in!');
      toast.success(`Welcome, ${response.data.user.username || response.data.user.email}!`);
      
      // Navigate based on age verification status
      if (response.data.user.age_verified) {
        console.log('User age verified, navigating to dashboard');
        navigate('/dashboard');
      } else {
        console.log('User needs age verification');
        navigate('/verify-age');
      }
      
      return true;
    } catch (error) {
      console.error('=== SYNC SOCIAL AUTH ERROR ===', error);
      console.error('Error response:', error.response?.data);
      toast.error(getErrorMessage(error));
      return false;
    }
  });

  // Update ref when dependencies change
  useEffect(() => {
    syncSocialAuthRef.current = async (userData) => {
      console.log('=== SYNC SOCIAL AUTH START ===');
      console.log('Google user data received:', {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        provider: userData.provider
      });
      
      try {
        const browserLocale = getBrowserLocale();
        
        // Use dedicated /auth/google endpoint for Google login
        console.log('Sending to backend /api/auth/google...');
        const response = await axios.post(`${API_URL}/auth/google`, {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          idToken: userData.idToken,
          browser_locale: browserLocale
        });
        
        console.log('Backend response received:', {
          hasToken: !!response.data.token,
          user: response.data.user?.username || response.data.user?.email
        });
        
        // Store token and set user state
        login(response.data.token, response.data.user);
        
        console.log('Token stored, user logged in!');
        toast.success(`Welcome, ${response.data.user.username || response.data.user.email}!`);
        
        // Navigate based on age verification status
        if (response.data.user.age_verified) {
          console.log('User age verified, navigating to dashboard');
          navigate('/dashboard');
        } else {
          console.log('User needs age verification');
          navigate('/verify-age');
        }
        
        return true;
      } catch (error) {
        console.error('=== SYNC SOCIAL AUTH ERROR ===', error);
        console.error('Error response:', error.response?.data);
        toast.error(getErrorMessage(error));
        return false;
      }
    };
  }, [login, navigate]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      console.log('User already logged in, redirecting...');
      if (!user.age_verified) {
        navigate('/verify-age');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, navigate]);

  // Handle Google redirect result on page load - CRITICAL for Google login
  useEffect(() => {
    const handleRedirectResult = async () => {
      // Skip if already processing or not ready
      if (!firebaseReady || redirectProcessed.current) {
        setCheckingRedirect(false);
        return;
      }
      
      console.log('=== CHECKING GOOGLE REDIRECT RESULT ===');
      redirectProcessed.current = true;
      
      try {
        setSocialLoading('google');
        const userData = await getGoogleRedirectResult();
        
        if (userData) {
          console.log('Google redirect result found!');
          console.log('User:', userData.email, userData.displayName);
          
          // Sync with backend
          const success = await syncSocialAuthRef.current(userData);
          
          if (!success) {
            console.error('Backend sync failed');
            setSocialLoading(null);
          }
        } else {
          console.log('No Google redirect result (normal page load)');
          setSocialLoading(null);
        }
      } catch (error) {
        console.error('=== GOOGLE REDIRECT ERROR ===', error);
        
        if (error.code === 'auth/unauthorized-domain') {
          toast.error('This domain is not authorized for Google Sign-In. Please contact support.');
        } else if (error.code === 'auth/popup-closed-by-user') {
          // User closed popup, no error needed
        } else {
          toast.error('Google login failed. Please try again.');
        }
        setSocialLoading(null);
      } finally {
        setCheckingRedirect(false);
      }
    };
    
    handleRedirectResult();
  }, [firebaseReady]);

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

  // Google login handler - uses redirect for cross-origin compatibility
  const handleGoogleLogin = async () => {
    if (!firebaseReady) {
      toast.error('Firebase is initializing. Please try again.');
      return;
    }
    if (socialLoading) return;

    console.log('=== GOOGLE LOGIN CLICKED ===');
    setSocialLoading('google');
    
    try {
      // Reset the redirect processed flag so it can be processed when we come back
      redirectProcessed.current = false;
      
      // This will redirect to Google - no return value
      await signInWithGoogle();
      // User will be redirected to Google, then back here
      // The result is handled in the useEffect above
    } catch (error) {
      console.error('Google login redirect error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized for Google Sign-In. Please add it to Firebase Console.');
      } else {
        toast.error('Google login failed. Please try again.');
      }
      setSocialLoading(null);
    }
  };

  // Anonymous login handler - uses backend directly for reliability
  const handleAnonymousLogin = async () => {
    if (socialLoading) return;
    
    setSocialLoading('anonymous');
    try {
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

  // Show loading state while checking auth or redirect
  if (authLoading || checkingRedirect) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">
            {checkingRedirect ? 'Checking login status...' : 'Loading...'}
          </p>
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
