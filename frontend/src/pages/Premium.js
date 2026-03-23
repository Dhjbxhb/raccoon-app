import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Crown, Check, Zap, Users, Globe, Sparkles, Star, Shield, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PLANS = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: 2.99,
    period: 'week',
    features: ['Gender filter', 'Country filter', 'Unlimited skips'],
    popular: false
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 7.99,
    period: 'month',
    originalPrice: 11.96,
    features: ['Gender filter', 'Country filter', 'Unlimited skips', 'Priority matching', 'All camera filters'],
    popular: true,
    tag: 'BEST VALUE'
  },
  {
    id: 'quarterly',
    name: '3 Months',
    price: 19.99,
    period: '3 months',
    originalPrice: 35.88,
    features: ['Gender filter', 'Country filter', 'Unlimited skips', 'Priority matching', 'All camera filters', 'All games'],
    popular: false,
    tag: 'SAVE 44%'
  }
];

const FEATURES = [
  { icon: Users, text: 'Choose gender preference', color: 'text-pink-400' },
  { icon: Globe, text: 'Choose country preference', color: 'text-blue-400' },
  { icon: Zap, text: 'Priority matching queue', color: 'text-yellow-400' },
  { icon: Sparkles, text: 'All camera filters', color: 'text-purple-400' },
  { icon: Star, text: 'Unlimited skips', color: 'text-orange-400' },
  { icon: Shield, text: 'Ad-free experience', color: 'text-green-400' }
];

const Premium = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planId) => {
    if (!user) {
      toast.info('Please sign in first');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('raccoon_token');
      const response = await fetch(`${API_URL}/api/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: planId })
      });

      const data = await response.json();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.message) {
        toast.info(data.message);
      } else {
        toast.error('Payment system is being configured');
      }
    } catch (error) {
      toast.error('Unable to process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = PLANS.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-[#030305] text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#030305] via-[#0a0515] to-[#030305]" />
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(ellipse, rgba(251,191,36,0.15) 0%, rgba(124,58,237,0.1) 50%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#030305]/80 backdrop-blur-xl border-b border-white/5">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-yellow-400" />
              <span className="font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Premium</span>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.4)]">
              <Crown size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Upgrade Your Experience
            </h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Match faster, choose who you meet, unlock all features
            </p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative p-6 rounded-3xl transition-all text-left ${
                  plan.popular
                    ? selectedPlan === plan.id
                      ? 'bg-gradient-to-br from-yellow-400/20 to-orange-500/10 border-2 border-yellow-400 shadow-[0_0_40px_rgba(251,191,36,0.3)] scale-105'
                      : 'bg-gradient-to-br from-yellow-400/10 to-orange-500/5 border-2 border-yellow-400/50 hover:border-yellow-400'
                    : selectedPlan === plan.id
                      ? 'bg-white/10 border-2 border-[#7c3aed] shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                      : 'bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                }`}
              >
                {plan.tag && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${
                    plan.popular ? 'bg-yellow-400 text-black' : 'bg-[#7c3aed] text-white'
                  }`}>
                    {plan.tag}
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-yellow-400' : ''}`}>
                      ${plan.price}
                    </span>
                    <span className="text-gray-500">/{plan.period}</span>
                  </div>
                  {plan.originalPrice && (
                    <p className="text-sm text-gray-500 line-through">
                      ${plan.originalPrice}/{plan.period}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {plan.features.slice(0, 3).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                      <Check size={14} className={plan.popular ? 'text-yellow-400' : 'text-[#7c3aed]'} />
                      {feature}
                    </div>
                  ))}
                  {plan.features.length > 3 && (
                    <p className="text-xs text-gray-500">+{plan.features.length - 3} more</p>
                  )}
                </div>

                {/* Selection indicator */}
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === plan.id
                    ? plan.popular ? 'border-yellow-400 bg-yellow-400' : 'border-[#7c3aed] bg-[#7c3aed]'
                    : 'border-white/30'
                }`}>
                  {selectedPlan === plan.id && <Check size={14} className="text-black" />}
                </div>
              </button>
            ))}
          </div>

          {/* Features List */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-8">
            <h3 className="text-xl font-bold mb-6 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Everything You Get
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-white/5 ${feature.color}`}>
                    <feature.icon size={20} />
                  </div>
                  <span className="text-sm text-gray-300" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => handleSubscribe(selectedPlan)}
            disabled={loading}
            className={`w-full py-5 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3 ${
              PLANS.find(p => p.id === selectedPlan)?.popular
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:shadow-[0_0_40px_rgba(251,191,36,0.5)]'
                : 'bg-gradient-to-r from-[#7c3aed] to-[#9333ea] text-white hover:shadow-[0_0_40px_rgba(124,58,237,0.5)]'
            } hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70`}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap size={24} />
                Get {currentPlan?.name} - ${currentPlan?.price}
              </>
            )}
          </button>

          {/* Trust badges */}
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield size={16} />
              <span>Secure payment</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;
