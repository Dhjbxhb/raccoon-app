import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Zap } from 'lucide-react';

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
        <div className="p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_30px_rgba(124,58,237,0.2)]">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-full flex items-center justify-center text-2xl">
              🦝
            </div>
            <span className="text-3xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>RACCOON</span>
          </div>

          <h2 className="text-3xl font-bold mb-3 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>Try as Guest</h2>
          <p className="text-gray-400 text-center mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Jump right in. No signup needed.<br />Your session lasts until you close the tab.
          </p>

          {/* Gender Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium mb-3 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>Select your gender</label>
            <div className="grid grid-cols-2 gap-3">
              {['Male', 'Female'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g.toLowerCase())}
                  className={`py-4 rounded-xl font-semibold transition-all ${
                    gender === g.toLowerCase()
                      ? 'bg-[#7c3aed] text-white shadow-[0_0_20px_rgba(124,58,237,0.5)] scale-105'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                  data-testid={`guest-gender-${g.toLowerCase()}`}
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full py-4 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-bold text-lg tracking-wide shadow-[0_0_25px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_rgba(124,58,237,0.7)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            data-testid="guest-start-button"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {loading ? 'Starting...' : (
              <>
                Start Matching Now
                <Zap size={20} />
              </>
            )}
          </button>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-sm text-yellow-200" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <strong>Guest Limitations:</strong> Progress is not saved. Premium features unavailable. Session ends when you close the tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guest;
