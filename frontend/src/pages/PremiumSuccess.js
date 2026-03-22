import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Check, Star, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PremiumSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('checking'); // checking, success, error
  const [attempts, setAttempts] = useState(0);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const pollPaymentStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/payments/status/${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Failed to check payment status');
        }

        const data = await response.json();
        
        if (data.payment_status === 'paid') {
          setStatus('success');
          // Refresh user data to get updated premium status
          await refreshUser();
          toast.success('Payment successful! Welcome to Premium!');
        } else if (data.status === 'expired') {
          setStatus('error');
          toast.error('Payment session expired');
        } else if (attempts < 10) {
          // Continue polling
          setAttempts(prev => prev + 1);
          setTimeout(pollPaymentStatus, 2000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        if (attempts < 5) {
          setAttempts(prev => prev + 1);
          setTimeout(pollPaymentStatus, 2000);
        } else {
          setStatus('error');
        }
      }
    };

    pollPaymentStatus();
  }, [sessionId, attempts, refreshUser]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Loader2 size={64} className="text-[#7c3aed] animate-spin mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Processing Payment...
          </h1>
          <p className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Please wait while we confirm your payment.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={48} className="text-red-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Something Went Wrong
          </h1>
          <p className="text-gray-400 mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
            We couldn't confirm your payment. Please contact support if you were charged.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/premium')}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
      <div className="text-center">
        <div className="relative mb-8">
          <div className="w-32 h-32 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Star size={64} className="text-yellow-400 fill-yellow-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center border-4 border-[#0a0a0a]">
            <Check size={24} className="text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Welcome to Premium!
        </h1>
        <p className="text-xl text-gray-400 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Payment successful 🎉
        </p>
        <p className="text-gray-500 mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
          You now have access to all premium features.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full max-w-xs mx-auto px-8 py-4 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-bold text-lg shadow-[0_0_30px_rgba(124,58,237,0.4)] transition-all hover:scale-105"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Start Exploring
          </button>
          <button
            onClick={() => navigate('/match')}
            className="w-full max-w-xs mx-auto px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all block"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Find a Match
          </button>
        </div>
      </div>
    </div>
  );
};

export default PremiumSuccess;
