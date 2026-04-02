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
import { signInWithGoogle, isFirebaseReady } from '@/services/firebase.service';
import { 
  validateLoginForm, 
  getErrorMessage,
  getBrowserLocale,
  TOKEN_KEY
} from '@/utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  
  const syncAttempted = useRef(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && user) {
      navigate(user.age_verified ? '/dashboard' : '/verify-age', { replace: true });
    }
  }, [user, navigate]);

  // Sync Firebase user with backend
  const syncWithBackend = useCallback(async (firebaseUser) => {
    if (syncAttempted.current) return false;
    syncAttempted.current = true;
    
    console.log('[LOGIN] ==========================================');
    console.log('[LOGIN] SYNCING WITH BACKEND');
    console.log('[LOGIN] email:', firebaseUser.email);
    console.log('[LOGIN] uid:', firebaseUser.uid);
    console.log('[LOGIN] ==========================================');
    
    try {
      // Get ID token
      console.log('[LOGIN] Getting ID token...');
      const idToken = await firebaseUser.getIdToken(true);
      console.log('[LOGIN] Token obtained, length:', idToken.length);
      
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
      
      console.log('[LOGIN] Backend response:');
      console.log('[LOGIN] - token:', response.data.token ? 'YES' : 'NO');
      console.log('[LOGIN] - user:', response.data.user?.username);
      
      if (!response.data.token) {
        throw new Error('No token in response');
      }
      
      // Save and login
      localStorage.setItem(TOKEN_KEY, response.data.token);
      login(response.data.token, response.data.user);
      
      toast.success(`Welcome, ${response.data.user.username}!`);
      
      const dest = response.data.user.age_verified ? '/dashboard' : '/verify-age';
      console.log('[LOGIN] SUCCESS! Redirecting to:', dest);
      navigate(dest, { replace: true });
      
      return true;
      
    } catch (error) {
      console.error('[LOGIN] Sync error:', error.response?.data || error.message);
      syncAttempted.current = false;
      toast.error(getErrorMessage(error));
      return false;
    }
  }, [login, navigate]);

  // Form handlers
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
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

  // Google login - POPUP ONLY
  const handleGoogleLogin = async () => {
    if (socialLoading) return;
    
    if (!isFirebaseReady()) {
      toast.error('Firebase not ready. Please refresh.');
      return;
    }
    
    console.log('[LOGIN] ==========================================');
    console.log('[LOGIN] GOOGLE LOGIN CLICKED');
    console.log('[LOGIN] ==========================================');
    
    setSocialLoading('google');
    syncAttempted.current = false;
    
    try {
      // Get user directly from popup - no redirect, no cross-domain issues
      const firebaseUser = await signInWithGoogle();
      
      console.log('[LOGIN] Got Firebase user:', firebaseUser.email);
      
      // Sync with backend immediately
      const success = await syncWithBackend(firebaseUser);
      
      if (!success) {
        setSocialLoading(null);
      }
      
    } catch (error) {
      console.error('[LOGIN] Google login error:', error.code, error.message);
      
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Popup closed. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup blocked. Please allow popups for this site.');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized in Firebase.');
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
