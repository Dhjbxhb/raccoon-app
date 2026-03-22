import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Lock, ArrowLeft } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [authMethods, setAuthMethods] = useState(null);

  useEffect(() => {
    // Fetch available auth methods
    axios.get(`${API_URL}/auth/methods`)
      .then(res => setAuthMethods(res.data))
      .catch(err => console.error('Failed to fetch auth methods:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, formData);
      login(response.data.token, response.data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    toast.info(`${provider} login coming soon! Add credentials to activate.`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1635931225069-4968458f04f8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwzfHxjeWJlcnB1bmslMjBjaXR5JTIwbmlnaHQlMjBibHVycmVkJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3NzQxNzU5Mjd8MA&ixlib=rb-4.1.0&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(5px)'
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
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
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-full flex items-center justify-center text-2xl">
              🦝
            </div>
            <span className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>RACCOON</span>
          </div>

          <h2 className="text-2xl font-bold mb-2 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>Welcome Back</h2>
          <p className="text-gray-400 text-center mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>Login to continue matching</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/50 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-white/30 outline-none transition-all"
                  placeholder="your@email.com"
                  required
                  data-testid="login-email-input"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/50 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-white/30 outline-none transition-all"
                  placeholder="••••••••"
                  required
                  data-testid="login-password-input"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-bold tracking-wide shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-submit-button"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleSocialLogin('Google')}
              className="w-full py-3 bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-3 border border-white/10"
              data-testid="login-google-button"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => handleSocialLogin('Apple')}
              className="w-full py-3 bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-3 border border-white/10"
              data-testid="login-apple-button"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>

            <button
              onClick={() => handleSocialLogin('Phone')}
              className="w-full py-3 bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-3 border border-white/10"
              data-testid="login-phone-button"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Continue with Phone
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-400 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Guest Mode */}
          <button
            onClick={() => navigate('/guest')}
            className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all duration-300"
            data-testid="login-guest-button"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Continue as Guest
          </button>

          {/* Sign Up Link */}
          <p className="text-center mt-6 text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#7c3aed] hover:text-[#6d28d9] font-semibold transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
