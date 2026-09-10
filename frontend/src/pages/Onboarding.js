import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { User, ArrowRight, Camera, CalendarDays } from 'lucide-react';
import { AuthLayout, AuthCard, AuthInput, AuthButton } from '@/components/auth/AuthComponents';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Flag from '@/components/ui/Flag';
import { getAvatarGradient } from '@/utils/avatarColor';
import { getErrorMessage, getAge } from '@/utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'any', label: 'Prefer not to say' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, token, login, loading: authLoading } = useAuth();

  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const avatarInputRef = useRef(null);

  // Already onboarded, or not logged in - bounce away
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
    } else if (user.profile_completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
  }, [avatarPreview]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors = {};
    if (!dob) {
      nextErrors.dob = 'Please enter your date of birth';
    } else {
      const age = getAge(dob);
      if (age === null) nextErrors.dob = 'That date does not look right';
      else if (age < 18) nextErrors.dob = 'You must be 18 or older to use Raccoon';
      else if (age > 120) nextErrors.dob = 'That date does not look right';
    }
    if (!gender) nextErrors.gender = 'Please select an option';

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const { data: freshUser } = await axios.post(
        `${API_URL}/profile/onboarding`,
        {
          date_of_birth: dob,
          gender,
          display_name: displayName.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (avatarFile) {
        try {
          const formData = new FormData();
          formData.append('file', avatarFile);
          const { data: avatarData } = await axios.post(`${API_URL}/profile/avatar`, formData, {
            headers: { Authorization: `Bearer ${token}` },
          });
          freshUser.avatar_url = avatarData.avatar_url;
        } catch {
          toast.error('Saved, but the profile picture upload failed - you can add it later from Profile.');
        }
      }

      login(token, freshUser);
      toast.success('All set! Welcome to Raccoon.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const msg = getErrorMessage(error);
      if (msg.toLowerCase().includes('name')) setErrors({ displayName: msg });
      else if (msg.toLowerCase().includes('18') || msg.toLowerCase().includes('birth')) setErrors({ dob: msg });
      else toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || user.profile_completed) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const seedName = displayName || user.username || 'raccoon';

  return (
    <AuthLayout>
      <AuthCard
        title="Complete Your Profile"
        subtitle="A few quick details before you start"
        showBackButton={false}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Profile Picture - optional */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatarPreview} alt="" className="object-cover" />
                <AvatarFallback
                  className="text-xl font-bold text-white"
                  style={{ background: getAvatarGradient(seedName) }}
                >
                  {seedName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 bg-[#7c3aed] hover:bg-[#8b4ff0] rounded-full flex items-center justify-center border-2 border-black/50 transition-all"
                data-testid="onboarding-avatar-btn"
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
                data-testid="onboarding-avatar-input"
              />
            </div>
            <span className="text-xs text-gray-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Profile picture (optional)
            </span>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Date of Birth
            </label>
            <div className="relative">
              <CalendarDays className={`absolute left-4 top-1/2 -translate-y-1/2 ${errors.dob ? 'text-red-400' : 'text-gray-500'}`} size={18} />
              <input
                type="date"
                value={dob}
                max={today}
                onChange={(e) => { setDob(e.target.value); if (errors.dob) setErrors((p) => ({ ...p, dob: '' })); }}
                data-testid="onboarding-dob-input"
                className={`w-full bg-black/40 rounded-xl h-12 pl-11 pr-4 text-white outline-none transition-all border ${
                  errors.dob
                    ? 'border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20'
                    : 'border-white/10 focus:border-[#7c3aed]/60 focus:ring-2 focus:ring-[#7c3aed]/20'
                }`}
                style={{ fontFamily: 'Manrope, sans-serif', colorScheme: 'dark' }}
              />
            </div>
            {errors.dob && <p className="text-red-400 text-xs mt-1.5">{errors.dob}</p>}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Gender
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setGender(opt.value); if (errors.gender) setErrors((p) => ({ ...p, gender: '' })); }}
                  className={`py-3 px-2 rounded-xl text-xs font-medium transition-all ${
                    gender === opt.value
                      ? 'bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                  }`}
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                  data-testid={`onboarding-gender-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.gender && <p className="text-red-400 text-xs mt-1.5">{errors.gender}</p>}
          </div>

          {/* Country - detected, read-only */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Country
            </label>
            <div className="w-full bg-black/40 rounded-xl h-12 px-4 flex items-center gap-3 border border-white/10 text-gray-300" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Flag code={user.country_code} className="w-6 h-4" />
              <span>{user.country || 'Detecting...'}</span>
            </div>
            <p className="text-gray-500 text-xs mt-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Detected from your location
            </p>
          </div>

          {/* Display Name - optional */}
          <AuthInput
            label="Display Name (optional)"
            icon={User}
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); if (errors.displayName) setErrors((p) => ({ ...p, displayName: '' })); }}
            placeholder={user.username || 'Choose a display name'}
            autoComplete="off"
            testId="onboarding-name-input"
            error={errors.displayName}
          />

          <AuthButton loading={submitting} disabled={submitting} testId="onboarding-submit-button">
            Continue
            <ArrowRight size={18} />
          </AuthButton>
        </form>
      </AuthCard>
    </AuthLayout>
  );
};

export default Onboarding;
