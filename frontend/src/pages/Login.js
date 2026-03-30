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
  const redirectChecked = useRef(false);

  // Sync Firebase user with backend - this is the CRITICAL function
  const syncWithBackend = useCallback(async (firebaseUser) => {
    if (syncDone.current) {
      console.log('syncWithBackend: Already synced, skipping');
      return false;
    }
    
    syncDone.current = true;
    
    console.log('========================================');
    console.log('=== SYNCING WITH BACKEND ===');
    console.log('Firebase user email:', firebaseUser.email);
    console.log('Firebase user UID:', firebaseUser.uid);
    console.log('========================================');
    
    try {
      // Step 1: Get Firebase ID token
      console.log('STEP 1: Getting Firebase ID token...');
      const idToken = await firebaseUser.getIdToken(true);
      console.log('Got ID token (length):', idToken.length);
      
      // Step 2: Call backend /api/auth/google
      console.log('STEP 2: Calling /api/auth/google...');
      const response = await axios.post(`${API_URL}/auth/google`, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        idToken: idToken,
        browser_locale: getBrowserLocale()
      });
      
      console.log('STEP 2 RESULT: Backend responded');
      console.log('Token received:', response.data.token ? 'YES' : 'NO');
      console.log('User:', response.data.user?.username);
      
      if (!response.data.token) {
        console.error('ERROR: No token in backend response!');
        syncDone.current = false;
        toast.error('Login failed - no token from server');
        return false;
      }
      
      // Step 3: Save JWT to localStorage
      console.log('STEP 3: Saving JWT to localStorage...');
      localStorage.setItem(TOKEN_KEY, response.data.token);
      
      // Verify save
      const savedToken = localStorage.getItem(TOKEN_KEY);
      console.log('Token saved:', savedToken ? `YES (${savedToken.length} chars)` : 'FAILED');
      
      if (!savedToken) {
        console.error('CRITICAL: Failed to save token to localStorage!');
        syncDone.current = false;
        toast.error('Login failed - storage error');
        return false;
      }
      
      // Step 4: Update auth context
      console.log('STEP 4: Updating auth context...');
      login(response.data.token, response.data.user);
      
      // Step 5: Clear pending flags
      console.log('STEP 5: Clearing Google auth pending flags...');
      clearGoogleAuthPending();
      
      // Step 6: Navigate to dashboard
      toast.success(`Welcome, ${response.data.user.username}!`);
      
      const destination = response.data.user.age_verified ? '/dashboard' : '/verify-age';
      console.log('STEP 6: Navigating to:', destination);
      
      // Use a small delay to ensure state propagates
      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 100);
      
      return true;
      
    } catch (error) {
      console.error('========================================');
      console.error('SYNC ERROR:', error.response?.data || error.message);
      console.error('========================================');
      syncDone.current = false;
      clearGoogleAuthPending();
      toast.error(getErrorMessage(error));
      return false;
    }
  }, [login, navigate]);

  // Check for Google redirect on mount - runs ONCE
  useEffect(() => {
    const checkRedirect = async () => {
      // Prevent multiple checks
      if (redirectChecked.current) return;
      redirectChecked.current = true;
      
      console.log('========================================');
      console.log('=== LOGIN PAGE: CHECKING REDIRECT ===');
      console.log('Auth loading:', authLoading);
      console.log('User:', user?.username || 'null');
      console.log('========================================');
      
      // Check if already logged in
      const existingToken = localStorage.getItem(TOKEN_KEY);
      if (existingToken && user) {
        console.log('Already logged in, redirecting to dashboard');
        navigate(user.age_verified ? '/dashboard' : '/verify-age', { replace: true });
        setCheckingRedirect(false);
        return;
      }
      
      // Check for Google redirect
      const wasPending = isGoogleAuthPending();
      console.log('Google auth pending:', wasPending);
      
      if (wasPending) {
        console.log('=== PROCESSING GOOGLE REDIRECT ===');
        setSocialLoading('google');
        
        try {
          const firebaseUser = await handleGoogleRedirect();
          
          if (firebaseUser) {
            console.log('Firebase user found:', firebaseUser.email);
            const success = await syncWithBackend(firebaseUser);
            
            if (!success) {
              console.log('Sync failed, showing login form');
              setSocialLoading(null);
              setCheckingRedirect(false);
              if (finishAuthCheck) finishAuthCheck();
            }
            // If success, syncWithBackend will handle navigation
          } else {
            console.log('No Firebase user found from redirect');
            clearGoogleAuthPending();
            setSocialLoading(null);
            setCheckingRedirect(false);
            if (finishAuthCheck) finishAuthCheck();
          }
        } catch (error) {
          console.error('Redirect handling error:', error);
          clearGoogleAuthPending();
          setSocialLoading(null);
          setCheckingRedirect(false);
          if (finishAuthCheck) finishAuthCheck();
          
          if (error.code === 'auth/unauthorized-domain') {
            toast.error('Domain not authorized in Firebase Console');
          } else {
            toast.error('Google login failed: ' + (error.message || 'Unknown error'));
          }
        }
      } else {
        console.log('No pending Google auth');
        setCheckingRedirect(false);
        if (finishAuthCheck) finishAuthCheck();
      }
    };
    
    // Run check immediately (don't wait for authLoading)
    // because we need to process the redirect before AuthContext times out
    checkRedirect();
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
    redirectChecked.current = false;
    
    try {
      await signInWithGoogle();
      // Page will redirect to Google
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

  // Show loading while checking redirect
  if (checkingRedirect) {
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
