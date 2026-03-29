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
import { signInWithGoogle, getGoogleRedirectResult, waitForFirebase } from '@/services/firebase.service';
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
  
  // Refs
  const backendSyncDone = useRef(false);
  const navigationDone = useRef(false);

  // Sync user with backend and save JWT
  const syncWithBackend = useCallback(async (userData) => {
    if (backendSyncDone.current) {
      console.log('Backend sync already done');
      return false;
    }
    
    backendSyncDone.current = true;
    
    try {
      console.log('=== SYNCING WITH BACKEND ===');
      console.log('UID:', userData.uid);
      console.log('Email:', userData.email);
      console.log('Name:', userData.displayName);
      console.log('ID Token:', userData.idToken ? 'YES (' + userData.idToken.length + ' chars)' : 'NO');
      
      const browserLocale = getBrowserLocale();
      
      const response = await axios.post(`${API_URL}/auth/google`, {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        idToken: userData.idToken,
        browser_locale: browserLocale
      });
      
      console.log('=== BACKEND RESPONSE ===');
      console.log('JWT Token:', response.data.token ? 'YES' : 'NO');
      console.log('User:', response.data.user?.username);
      
      if (!response.data.token) {
        toast.error('Login failed - no token received');
        backendSyncDone.current = false;
        return false;
      }
      
      // Save JWT to localStorage
      localStorage.setItem(TOKEN_KEY, response.data.token);
      console.log('JWT saved to localStorage');
      
      // Update auth context
      login(response.data.token, response.data.user);
      
      toast.success(`Welcome, ${response.data.user.username || response.data.user.email}!`);
      
      // Navigate
      navigationDone.current = true;
      if (response.data.user.age_verified) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/verify-age', { replace: true });
      }
      
      return true;
    } catch (error) {
      console.error('=== BACKEND ERROR ===', error.response?.data || error.message);
      toast.error(getErrorMessage(error));
      backendSyncDone.current = false;
      return false;
    }
  }, [login, navigate]);

  // Check for existing session on mount
  useEffect(() => {
    if (authLoading) return;
    
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (user && storedToken && !navigationDone.current) {
      console.log('Already logged in, redirecting...');
      navigationDone.current = true;
      navigate(user.age_verified ? '/dashboard' : '/verify-age', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Check for Google redirect result on page load
  useEffect(() => {
    const checkRedirect = async () => {
      // Skip if already have token
      const existingToken = localStorage.getItem(TOKEN_KEY);
      if (existingToken) {
        console.log('Token exists, skipping redirect check');
        setCheckingRedirect(false);
        return;
      }
      
      console.log('=== CHECKING FOR GOOGLE REDIRECT ===');
      
      try {
        await waitForFirebase();
        
        const userData = await getGoogleRedirectResult();
        
        if (userData) {
          console.log('=== GOT USER FROM REDIRECT ===');
          setSocialLoading('google');
          await syncWithBackend(userData);
          setSocialLoading(null);
        } else {
          console.log('No redirect result');
        }
      } catch (error) {
        console.error('Redirect check error:', error);
        if (error.code === 'auth/unauthorized-domain') {
          toast.error('This domain is not authorized for Google Sign-In');
        }
      }
      
      setCheckingRedirect(false);
    };
    
    checkRedirect();
  }, [syncWithBackend]);

  // Form field change handler
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Email/password login
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

  // Google login - NOW USES POPUP
  const handleGoogleLogin = async () => {
    if (socialLoading) return;
    
    console.log('=== GOOGLE LOGIN CLICKED ===');
    setSocialLoading('google');
    backendSyncDone.current = false;
    
    try {
      await waitForFirebase();
      
      // signInWithGoogle now returns user data directly (popup) or null (redirect)
      const userData = await signInWithGoogle();
      
      if (userData) {
        // Popup succeeded - sync with backend
        console.log('=== POPUP RETURNED USER ===');
        await syncWithBackend(userData);
      }
      // If null, page is redirecting to Google
      
    } catch (error) {
      console.error('Google login error:', error);
      
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized. Add it to Firebase Console.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed popup, no error needed
      } else {
        toast.error('Google login failed: ' + error.message);
      }
      setSocialLoading(null);
    }
  };

  // Guest login
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
