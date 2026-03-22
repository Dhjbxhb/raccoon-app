import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Zap, Sparkles } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Guest = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [gender, setGender] = useState('male');
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = async () => {
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/guest`, { gender });
      login(response.data.token, response.data.user);
      toast.success(`Welcome ${response.data.user.username}!`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.15) saturate(0.6)'
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#050508] via-[#0a0510]/95 to-[#1a0a2e]/30" />
      </div>

      {/* Animated glow orbs */}
      <div 
        className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'pulse 5s ease-in-out infinite'
        }}
      />
      <div 
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(76,29,149,0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'pulse 5s ease-in-out infinite 1s'
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-2 text-gray-500 hover:text-white transition-all duration-300 group"
          data-testid="back-button"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Back</span>
        </button>

        {/* Card */}
        <div className="relative">
          {/* Card glow */}
          <div 
            className="absolute -inset-1 rounded-3xl opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(76,29,149,0.2) 100%)',
              filter: 'blur(20px)'
            }}
          />
          
          <div className="relative p-10 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl">
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-full">
                <Sparkles size={14} className="text-[#7c3aed]" />
                <span className="text-xs font-semibold text-[#a78bfa]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  QUICK START
                </span>
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-3 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Jump Right In
            </h2>
            <p className="text-gray-500 text-center mb-10 text-sm leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
              No signup required. Start matching instantly.<br />
              Session lasts until you close the tab.
            </p>

            {/* Gender Selection */}
            <div className="mb-8">
              <label className="block text-xs font-medium mb-4 text-gray-500 text-center tracking-wider" style={{ fontFamily: 'Manrope, sans-serif' }}>
                SELECT YOUR GENDER
              </label>
              <div className="grid grid-cols-2 gap-4">
                {['Male', 'Female'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g.toLowerCase())}
                    className={`relative py-4 rounded-xl font-semibold transition-all duration-300 ${
                      gender === g.toLowerCase()
                        ? 'bg-[#7c3aed] text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] scale-[1.02]'
                        : 'bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] border border-white/[0.06]'
                    }`}
                    data-testid={`guest-gender-${g.toLowerCase()}`}
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    {gender === g.toLowerCase() && (
                      <div 
                        className="absolute inset-0 rounded-xl opacity-50"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%)'
                        }}
                      />
                    )}
                    <span className="relative">{g}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="relative w-full py-4 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-bold text-base tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
              data-testid="guest-start-button"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {/* Button glow effect */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)'
                }}
              />
              <div 
                className="absolute -inset-1 rounded-xl opacity-50 group-hover:opacity-70 transition-opacity"
                style={{
                  background: 'radial-gradient(circle at center, rgba(124,58,237,0.6) 0%, transparent 70%)',
                  filter: 'blur(15px)'
                }}
              />
              
              <span className="relative flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    Start Matching
                    <Zap size={18} className="group-hover:rotate-12 transition-transform" />
                  </>
                )}
              </span>
            </button>

            {/* Info */}
            <p className="mt-8 text-center text-xs text-gray-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Guest mode has limited features.{' '}
              <button 
                onClick={() => navigate('/signup')}
                className="text-[#7c3aed] hover:text-[#a78bfa] transition-colors"
              >
                Create account
              </button>
              {' '}for full access.
            </p>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default Guest;
