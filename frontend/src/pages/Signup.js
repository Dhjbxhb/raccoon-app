import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, User, Calendar, ArrowLeft, Sparkles, Check } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Signup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    gender: 'male',
    date_of_birth: ''
  });
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }
    
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/signup`, formData);
      login(response.data.token, response.data.user);
      toast.success('Account created! Welcome to Raccoon!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = (provider) => {
    toast.info(`${provider} signup coming soon! Add credentials to activate.`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            data-testid="back-button"
          >
            <ArrowLeft size={20} />
            <span style={{ fontFamily: 'Manrope, sans-serif' }}>Back to Home</span>
          </button>

          {/* Card */}
          <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_30px_rgba(124,58,237,0.2)]">
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Join the Night</h2>
            <p className="text-gray-400 mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>Create your account (18+)</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/50 rounded-xl h-11 pl-11 pr-4 text-white placeholder:text-white/30 outline-none transition-all text-sm"
                    placeholder="your@email.com"
                    required
                    data-testid="signup-email-input"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/50 rounded-xl h-11 pl-11 pr-4 text-white placeholder:text-white/30 outline-none transition-all text-sm"
                    placeholder="cooluser123"
                    required
                    data-testid="signup-username-input"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/50 rounded-xl h-11 pl-11 pr-4 text-white placeholder:text-white/30 outline-none transition-all text-sm"
                    placeholder="••••••••"
                    required
                    data-testid="signup-password-input"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>Gender</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Male', 'Female'].map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: gender.toLowerCase() })}
                      className={`py-2.5 rounded-xl font-medium transition-all text-sm ${
                        formData.gender === gender.toLowerCase()
                          ? 'bg-[#7c3aed] text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                      data-testid={`signup-gender-${gender.toLowerCase()}`}
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>Date of Birth (18+)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/50 rounded-xl h-11 pl-11 pr-4 text-white outline-none transition-all text-sm"
                    required
                    data-testid="signup-dob-input"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  />
                </div>
              </div>

              {/* Country Auto-detect Notice */}
              <div className="p-3 bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-xl">
                <p className="text-xs text-[#7c3aed]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  🌍 Your country will be automatically detected
                </p>
              </div>

              {/* Terms & Privacy Checkbox */}
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    agreedToTerms 
                      ? 'bg-[#7c3aed] border-[#7c3aed]' 
                      : 'border-white/30 hover:border-[#7c3aed]/50'
                  }`}
                  data-testid="terms-checkbox"
                >
                  {agreedToTerms && <Check size={14} className="text-white" />}
                </button>
                <label className="text-sm text-gray-400 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  I am 18+ and agree to the{' '}
                  <Link to="/terms" className="text-[#7c3aed] hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-[#7c3aed] hover:underline">Privacy Policy</Link>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="w-full py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-bold tracking-wide shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="signup-submit-button"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-5">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>or sign up with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Social Signup - Clean Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => handleSocialSignup('Google')}
                className="py-2.5 bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 border border-white/10 text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>

              <button
                onClick={() => handleSocialSignup('Apple')}
                className="py-2.5 bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 border border-white/10 text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple
              </button>
            </div>

            <button
              onClick={() => handleSocialSignup('Phone')}
              className="w-full py-2.5 bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 border border-white/10 mb-4 text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Phone Number
            </button>

            <button
              onClick={() => navigate('/guest')}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all duration-300 text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Sign up as Guest
            </button>

            {/* Login Link */}
            <p className="text-center mt-5 text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Already have an account?{' '}
              <Link to="/login" className="text-[#7c3aed] hover:text-[#6d28d9] font-semibold transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Raccoon Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#1a0f2e] via-[#0a0a0a] to-[#0a0a0a]">
        {/* Purple Glow */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7c3aed]/30 blur-[150px] rounded-full" />
        
        {/* Content */}
        <div className="relative z-10 text-center px-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed]/20 border border-[#7c3aed]/50 rounded-full backdrop-blur-md mb-8">
            <Sparkles size={16} className="text-[#7c3aed]" />
            <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>RACCOON APP</span>
          </div>

          {/* Cool Raccoon */}
          <div className="mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_realtime-raccoon/artifacts/818jgnvw_Screenshot%202026-03-22%20at%202.50.16%E2%80%AFPM.png"
              alt="Cool Raccoon"
              className="w-80 h-auto mx-auto drop-shadow-2xl"
              style={{
                animation: 'float 3s ease-in-out infinite',
                clipPath: 'inset(0 20% 0 20%)'
              }}
            />
          </div>

          {/* Text */}
          <h2 
            className="text-4xl font-black mb-4"
            style={{ 
              fontFamily: 'Outfit, sans-serif',
              background: 'linear-gradient(135deg, #ffffff 0%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            The Nocturnal<br />Playground
          </h2>
          <p className="text-lg text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Join thousands matching right now
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
