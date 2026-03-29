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
  getBrowserLocale,
  TOKEN_KEY
} from '@/utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, user, token, loading: authLoading } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [checkingRedirect, setCheckingRedirect] = useState(true);
  
  // Ref to prevent double-processing of redirect result
  const redirectProcessed = useRef(false);
  const navigationDone = useRef(false);

  const firebaseReady = isFirebaseReady();

  // DEBUG: Log current auth state on every render
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    console.log('=== LOGIN PAGE AUTH STATE ===');
    console.log('Token from context:', token ? 'EXISTS' : 'NULL');
    console.log('Token from localStorage:', storedToken ? 'EXISTS' : 'NULL');
    console.log('User from context:', user ? user.username || user.email : 'NULL');
    console.log('Auth loading:', authLoading);
    console.log('Checking redirect:', checkingRedirect);
  }, [token, user, authLoading, checkingRedirect]);

  // Redirect if already logged in - CRITICAL CHECK
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }
    
    // Check if user is already authenticated
    if (user && token && !navigationDone.current) {
      console.log('=== USER ALREADY AUTHENTICATED ===');
      console.log('User:', user.username || user.email);
      console.log('Redirecting to appropriate page...');
      navigationDone.current = true;
      
      if (!user.age_verified) {
        navigate('/verify-age', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, token, authLoading, navigate]);

  // Handle Google redirect result on page load - CRITICAL for Google login
  useEffect(() => {
    const handleRedirectResult = async () => {
      // Skip if not ready or already processing
      if (!firebaseReady) {
        console.log('Firebase not ready yet');
        setCheckingRedirect(false);
        return;
      }
      
      if (redirectProcessed.current) {
        console.log('Redirect already processed');
        setCheckingRedirect(false);
        return;
      }
      
      // Check if there's already a valid token - don't process redirect if logged in
      const existingToken = localStorage.getItem(TOKEN_KEY);
      if (existingToken) {
        console.log('Token already exists, skipping redirect check');
        setCheckingRedirect(false);
        return;
      }
      
      console.log('=== CHECKING GOOGLE REDIRECT RESULT ===');
      redirectProcessed.current = true;
      
      try {
        setSocialLoading('google');
        const userData = await getGoogleRedirectResult();
        
        if (userData) {
          console.log('=== GOOGLE REDIRECT RESULT FOUND ===');
          console.log('Firebase UID:', userData.uid);
          console.log('Email:', userData.email);
          console.log('Display Name:', userData.displayName);
          
          // Sync with backend
          await syncGoogleUser(userData);
        } else {
          console.log('No Google redirect result (normal page load)');
        }
      } catch (error) {
        console.error('=== GOOGLE REDIRECT ERROR ===', error);
        
        if (error.code === 'auth/unauthorized-domain') {
          toast.error('This domain is not authorized for Google Sign-In.');
        } else if (error.code !== 'auth/popup-closed-by-user') {
          toast.error('Google login failed. Please try again.');
        }
      } finally {
        setSocialLoading(null);
        setCheckingRedirect(false);
      }
    };
    
    handleRedirectResult();
  }, [firebaseReady]);

  // Sync Google user with backend
  const syncGoogleUser = async (userData) => {
    console.log('=== SYNCING GOOGLE USER WITH BACKEND ===');
    
    try {
      const browserLocale = getBrowserLocale();
      
      console.log('Sending to backend /api/auth/google...');
      const response = await axios.post(`${API_URL}/auth/google`, {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        idToken: userData.idToken,
        browser_locale: browserLocale
      });
      
      console.log('=== BACKEND RESPONSE ===');
      console.log('Token received:', response.data.token ? 'YES' : 'NO');
      console.log('User:', response.data.user?.username || response.data.user?.email);
      
      if (!response.data.token) {
        console.error('No token in response!');
        toast.error('Login failed - no token received');
        return false;
      }
      
      // CRITICAL: Save token to localStorage FIRST
      console.log('Saving token to localStorage...');
      localStorage.setItem(TOKEN_KEY, response.data.token);
      
      // Verify token was saved
      const savedToken = localStorage.getItem(TOKEN_KEY);
      console.log('Token saved:', savedToken ? 'SUCCESS' : 'FAILED');
      
      // Update auth context
      login(response.data.token, response.data.user);
      console.log('Auth context updated');
      
      toast.success(`Welcome, ${response.data.user.username || response.data.user.email}!`);
      
      // Navigate based on age verification status
      navigationDone.current = true;
      if (response.data.user.age_verified) {
        console.log('Navigating to dashboard...');
        navigate('/dashboard', { replace: true });
      } else {
        console.log('Navigating to age verification...');
        navigate('/verify-age', { replace: true });
      }
      
      return true;
    } catch (error) {
      console.error('=== BACKEND SYNC ERROR ===', error);
      console.error('Response:', error.response?.data);
      toast.error(getErrorMessage(error));
      return false;
    }
  };

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
      console.log('=== EMAIL/PASSWORD LOGIN ===');
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email,
        password: formData.password
      });
      
      console.log('Token received:', response.data.token ? 'YES' : 'NO');
      
      // Save token to localStorage
      localStorage.setItem(TOKEN_KEY, response.data.token);
      console.log('Token saved to localStorage');
      
      // Update auth context
      login(response.data.token, response.data.user);
      toast.success('Welcome back!');
      
      navigationDone.current = true;
      if (response.data.user.age_verified) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/verify-age', { replace: true });
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
      navigationDone.current = false;
      
      // This will redirect to Google - page will reload after
      await signInWithGoogle();
      // User will be redirected to Google, then back here
    } catch (error) {
      console.error('Google login redirect error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized for Google Sign-In.');
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
      
      // Save token to localStorage
      localStorage.setItem(TOKEN_KEY, response.data.token);
      
      login(response.data.token, response.data.user);
      toast.success(`Welcome, ${response.data.user.username}!`);
      
      navigationDone.current = true;
      navigate('/verify-age', { replace: true });
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
