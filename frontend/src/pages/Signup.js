import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, Camera, CalendarDays } from 'lucide-react';
import {
  AuthLayout,
  AuthCard,
  AuthInput,
  AuthButton,
  AuthFooterLink
} from '@/components/auth/AuthComponents';
import { SocialAuthSection } from '@/components/auth/SocialAuthButtons';
import PhoneAuthSection from '@/components/auth/PhoneAuthSection';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Flag from '@/components/ui/Flag';
import { isFirebaseReady, signInWithGoogle } from '@/services/firebase.service';
import { getAvatarGradient } from '@/utils/avatarColor';
import { detectDefaultCountry, getFlagEmoji } from '@/data/countries';
import {
  validateSignupForm,
  getErrorMessage,
  getBrowserLocale,
  getPostAuthRedirect,
  getAge
} from '@/utils/auth';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'any', label: 'Prefer not to say' },
];

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const Signup = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    gender: '',
    dateOfBirth: ''
  });
  const [country, setCountry] = useState(() => detectDefaultCountry());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'phone'
  const avatarInputRef = useRef(null);

  const firebaseReady = isFirebaseReady();

  // Revoke the object URL when replaced/unmounted to avoid leaking memory
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // Detect the real country from the visitor's IP (falls back to the
  // browser-locale guess already in state if the request fails).
  useEffect(() => {
    let cancelled = false;
    axios.get(`${API_URL}/geo/detect-country`)
      .then(({ data }) => {
        if (cancelled || !data?.country_code) return;
        setCountry({ code: data.country_code, name: data.country });
      })
      .catch(() => {
        // Keep the browser-locale fallback already set as initial state
      });
    return () => { cancelled = true; };
  }, []);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, or WEBP image');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Redirect if already logged in. Skipped for users who still need to
  // verify their email, so pressing Back from that screen lands here
  // normally instead of being bounced straight back to it.
  useEffect(() => {
    if (user && !authLoading) {
      const dest = getPostAuthRedirect(user);
      if (dest !== '/verify-email-pending') {
        navigate(dest);
      }
    }
  }, [user, authLoading, navigate]);

  // Clear field error when user types
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Upload the chosen profile picture, if any. Best-effort: the account is
  // already created by the time this runs, so an upload failure here must
  // not block the user from continuing - they can add one later from
  // Profile. Mutates newUser in place with the resulting avatar_url.
  const uploadAvatarIfSelected = async (newToken, newUser) => {
    if (!avatarFile) return;
    try {
      const avatarFormData = new FormData();
      avatarFormData.append('file', avatarFile);
      const avatarResponse = await axios.post(`${API_URL}/profile/avatar`, avatarFormData, {
        headers: { Authorization: `Bearer ${newToken}` }
      });
      newUser.avatar_url = avatarResponse.data.avatar_url;
    } catch (avatarError) {
      toast.error('Account created, but the profile picture upload failed - you can add it later from Profile.');
    }
  };

  // Handle email/password signup
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    // Terms validation
    if (!agreedToTerms) {
      setErrors(prev => ({ ...prev, terms: 'Please agree to the Terms of Service and Privacy Policy' }));
      return;
    }

    // Client-side validation
    const validation = validateSignupForm(formData);
    if (!formData.dateOfBirth) {
      validation.errors.dateOfBirth = 'Please enter your date of birth';
      validation.valid = false;
    } else {
      const age = getAge(formData.dateOfBirth);
      if (age === null || age > 120) {
        validation.errors.dateOfBirth = 'That date does not look right';
        validation.valid = false;
      } else if (age < 18) {
        validation.errors.dateOfBirth = 'You must be 18 or older to use Raccoon';
        validation.valid = false;
      }
    }
    if (!country) {
      validation.errors.country = 'Please select your country';
      validation.valid = false;
    }
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const browserLocale = getBrowserLocale();

      const response = await axios.post(`${API_URL}/auth/signup`, {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        gender: formData.gender.toLowerCase(),
        date_of_birth: formData.dateOfBirth,
        country: country.name,
        country_code: country.code,
        country_flag: getFlagEmoji(country.code),
        browser_locale: browserLocale,
        terms_accepted: agreedToTerms,
        privacy_accepted: agreedToTerms
      });

      const { token: newToken, user: newUser } = response.data;
      await uploadAvatarIfSelected(newToken, newUser);

      login(newToken, newUser);
      toast.success('Account created! Welcome to Raccoon!');
      navigate(getPostAuthRedirect(newUser));
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      
      if (errorMsg.toLowerCase().includes('email')) {
        setErrors({ email: errorMsg });
      } else if (errorMsg.toLowerCase().includes('username')) {
        setErrors({ username: errorMsg });
      } else if (errorMsg.toLowerCase().includes('password')) {
        setErrors({ password: errorMsg });
      } else if (errorMsg.toLowerCase().includes('gender')) {
        setErrors({ gender: errorMsg });
      } else {
        setErrors({ form: errorMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle social auth backend sync
  const syncSocialAuth = async (userData) => {
    try {
      const browserLocale = getBrowserLocale();

      const response = await axios.post(`${API_URL}/auth/social`, {
        ...userData,
        browser_locale: browserLocale
      });

      login(response.data.token, response.data.user);
      toast.success('Welcome to Raccoon!');
      navigate(getPostAuthRedirect(response.data.user));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Called by PhoneAuthSection once Firebase has verified the phone's OTP
  const handlePhoneVerified = async ({ idToken, uid, phoneNumber }) => {
    if (!agreedToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy first');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/social`, {
        uid,
        phoneNumber,
        provider: 'phone',
        idToken,
        browser_locale: getBrowserLocale()
      });

      const { token: newToken, user: newUser } = response.data;
      await uploadAvatarIfSelected(newToken, newUser);

      login(newToken, newUser);
      toast.success('Account created! Welcome to Raccoon!');
      navigate(getPostAuthRedirect(newUser));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Google signup handler - uses popup first, fallback to redirect
  const handleGoogleSignup = async () => {
    if (!firebaseReady) {
      toast.error('Firebase is initializing. Please try again.');
      return;
    }
    if (socialLoading) return;

    setSocialLoading('google');
    try {
      // Try popup first (more reliable)
      const firebaseUser = await signInWithGoogle();
      
      // If popup was used, we get user directly
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken(true);
        await syncSocialAuth({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          provider: 'google',
          idToken: idToken
        });
      }
      // If redirect was used, the page will reload and useEffect handles it
      
    } catch (error) {
      console.error('Google signup error:', error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized for Google Sign-In. Please add it to Firebase Console.');
      } else {
        toast.error('Google signup failed: ' + error.message);
      }
      setSocialLoading(null);
    }
  };

  // Anonymous signup handler - uses backend directly for reliability
  const handleAnonymousSignup = async () => {
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
      navigate(getPostAuthRedirect(response.data.user));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSocialLoading(null);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Create Account"
        subtitle="Join Raccoon and start meeting people"
      >
        <div className="space-y-5">
          {/* Form-level error */}
          {errors.form && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm" data-testid="signup-form-error">
              {errors.form}
            </div>
          )}

          {/* Profile Picture - optional, defaults to a generated avatar if skipped */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatarPreview} alt="" className="object-cover" />
                <AvatarFallback
                  className="text-xl font-bold text-white"
                  style={{ background: getAvatarGradient(formData.username || 'raccoon') }}
                >
                  {formData.username?.charAt(0).toUpperCase() || '🦝'}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 bg-[#7c3aed] hover:bg-[#8b4ff0] rounded-full flex items-center justify-center border-2 border-black/50 transition-all"
                data-testid="signup-avatar-btn"
                aria-label="Upload profile picture"
              >
                <Camera size={11} />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
                data-testid="signup-avatar-input"
              />
            </div>
            <span className="text-xs text-gray-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Profile picture (optional)
            </span>
          </div>

          {/* Sign-up method switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-black/30 border border-white/10 rounded-xl">
            {[
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' }
            ].map((method) => (
              <button
                key={method.key}
                type="button"
                onClick={() => setAuthMethod(method.key)}
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                  authMethod === method.key
                    ? 'bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                    : 'text-gray-400 hover:text-white'
                }`}
                style={{ fontFamily: 'Manrope, sans-serif' }}
                data-testid={`signup-method-${method.key}`}
              >
                {method.label}
              </button>
            ))}
          </div>

          {authMethod === 'email' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <AuthInput
                label="Username"
                icon={User}
                type="text"
                value={formData.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                placeholder="Choose a username"
                required
                autoComplete="username"
                testId="signup-username-input"
                error={errors.username}
              />
              <AuthInput
                label="Email"
                icon={Mail}
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                testId="signup-email-input"
                error={errors.email}
              />

              <div className="grid grid-cols-2 gap-3">
                <AuthInput
                  label="Password"
                  icon={Lock}
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  testId="signup-password-input"
                  error={errors.password}
                />
                <AuthInput
                  label="Confirm"
                  icon={Lock}
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  testId="signup-confirm-password-input"
                  error={errors.confirmPassword}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Date of Birth
                </label>
                <div className="relative">
                  <CalendarDays className={`absolute left-4 top-1/2 -translate-y-1/2 ${errors.dateOfBirth ? 'text-red-400' : 'text-gray-500'}`} size={18} />
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                    data-testid="signup-dob-input"
                    className={`w-full bg-black/40 rounded-xl h-12 pl-11 pr-4 text-white outline-none transition-all border ${
                      errors.dateOfBirth
                        ? 'border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20'
                        : 'border-white/10 focus:border-[#7c3aed]/60 focus:ring-2 focus:ring-[#7c3aed]/20'
                    }`}
                    style={{ fontFamily: 'Manrope, sans-serif', colorScheme: 'dark' }}
                  />
                </div>
                {errors.dateOfBirth && (
                  <p className="text-red-400 text-xs mt-2">{errors.dateOfBirth}</p>
                )}
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFieldChange('gender', opt.value)}
                      className={`py-3 px-2 rounded-xl text-xs font-medium transition-all ${
                        formData.gender === opt.value
                          ? 'bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                      }`}
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                      data-testid={`signup-gender-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {errors.gender && (
                  <p className="text-red-400 text-xs mt-2">{errors.gender}</p>
                )}
              </div>

              {/* Country - auto-detected, not manually editable */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Country
                </label>
                <div className="w-full bg-black/40 rounded-xl h-12 px-4 flex items-center gap-3 border border-white/10 text-gray-300" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <Flag code={country?.code} className="w-6 h-4" />
                  <span>{country?.name || 'Detecting...'}</span>
                </div>
                <p className="text-gray-500 text-xs mt-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Detected from your location
                </p>
                {errors.country && (
                  <p className="text-red-400 text-xs mt-2">{errors.country}</p>
                )}
              </div>

              <AuthButton
                loading={loading}
                disabled={loading || !!socialLoading}
                testId="signup-submit-button"
              >
                Create Account
                <ArrowRight size={18} />
              </AuthButton>
            </form>
          ) : (
            <PhoneAuthSection onVerified={handlePhoneVerified} disabled={loading || !!socialLoading} />
          )}

          {/* Terms Checkbox - shared by both sign-up methods */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (errors.terms) {
                    setErrors(prev => ({ ...prev, terms: '' }));
                  }
                }}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-[#7c3aed] focus:ring-[#7c3aed] focus:ring-offset-0"
                data-testid="signup-terms-checkbox"
              />
              <span className="text-xs text-gray-400 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                I agree to the{' '}
                <Link to="/terms" className="text-[#7c3aed] hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-[#7c3aed] hover:underline">Privacy Policy</Link>
                , and confirm I am 18 years or older.
              </span>
            </label>
            {errors.terms && (
              <p className="text-red-400 text-xs mt-2">{errors.terms}</p>
            )}
          </div>
        </div>

        {/* Social Signup Section - Google + Anonymous */}
        <SocialAuthSection
          onGoogleClick={handleGoogleSignup}
          onAnonymousClick={handleAnonymousSignup}
          loadingProvider={socialLoading}
          disabled={loading}
        />

        <AuthFooterLink
          text="Already have an account?"
          linkText="Sign In"
          linkTo="/login"
        />
      </AuthCard>
    </AuthLayout>
  );
};

export default Signup;
