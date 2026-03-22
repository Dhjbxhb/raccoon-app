import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, User, Calendar, ArrowLeft, Sparkles } from 'lucide-react';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
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

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-bold tracking-wide shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                data-testid="signup-submit-button"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Login Link */}
            <p className="text-center mt-6 text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
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
