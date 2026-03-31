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
import { 
  signInWithGoogle, 
  isFirebaseReady,
  isGoogleAuthPending,
  clearGoogleAuthPending,
  waitForAuthState,
  onAuthStateChange
} from '@/services/firebase.service';
import { 
  validateLoginForm, 
  getErrorMessage,
  getBrowserLocale,
  TOKEN_KEY
} from '@/utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading, finishAuthCheck } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [checkingRedirect, setCheckingRedirect] = useState(true);
  
  // Refs to prevent double execution
  const syncAttempted = useRef(false);
  const unsubscribeRef = useRef(null);

  // Sync Firebase user with backend
  const syncWithBackend = useCallback(async (firebaseUser) => {
    // Prevent double sync
    if (syncAttempted.current) {
      console.log('[LOGIN] Sync already attempted, skipping');
      return false;
    }
    syncAttempted.current = true;
    
    console.log('==========================================');
    console.log('[LOGIN] SYNCING WITH BACKEND');
    console.log('[LOGIN] Email:', firebaseUser.email);
    console.log('[LOGIN] UID:', firebaseUser.uid);
    console.log('==========================================');
    
    try {
      // Get Firebase ID token
      console.log('[LOGIN] Getting Firebase ID token...');
      const idToken = await firebaseUser.getIdToken(true);
      console.log('[LOGIN] Token length:', idToken.length);
      
      // Call backend
      console.log('[LOGIN] Calling /api/auth/google...');
      const response = await axios.post(`${API_URL}/auth/google`, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        idToken: idToken,
        browser_locale: getBrowserLocale()
      });
      
      console.log('[LOGIN] Backend response received');
      console.log('[LOGIN] Token:', response.data.token ? 'YES' : 'NO');
      console.log('[LOGIN] User:', response.data.user?.username);
      
      if (!response.data.token) {
        console.error('[LOGIN] No token in response!');
        syncAttempted.current = false;
        toast.error('Login failed - no token from server');
        return false;
      }
      
      // Save JWT
      console.log('[LOGIN] Saving JWT token...');
      localStorage.setItem(TOKEN_KEY, response.data.token);
      
      // Update auth context
      console.log('[LOGIN] Updating auth context...');
      login(response.data.token, response.data.user);
      
      // Clear pending flags
      clearGoogleAuthPending();
      
      // Navigate
      toast.success(`Welcome, ${response.data.user.username}!`);
      const destination = response.data.user.age_verified ? '/dashboard' : '/verify-age';
      console.log('[LOGIN] Navigating to:', destination);
      
      navigate(destination, { replace: true });
      return true;
      
    } catch (error) {
      console.error('[LOGIN] SYNC ERROR:', error.response?.data || error.message);
      syncAttempted.current = false;
      clearGoogleAuthPending();
      toast.error(getErrorMessage(error));
      return false;
    }
  }, [login, navigate]);

  // Main effect: Handle auth state
  useEffect(() => {
    console.log('[LOGIN] Component mounted');
    
    // Check if already logged in with our JWT
    const existingToken = localStorage.getItem(TOKEN_KEY);
    if (existingToken && user) {
      console.log('[LOGIN] Already logged in, redirecting');
      navigate(user.age_verified ? '/dashboard' : '/verify-age', { replace: true });
      setCheckingRedirect(false);
      return;
    }
    
    // Check if Google auth redirect is pending
    const wasPending = isGoogleAuthPending();
    console.log('[LOGIN] Google auth pending:', wasPending);
    
    if (!wasPending) {
      // No pending redirect, just show login form
      console.log('[LOGIN] No pending auth, showing login form');
      setCheckingRedirect(false);
      if (finishAuthCheck) finishAuthCheck();
      return;
    }
    
    // === PENDING REDIRECT: Wait for Firebase auth state ===
    console.log('[LOGIN] Processing Google redirect...');
    setSocialLoading('google');
    
    // Subscribe to auth state changes
    const handleAuthState = async (firebaseUser) => {
      console.log('[LOGIN] Auth state changed:', firebaseUser?.email || 'null');
      
      if (firebaseUser) {
        // User is logged in! Sync with backend
        console.log('[LOGIN] Firebase user found, syncing...');
        const success = await syncWithBackend(firebaseUser);
        
        if (!success) {
          setSocialLoading(null);
          setCheckingRedirect(false);
          if (finishAuthCheck) finishAuthCheck();
        }
        // If success, syncWithBackend handles navigation
      } else {
        // No user after redirect - something went wrong
        console.log('[LOGIN] No Firebase user after redirect');
        clearGoogleAuthPending();
        setSocialLoading(null);
        setCheckingRedirect(false);
        if (finishAuthCheck) finishAuthCheck();
        toast.error('Google login was not completed. Please try again.');
      }
      
      // Unsubscribe after handling
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    
    // First check if user is already available
    const checkInitialState = async () => {
      const firebaseUser = await waitForAuthState();
      console.log('[LOGIN] Initial auth state:', firebaseUser?.email || 'null');
      
      if (firebaseUser) {
        // User already available, sync immediately
        await handleAuthState(firebaseUser);
      } else {
        // Subscribe to future changes (in case auth state updates later)
        console.log('[LOGIN] Subscribing to auth state changes...');
        unsubscribeRef.current = onAuthStateChange((user) => {
          if (user && isGoogleAuthPending()) {
            handleAuthState(user);
          }
        });
        
        // Set a timeout to prevent infinite waiting
        setTimeout(() => {
          if (isGoogleAuthPending() && !syncAttempted.current) {
            console.log('[LOGIN] Timeout: No user after 5 seconds');
            clearGoogleAuthPending();
            setSocialLoading(null);
            setCheckingRedirect(false);
            if (finishAuthCheck) finishAuthCheck();
            toast.error('Google login timed out. Please try again.');
            
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
              unsubscribeRef.current = null;
            }
          }
        }, 5000);
      }
    };
    
    checkInitialState();
    
    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user, navigate, syncWithBackend, finishAuthCheck]);

  // Form handlers
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    const validation = validateLoginForm(formData.email, formData.password);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email,
        password: formData.password
      });
      
      localStorage.setItem(TOKEN_KEY, response.data.token);
      login(response.data.token, response.data.user);
      toast.success('Welcome back!');
      navigate(response.data.user.age_verified ? '/dashboard' : '/verify-age', { replace: true });
    } catch (error) {
      setErrors({ form: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  // Google login handler
  const handleGoogleLogin = async () => {
    if (socialLoading) return;
    
    if (!isFirebaseReady()) {
      toast.error('Please wait, loading...');
      return;
    }
    
    console.log('[LOGIN] User clicked Google login');
    
    setSocialLoading('google');
    syncAttempted.current = false;
    
    try {
      await signInWithGoogle();
      // Page will redirect to Google
    } catch (error) {
      console.error('[LOGIN] Google login error:', error);
      toast.error('Failed to start Google login');
      setSocialLoading(null);
    }
  };

  // Guest login handler
  const handleAnonymousLogin = async () => {
    if (socialLoading) return;
    
    setSocialLoading('anonymous');
    try {
      const response = await axios.post(`${API_URL}/auth/guest`, { 
        gender: 'male',
        browser_locale: getBrowserLocale()
      });
      
      localStorage.setItem(TOKEN_KEY, response.data.token);
      login(response.data.token, response.data.user);
      toast.success(`Welcome, ${response.data.user.username}!`);
      navigate('/verify-age', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSocialLoading(null);
    }
  };

  // Show loading while checking redirect
  if (checkingRedirect) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">
            {socialLoading === 'google' ? 'Signing in with Google...' : 'Loading...'}
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
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
