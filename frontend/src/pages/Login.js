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
  handleGoogleRedirect
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
  
  const syncDone = useRef(false);

  // Sync Firebase user with backend
  const syncWithBackend = useCallback(async (firebaseUser) => {
    if (syncDone.current) {
      console.log('Sync already done, skipping');
      return false;
    }
    
    syncDone.current = true;
    
    // User-requested debug logs
    console.log('=== FIREBASE USER DETECTED ===');
    console.log('Firebase user detected', firebaseUser);
    console.log('Email:', firebaseUser.email);
    console.log('UID:', firebaseUser.uid);
    console.log('Provider:', firebaseUser.providerData?.[0]?.providerId);
    
    try {
      // Get fresh ID token
      const idToken = await firebaseUser.getIdToken(true);
      console.log('Got Firebase ID token, calling /api/auth/google...');
      
      // Call backend
      const response = await axios.post(`${API_URL}/auth/google`, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        idToken: idToken,
        browser_locale: getBrowserLocale()
      });
      
      // User-requested debug logs
      console.log('=== BACKEND RESPONSE ===');
      console.log('Token received from backend', response.data.token);
      console.log('User:', response.data.user?.username);
      
      if (!response.data.token) {
        console.error('ERROR: No token in backend response!');
        syncDone.current = false;
        toast.error('Login failed - no token');
        setCheckingRedirect(false);
        setSocialLoading(null);
        return false;
      }
      
      // CRITICAL STEP 1: Save JWT to localStorage BEFORE anything else
      console.log('STEP 1: Saving JWT to localStorage...');
      localStorage.setItem(TOKEN_KEY, response.data.token);
      
      // Verify save was successful
      const savedToken = localStorage.getItem(TOKEN_KEY);
      console.log('Token saved to localStorage');
      console.log('Verification - Token in localStorage:', savedToken ? 'YES (length: ' + savedToken.length + ')' : 'NO');
      
      if (!savedToken) {
        console.error('CRITICAL ERROR: Failed to save token to localStorage!');
        syncDone.current = false;
        toast.error('Login failed - storage error');
        setCheckingRedirect(false);
        setSocialLoading(null);
        return false;
      }
      
      // CRITICAL STEP 2: Update auth context
      console.log('STEP 2: Updating auth context...');
      console.log('User state set');
      login(response.data.token, response.data.user);
      
      // CRITICAL STEP 3: Clear pending flags AFTER success
      console.log('STEP 3: Clearing Google auth pending flags...');
      clearGoogleAuthPending();
      
      // Show success
      toast.success(`Welcome, ${response.data.user.username}!`);
      
      // CRITICAL STEP 4: Redirect ONLY after everything is saved
      const destination = response.data.user.age_verified ? '/dashboard' : '/verify-age';
      console.log('STEP 4: Redirecting to:', destination);
      
      // Small delay to ensure state is propagated
      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Backend sync error:', error.response?.data || error.message);
      syncDone.current = false;
      clearGoogleAuthPending();
      setCheckingRedirect(false);
      setSocialLoading(null);
      toast.error(getErrorMessage(error));
      return false;
    }
  }, [login, navigate]);

  // Check for Google redirect on mount
  useEffect(() => {
    const checkGoogleRedirect = async () => {
      console.log('=== LOGIN PAGE MOUNTED ===');
      console.log('authLoading:', authLoading);
      console.log('checkingRedirect:', checkingRedirect);
      
      // Already logged in?
      const existingToken = localStorage.getItem(TOKEN_KEY);
      console.log('Existing token in localStorage:', existingToken ? 'YES' : 'NO');
      
      if (existingToken && user) {
        console.log('Already logged in with token AND user, redirecting...');
        navigate(user.age_verified ? '/dashboard' : '/verify-age', { replace: true });
        setCheckingRedirect(false);
        return;
      }
      
      // Check if returning from Google redirect
      const wasPending = isGoogleAuthPending();
      console.log('Google auth pending flag:', wasPending);
      
      if (wasPending) {
        console.log('=== HANDLING GOOGLE REDIRECT ===');
        setSocialLoading('google');
        
        try {
          console.log('Step 1: Calling handleGoogleRedirect()...');
          const firebaseUser = await handleGoogleRedirect();
          
          if (firebaseUser) {
            console.log('Step 2: Firebase user found from redirect');
            console.log('Firebase user detected', firebaseUser);
            await syncWithBackend(firebaseUser);
          } else {
            console.log('No Firebase user from redirect - redirect may have failed');
            setSocialLoading(null);
            setCheckingRedirect(false);
            // Signal AuthContext that Google auth check is done (no user found)
            if (finishAuthCheck) finishAuthCheck();
          }
        } catch (error) {
          console.error('Google redirect error:', error);
          setSocialLoading(null);
          setCheckingRedirect(false);
          // Signal AuthContext that Google auth check is done (error)
          if (finishAuthCheck) finishAuthCheck();
          
          if (error.code === 'auth/unauthorized-domain') {
            toast.error('Domain not authorized in Firebase Console');
          } else {
            toast.error('Google login failed: ' + (error.message || 'Unknown error'));
          }
        }
      } else {
        console.log('No pending Google auth, showing login form');
        setCheckingRedirect(false);
        // Signal AuthContext that there was no pending auth to handle
        if (finishAuthCheck) finishAuthCheck();
      }
    };
    
    // Only run once authLoading is resolved OR if there's pending Google auth
    // This ensures we don't wait forever if AuthContext is waiting for us
    const pendingAuth = isGoogleAuthPending();
    if (!authLoading || pendingAuth) {
      checkGoogleRedirect();
    }
  }, [authLoading, user, navigate, syncWithBackend, finishAuthCheck]);

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
    
    console.log('=== STARTING GOOGLE LOGIN ===');
    setSocialLoading('google');
    syncDone.current = false;
    
    try {
      await signInWithGoogle();
      // Page will redirect to Google, then back here
    } catch (error) {
      console.error('Google login error:', error);
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

  // Loading state
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
