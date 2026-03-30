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
  addAuthStateListener,
  auth
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
  const { login, user, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [checkingRedirect, setCheckingRedirect] = useState(true);
  
  const syncDone = useRef(false);

  // CRITICAL: Sync Firebase user with backend and get JWT
  const syncWithBackend = useCallback(async (firebaseUser) => {
    if (syncDone.current) {
      console.log('Sync already done, skipping');
      return false;
    }
    
    if (!firebaseUser || firebaseUser.isAnonymous) {
      console.log('No valid Firebase user to sync');
      return false;
    }
    
    // Check if this is a Google user
    const isGoogleUser = firebaseUser.providerData?.some(p => p.providerId === 'google.com');
    if (!isGoogleUser) {
      console.log('Not a Google user, skipping backend sync');
      return false;
    }
    
    syncDone.current = true;
    
    try {
      console.log('=== SYNCING WITH BACKEND ===');
      console.log('Firebase UID:', firebaseUser.uid);
      console.log('Email:', firebaseUser.email);
      
      // STEP 1: Get Firebase ID token
      const idToken = await firebaseUser.getIdToken(true);
      console.log('Got Firebase ID token');
      
      // STEP 2: Send to backend
      const response = await axios.post(`${API_URL}/auth/google`, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        idToken: idToken,
        browser_locale: getBrowserLocale()
      });
      
      console.log('Backend response received');
      console.log('Token:', response.data.token ? 'YES' : 'NO');
      console.log('User:', response.data.user?.username);
      
      if (!response.data.token) {
        console.error('No token in backend response');
        syncDone.current = false;
        toast.error('Login failed - no token received');
        return false;
      }
      
      // STEP 3: Clear pending flags
      clearGoogleAuthPending();
      
      // STEP 4: Save JWT to localStorage (SOURCE OF TRUTH)
      localStorage.setItem(TOKEN_KEY, response.data.token);
      console.log('JWT saved to localStorage');
      
      // STEP 5: Update auth context
      login(response.data.token, response.data.user);
      
      // STEP 6: Show success and redirect
      toast.success(`Welcome, ${response.data.user.username}!`);
      
      const destination = response.data.user.age_verified ? '/dashboard' : '/verify-age';
      console.log('Redirecting to:', destination);
      navigate(destination, { replace: true });
      
      return true;
    } catch (error) {
      console.error('Backend sync error:', error);
      syncDone.current = false;
      clearGoogleAuthPending();
      toast.error(getErrorMessage(error));
      return false;
    }
  }, [login, navigate]);

  // Main auth check effect
  useEffect(() => {
    let unsubscribe = null;
    let handled = false;
    
    const checkAuth = async () => {
      console.log('=== LOGIN PAGE AUTH CHECK ===');
      
      // RULE: If JWT exists in localStorage, user is authenticated
      const existingToken = localStorage.getItem(TOKEN_KEY);
      if (existingToken && user) {
        console.log('JWT exists and user loaded - redirecting');
        navigate(user.age_verified ? '/dashboard' : '/verify-age', { replace: true });
        setCheckingRedirect(false);
        return;
      }
      
      // Check if Firebase is ready
      if (!isFirebaseReady()) {
        console.log('Firebase not ready yet');
        setCheckingRedirect(false);
        return;
      }
      
      // Check if we're returning from Google redirect
      const wasPending = isGoogleAuthPending();
      console.log('Google auth pending:', wasPending);
      
      if (wasPending) {
        setSocialLoading('google');
        
        // Subscribe to auth state changes - this will fire when Firebase restores the user
        unsubscribe = addAuthStateListener(async (firebaseUser) => {
          if (handled) return;
          
          console.log('Auth state listener fired:', firebaseUser?.email || 'null');
          
          if (firebaseUser && !firebaseUser.isAnonymous) {
            handled = true;
            const success = await syncWithBackend(firebaseUser);
            if (!success) {
              handled = false;
              setSocialLoading(null);
              setCheckingRedirect(false);
            }
          }
        });
        
        // Also check current user directly (Firebase may have already restored it)
        if (auth?.currentUser && !auth.currentUser.isAnonymous) {
          console.log('Firebase currentUser already exists:', auth.currentUser.email);
          if (!handled) {
            handled = true;
            const success = await syncWithBackend(auth.currentUser);
            if (!success) {
              handled = false;
            }
          }
        }
        
        // Give Firebase some time to restore auth state
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!handled) {
          console.log('No Google user found after waiting');
          clearGoogleAuthPending();
          setSocialLoading(null);
          setCheckingRedirect(false);
        }
      } else {
        setCheckingRedirect(false);
      }
    };
    
    if (!authLoading) {
      checkAuth();
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [authLoading, user, navigate, syncWithBackend]);

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
      
      // Save JWT (SOURCE OF TRUTH)
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
      // This will redirect to Google
      await signInWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Google login failed');
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
      
      // Save JWT (SOURCE OF TRUTH)
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

  // Loading state while checking auth
  if (authLoading || checkingRedirect) {
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
