import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Check, Zap } from 'lucide-react';

const Premium = () => {
  const navigate = useNavigate();

  const plans = [
    { duration: 'Weekly', price: 4, period: 'week', popular: false },
    { duration: 'Monthly', price: 12, period: 'month', popular: true },
    { duration: '3 Months', price: 28, period: '3 months', popular: false }
  ];

  const benefits = [
    'Verified badge ⭐ next to your username',
    'Stand out in matches',
    'Priority matching',
    'Exclusive profile customization',
    'Ad-free experience',
    'Early access to new features'
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Background */}
      <div 
        className="fixed inset-0 z-0 opacity-15"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1575195372639-373ecc8590f9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNDR8MHwxfHNlYXJjaHwxfHxuaWdodCUyMGNpdHklMjBza3lsaW5lJTIwcHVycGxlJTIwbmVvbiUyMGxpZ2h0cyUyMG1vZGVybiUyMGJ1aWxkaW5nc3xlbnwwfHx8cHVycGxlfDE3NzQxODYwOTV8MA&ixlib=rb-4.1.0&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(4px)'
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
              data-testid="back-button"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Premium Features</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed]/20 border border-[#7c3aed]/50 rounded-full backdrop-blur-md mb-6">
                <Star size={16} className="text-[#7c3aed] fill-[#7c3aed]" />
                <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>PREMIUM</span>
              </div>
              <h2 
                className="text-5xl font-black mb-4"
                style={{ 
                  fontFamily: 'Outfit, sans-serif',
                  background: 'linear-gradient(135deg, #ffffff 0%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Stand Out. Get Noticed.
              </h2>
              <p className="text-xl text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>Upgrade to premium and show everyone you're serious</p>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                  <Check size={20} className="text-[#7c3aed] flex-shrink-0" />
                  <span style={{ fontFamily: 'Manrope, sans-serif' }}>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div 
                  key={plan.duration}
                  className={`p-8 rounded-2xl transition-all duration-300 hover:transform hover:scale-105 ${
                    plan.popular 
                      ? 'bg-[#7c3aed]/20 border-2 border-[#7c3aed] shadow-[0_0_40px_rgba(124,58,237,0.3)]' 
                      : 'bg-white/5 border border-white/10'
                  } backdrop-blur-xl relative`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-[#7c3aed] rounded-full text-sm font-bold">
                      MOST POPULAR
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>{plan.duration}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-black" style={{ fontFamily: 'Outfit, sans-serif' }}>${plan.price}</span>
                      <span className="text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>/{plan.period}</span>
                    </div>
                  </div>
                  <button
                    className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
                      plan.popular
                        ? 'bg-[#7c3aed] hover:bg-[#6d28d9] shadow-[0_0_20px_rgba(124,58,237,0.4)]'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    Get Premium
                  </button>
                </div>
              ))}
            </div>

            {/* Note */}
            <div className="mt-12 text-center">
              <p className="text-gray-500 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Premium features coming soon. This is a preview of our pricing plans.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;
