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
import { isFirebaseReady, signInWithGoogle, getGoogleRedirectResult, auth } from '@/services/firebase.service';
import { onAuthStateChanged } from 'firebase/auth';
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
  const redirectProcessed = useRef(false);
  const navigationDone = useRef(false);
  const backendSyncInProgress = useRef(false);

  const firebaseReady = isFirebaseReady();

  // DEBUG: Log current auth state
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    console.log('=== LOGIN PAGE STATE ===');
    console.log('localStorage token:', storedToken ? 'EXISTS' : 'NULL');
    console.log('Context token:', token ? 'EXISTS' : 'NULL');
    console.log('Context user:', user ? user.username || user.email : 'NULL');
    console.log('Auth loading:', authLoading);
    console.log('Checking redirect:', checkingRedirect);
  }, [token, user, authLoading, checkingRedirect]);

  // Sync Firebase user with backend - THE CRITICAL FUNCTION
  const syncFirebaseUserWithBackend = useCallback(async (firebaseUser) => {
    // Prevent duplicate calls
    if (backendSyncInProgress.current) {
      console.log('Backend sync already in progress, skipping');
      return false;
    }
    
    backendSyncInProgress.current = true;
    
    try {
      console.log('=== SYNCING FIREBASE USER WITH BACKEND ===');
      console.log('Firebase UID:', firebaseUser.uid);
      console.log('Email:', firebaseUser.email);
      console.log('Display Name:', firebaseUser.displayName);
      
      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken(true);
      console.log('Got Firebase ID token:', idToken ? 'YES' : 'NO');
      
      if (!idToken) {
        console.error('Failed to get Firebase ID token');
        toast.error('Authentication failed. Please try again.');
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
      return false;
    } finally {
      backendSyncInProgress.current = false;
    }
  }, [login, navigate]);

  // Redirect if already logged in (via our JWT token, not Firebase)
  useEffect(() => {
    if (authLoading) return;
    
    // Check OUR token, not Firebase
    const storedToken = localStorage.getItem(TOKEN_KEY);
    
    if (user && storedToken && !navigationDone.current) {
      console.log('=== ALREADY LOGGED IN (JWT exists) ===');
      navigationDone.current = true;
      
      if (!user.age_verified) {
        navigate('/verify-age', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  // Handle Google redirect result AND Firebase auth state
  useEffect(() => {
    if (!firebaseReady || !auth) {
      console.log('Firebase not ready');
      setCheckingRedirect(false);
      return;
    }
    
    // Skip if already have a valid JWT token
    const existingToken = localStorage.getItem(TOKEN_KEY);
    if (existingToken) {
      console.log('JWT token exists, skipping Firebase check');
      setCheckingRedirect(false);
      return;
    }
    
    if (redirectProcessed.current) {
      setCheckingRedirect(false);
      return;
    }
    
    redirectProcessed.current = true;
    
    const checkGoogleRedirect = async () => {
      console.log('=== CHECKING GOOGLE REDIRECT ===');
      setSocialLoading('google');
      
      try {
        // First, try to get redirect result
        const userData = await getGoogleRedirectResult();
        
        if (userData) {
          console.log('=== GOOGLE REDIRECT RESULT FOUND ===');
          // userData already has the user info from getGoogleRedirectResult
          // We need to get the actual Firebase user to call getIdToken
          const currentUser = auth.currentUser;
          if (currentUser) {
            await syncFirebaseUserWithBackend(currentUser);
          } else {
            console.log('No current user after redirect result');
          }
          return;
        }
        
        console.log('No redirect result, checking current Firebase user...');
        
        // Check if there's a current Firebase user (from previous session)
        const currentUser = auth.currentUser;
        if (currentUser && !currentUser.isAnonymous) {
          console.log('Found existing Firebase user:', currentUser.email);
          // User is signed into Firebase but we don't have JWT
          // This might be after a redirect
          await syncFirebaseUserWithBackend(currentUser);
          return;
        }
        
        console.log('No Firebase user found');
        
      } catch (error) {
        console.error('=== GOOGLE REDIRECT CHECK ERROR ===', error);
        
        if (error.code === 'auth/unauthorized-domain') {
          toast.error('This domain is not authorized for Google Sign-In. Please contact support.');
        }
      } finally {
        setSocialLoading(null);
        setCheckingRedirect(false);
      }
    };
    
    // Also listen for auth state changes (catches cases where redirect result is missed)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('=== FIREBASE AUTH STATE CHANGED ===');
      console.log('Firebase user:', firebaseUser ? firebaseUser.email : 'NULL');
      
      // Skip if already have JWT or sync in progress
      const existingJWT = localStorage.getItem(TOKEN_KEY);
      if (existingJWT || backendSyncInProgress.current || navigationDone.current) {
        return;
      }
      
      // If there's a Firebase user and they're not anonymous, sync with backend
      if (firebaseUser && !firebaseUser.isAnonymous) {
        console.log('Firebase user detected, syncing with backend...');
        setSocialLoading('google');
        await syncFirebaseUserWithBackend(firebaseUser);
        setSocialLoading(null);
      }
    });
    
    checkGoogleRedirect();
    
    return () => unsubscribe();
  }, [firebaseReady, syncFirebaseUserWithBackend]);

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
      redirectProcessed.current = false;
      navigationDone.current = false;
      backendSyncInProgress.current = false;
      
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
