import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, User, Mail, Globe, Calendar, Star, Shield,
  Settings, LogOut, Crown, Camera, Pencil, Check, X, Loader2
} from 'lucide-react';
import SpaceBackground from '@/components/background/SpaceBackground';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/utils/avatarColor';
import { readJsonSafe } from '@/utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'any', label: 'Prefer not to say' },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, isGuest, token, refreshUser, updateUser, loading: authLoading } = useAuth();
  const [fullUserData, setFullUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingGender, setEditingGender] = useState(false);
  const [genderDraft, setGenderDraft] = useState('any');
  const [savingGender, setSavingGender] = useState(false);
  const heartbeatRef = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch full user data including premium status
    const fetchFullData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/stats/full`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setFullUserData(data);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFullData();

    // Start heartbeat for time tracking
    const sendHeartbeat = async () => {
      try {
        await fetch(`${API_URL}/api/stats/heartbeat`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    };

    heartbeatRef.current = setInterval(sendHeartbeat, 30000);
    sendHeartbeat();

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [user, navigate, token, authLoading]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Premium status from API or user context
  const premium = fullUserData?.premium || {
    is_premium: user?.is_premium === true,
    plan_name: null,
    expiry_date: null,
    days_remaining: null,
    time_remaining_formatted: null,
    is_lifetime: false,
    is_expired: false
  };

  const displayUser = fullUserData || user;
  const avatarSrc = displayUser?.avatar_url || displayUser?.photo_url || undefined;
  const avatarSeed = displayUser?.user_id || displayUser?.username || 'raccoon';

  const applyUserPatch = (patch) => {
    setFullUserData((prev) => (prev ? { ...prev, ...patch } : prev));
    updateUser(patch);
  };

  const handleAvatarButtonClick = () => {
    if (uploadingAvatar) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, or WEBP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(data?.detail || 'Could not upload the picture right now. Please try again.');
      }

      applyUserPatch({ avatar_url: data?.avatar_url });
      toast.success('Profile picture updated!');
    } catch (error) {
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleGenderEditStart = () => {
    setGenderDraft(displayUser?.gender || 'any');
    setEditingGender(true);
  };

  const handleGenderCancel = () => {
    setEditingGender(false);
  };

  const handleGenderSave = async () => {
    setSavingGender(true);
    try {
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gender: genderDraft })
      });

      const data = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(data?.detail || 'Could not save that right now. Please try again.');
      }

      applyUserPatch({ gender: genderDraft });
      setEditingGender(false);
      toast.success('Gender updated!');
    } catch (error) {
      toast.error(error.message || 'Failed to update gender');
    } finally {
      setSavingGender(false);
    }
  };

  return (
    <div className="min-h-screen text-white relative">
      {/* Cinematic space background */}
      <SpaceBackground intensity="minimal" showNebula={true} showRedGlow={true} showShootingStars={false} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 backdrop-blur-md bg-black/50">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-white/10 rounded-full transition-all"
                data-testid="back-to-dashboard-btn"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Profile</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl transition-all"
              data-testid="logout-btn"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12 max-w-4xl">
          {/* Profile Header */}
          <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={avatarSrc} alt={displayUser.username} className="object-cover" />
                  <AvatarFallback
                    className="text-5xl font-bold text-white"
                    style={{ background: getAvatarGradient(avatarSeed) }}
                  >
                    {displayUser.username?.charAt(0).toUpperCase() || '🦝'}
                  </AvatarFallback>
                </Avatar>
                {premium.is_premium && (
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Star size={20} className="text-white fill-white" />
                  </div>
                )}
                {!isGuest() && (
                  <>
                    <button
                      onClick={handleAvatarButtonClick}
                      disabled={uploadingAvatar}
                      className="absolute bottom-0 left-0 w-9 h-9 bg-[#7c3aed] hover:bg-[#8b4ff0] rounded-full flex items-center justify-center border-2 border-black/50 transition-all disabled:opacity-60"
                      data-testid="edit-avatar-btn"
                      aria-label="Change profile picture"
                    >
                      {uploadingAvatar ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Camera size={16} />
                      )}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                      data-testid="avatar-file-input"
                    />
                  </>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {displayUser.username}
                  </h2>
                  {isGuest() && (
                    <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">Guest</span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-400 mb-4">
                  {displayUser.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={16} />
                      <span>{displayUser.email}</span>
                    </div>
                  )}
                  {displayUser.country && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{displayUser.country_flag || '🌐'}</span>
                      <span>{displayUser.country}</span>
                    </div>
                  )}
                </div>

                {!premium.is_premium && !isGuest() && (
                  <button
                    onClick={() => navigate('/premium')}
                    className="px-6 py-2 bg-gradient-to-r from-[#7c3aed] to-[#4c1d95] rounded-full hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all"
                    data-testid="upgrade-premium-btn"
                  >
                    <span className="flex items-center gap-2">
                      <Star size={16} />
                      Upgrade to Premium
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Premium Subscription Status - MAIN FOCUS */}
          <div 
            className={`p-6 backdrop-blur-xl border rounded-2xl mb-8 ${
              premium.is_premium 
                ? 'bg-gradient-to-r from-[#7c3aed]/20 to-[#4c1d95]/20 border-[#7c3aed]/40' 
                : 'bg-white/5 border-white/10'
            }`} 
            data-testid="premium-status-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  premium.is_premium 
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
                    : 'bg-white/10'
                }`}>
                  {premium.is_premium ? (
                    <Crown size={28} className="text-white" />
                  ) : (
                    <User size={28} className="text-gray-400" />
                  )}
                </div>
                <div>
                  {premium.is_premium ? (
                    <>
                      <h3 className="text-xl font-bold text-yellow-400" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {premium.plan_name || 'Premium Member'}
                      </h3>
                      {premium.is_lifetime ? (
                        <p className="text-gray-300">Lifetime access - Never expires!</p>
                      ) : premium.is_expired ? (
                        <p className="text-red-400">Subscription expired</p>
                      ) : (
                        <p className="text-gray-300">
                          {premium.time_remaining_formatted || 'Active'}
                          {premium.expiry_date && (
                            <span className="text-gray-500 ml-2">
                              (expires {premium.expiry_date})
                            </span>
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-gray-300" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Free Plan
                      </h3>
                      <p className="text-gray-500">Upgrade to unlock all features</p>
                    </>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              {!premium.is_premium && (
                <button
                  onClick={() => navigate('/premium')}
                  className="px-6 py-3 bg-gradient-to-r from-[#7c3aed] to-[#4c1d95] rounded-full text-sm font-bold hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all"
                  data-testid="upgrade-btn"
                >
                  Upgrade Now
                </button>
              )}
              
              {premium.is_premium && premium.days_remaining !== null && premium.days_remaining <= 7 && !premium.is_lifetime && !premium.is_expired && (
                <span className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-full text-sm font-bold animate-pulse">
                  Renew Soon
                </span>
              )}
              
              {premium.is_premium && !premium.is_expired && !premium.is_lifetime && premium.days_remaining > 7 && (
                <Star size={24} className="text-yellow-400 fill-yellow-400" />
              )}
            </div>
            
            {premium.is_premium && premium.auto_renew && !premium.is_lifetime && (
              <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                <Shield size={14} />
                Auto-renewal enabled
              </p>
            )}
          </div>

          {/* Account Details */}
          <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl" data-testid="account-details">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Settings size={20} className="text-[#7c3aed]" />
              Account Details
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Username</span>
                <span className="font-semibold">{displayUser.username}</span>
              </div>
              
              {displayUser.email && (
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-gray-400">Email</span>
                  <span className="font-semibold">{displayUser.email}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between py-3 border-b border-white/5" data-testid="gender-row">
                <span className="text-gray-400">Gender</span>
                {editingGender ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={genderDraft}
                      onChange={(e) => setGenderDraft(e.target.value)}
                      disabled={savingGender}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-[#7c3aed]"
                      data-testid="gender-select"
                    >
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#1a1a2e]">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleGenderSave}
                      disabled={savingGender}
                      className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-all disabled:opacity-60"
                      data-testid="save-gender-btn"
                      aria-label="Save gender"
                    >
                      {savingGender ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button
                      onClick={handleGenderCancel}
                      disabled={savingGender}
                      className="p-1.5 bg-white/10 text-gray-300 hover:bg-white/20 rounded-lg transition-all disabled:opacity-60"
                      aria-label="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {GENDER_OPTIONS.find((opt) => opt.value === displayUser.gender)?.label || 'Not set'}
                    </span>
                    {!isGuest() && (
                      <button
                        onClick={handleGenderEditStart}
                        className="p-1 text-gray-500 hover:text-[#a855f7] transition-all"
                        data-testid="edit-gender-btn"
                        aria-label="Edit gender"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Country</span>
                <span className="font-semibold">{displayUser.country || 'Not detected'}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-gray-400">Account Type</span>
                <span className={`font-semibold flex items-center gap-2 ${premium.is_premium ? 'text-yellow-400' : ''}`}>
                  {premium.is_premium ? (
                    <>
                      <Star size={16} className="fill-yellow-400" />
                      {premium.plan_name || 'Premium'}
                    </>
                  ) : isGuest() ? 'Guest' : 'Free'}
                </span>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <span className="text-gray-400">Member Since</span>
                <span className="font-semibold">{formatDate(displayUser.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
