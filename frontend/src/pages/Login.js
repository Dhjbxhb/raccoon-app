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
import { isFirebaseReady, signInWithGoogle, getGoogleRedirectResult, auth, waitForFirebase } from '@/services/firebase.service';
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
  
  // Refs to prevent double-processing
  const backendSyncDone = useRef(false);
  const navigationDone = useRef(false);

  const firebaseReady = isFirebaseReady();

  // DEBUG: Log current auth state
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    console.log('=== LOGIN PAGE STATE ===');
    console.log('localStorage token:', storedToken ? 'EXISTS' : 'NULL');
    console.log('Context user:', user ? user.username || user.email : 'NULL');
    console.log('Auth loading:', authLoading);
    console.log('Checking redirect:', checkingRedirect);
  }, [user, authLoading, checkingRedirect]);

  // Sync Firebase user with backend - THE CRITICAL FUNCTION
  const syncFirebaseUserWithBackend = useCallback(async (firebaseUser) => {
    // Prevent duplicate calls
    if (backendSyncDone.current) {
      console.log('Backend sync already done, skipping');
      return false;
    }
    
    backendSyncDone.current = true;
    
    try {
      console.log('=== SYNCING FIREBASE USER WITH BACKEND ===');
      console.log('Firebase UID:', firebaseUser.uid);
      console.log('Email:', firebaseUser.email);
      console.log('Display Name:', firebaseUser.displayName);
      
      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken(true);
      console.log('Got Firebase ID token:', idToken ? 'YES (length: ' + idToken.length + ')' : 'NO');
      
      if (!idToken) {
        console.error('Failed to get Firebase ID token');
        toast.error('Authentication failed. Please try again.');
        backendSyncDone.current = false;
        return false;
      }
      
      const browserLocale = getBrowserLocale();
      
      // Send to backend
      console.log('Sending to backend /api/auth/google...');
      const response = await axios.post(`${API_URL}/auth/google`, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        idToken: idToken,
        browser_locale: browserLocale
      });
      
      console.log('=== BACKEND RESPONSE ===');
      console.log('Token received:', response.data.token ? 'YES' : 'NO');
      console.log('User:', response.data.user?.username);
      
      if (!response.data.token) {
        console.error('No JWT token in backend response!');
        toast.error('Login failed. Please try again.');
        backendSyncDone.current = false;
        return false;
      }
      
      // CRITICAL: Save JWT token to localStorage
      console.log('Saving JWT token to localStorage...');
      localStorage.setItem(TOKEN_KEY, response.data.token);
      
      // Verify it was saved
      const savedToken = localStorage.getItem(TOKEN_KEY);
      console.log('Token saved:', savedToken ? 'SUCCESS' : 'FAILED');
      
      // Update auth context
      login(response.data.token, response.data.user);
      console.log('Auth context updated');
      
      toast.success(`Welcome, ${response.data.user.username || response.data.user.email}!`);
      
      // Navigate
      navigationDone.current = true;
      setCheckingRedirect(false);
      
      if (response.data.user.age_verified) {
        console.log('Navigating to dashboard');
        navigate('/dashboard', { replace: true });
      } else {
        console.log('Navigating to age verification');
        navigate('/verify-age', { replace: true });
      }
      
      return true;
    } catch (error) {
      console.error('=== BACKEND SYNC ERROR ===', error);
      console.error('Response:', error.response?.data);
      toast.error(getErrorMessage(error));
      backendSyncDone.current = false;
      return false;
    }
  }, [login, navigate]);

  // Redirect if already logged in (via our JWT token)
  useEffect(() => {
    if (authLoading) return;
    
    const storedToken = localStorage.getItem(TOKEN_KEY);
    
    if (user && storedToken && !navigationDone.current) {
      console.log('=== ALREADY LOGGED IN (JWT exists) ===');
      navigationDone.current = true;
      setCheckingRedirect(false);
      
      if (!user.age_verified) {
        navigate('/verify-age', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  // Handle Google redirect - Listen for Firebase auth state changes
  useEffect(() => {
    let unsubscribe = () => {};
    let authCheckTimeout;
    let cancelled = false;
    
    const setupFirebaseListener = async () => {
      // Wait for Firebase to be fully initialized
      console.log('=== WAITING FOR FIREBASE ===');
      const ready = await waitForFirebase();
      console.log('Firebase ready:', ready);
      
      if (cancelled) return;
      
      if (!ready || !auth) {
        console.log('Firebase not ready');
        setCheckingRedirect(false);
        return;
      }
      
      // Skip if already have a valid JWT token
      const existingToken = localStorage.getItem(TOKEN_KEY);
      if (existingToken) {
        console.log('JWT token already exists, skipping Firebase check');
        setCheckingRedirect(false);
        return;
      }
      
      console.log('=== CHECKING FOR GOOGLE REDIRECT ===');
      setSocialLoading('google');
      
      // FIRST - Check for redirect result (most important)
      try {
        console.log('Calling getGoogleRedirectResult...');
        const userData = await getGoogleRedirectResult();
        
        if (cancelled) return;
        
        if (userData) {
          console.log('=== REDIRECT RESULT FOUND ===');
          console.log('User:', userData.email);
          
          // Create a mock firebaseUser object with getIdToken
          const mockUser = {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            getIdToken: async () => userData.idToken
          };
          
          // Sync with backend
          await syncFirebaseUserWithBackend(mockUser);
          return; // Exit early, we're done
        }
        
        console.log('No redirect result found');
      } catch (error) {
        console.error('Redirect result error:', error);
        if (error.code === 'auth/unauthorized-domain') {
          toast.error('Domain not authorized for Google Sign-In');
          setSocialLoading(null);
          setCheckingRedirect(false);
          return;
        }
      }
      
      if (cancelled) return;
      
      // THEN - Check for current user (in case they're already signed into Firebase)
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        console.log('=== FOUND CURRENT USER ===');
        console.log('User:', auth.currentUser.email);
        
        const jwt = localStorage.getItem(TOKEN_KEY);
        if (!jwt && !backendSyncDone.current) {
          await syncFirebaseUserWithBackend(auth.currentUser);
          return;
        }
      }
      
      // No user found - wait a bit for auth state to settle
      console.log('No user found, setting timeout...');
      authCheckTimeout = setTimeout(() => {
        if (!cancelled) {
          console.log('Auth check complete - no user');
          setSocialLoading(null);
          setCheckingRedirect(false);
        }
      }, 1500);
    };
    
    setupFirebaseListener();
    
    return () => {
      cancelled = true;
      unsubscribe();
      clearTimeout(authCheckTimeout);
    };
  }, [syncFirebaseUserWithBackend]);

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
      
      // Save JWT token
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
      setErrors({ form: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // Google login handler
  const handleGoogleLogin = async () => {
    if (!firebaseReady) {
      toast.error('Please wait, initializing...');
      return;
    }
    if (socialLoading) return;

    console.log('=== GOOGLE LOGIN CLICKED ===');
    setSocialLoading('google');
    
    try {
      // Reset flags for the new login attempt
      backendSyncDone.current = false;
      navigationDone.current = false;
      
      // Clear any stale tokens
      localStorage.removeItem(TOKEN_KEY);
      
      // Start Google redirect
      await signInWithGoogle();
      // Page will redirect to Google
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Google login failed. Please try again.');
      setSocialLoading(null);
    }
  };

  // Guest login handler
  const handleAnonymousLogin = async () => {
    if (socialLoading) return;
    
    setSocialLoading('anonymous');
    try {
      const browserLocale = getBrowserLocale();
      const response = await axios.post(`${API_URL}/auth/guest`, { 
        gender: 'male',
        browser_locale: browserLocale
      });
      
      // Save JWT token
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

  // Show loading while checking auth
  if (authLoading || checkingRedirect) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">
            {socialLoading === 'google' ? 'Signing in with Google...' : 'Checking login status...'}
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

        {/* Social Login */}
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
