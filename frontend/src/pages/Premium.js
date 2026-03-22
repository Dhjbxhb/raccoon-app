import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Gamepad2, Sparkles, Target, MessageCircle } from 'lucide-react';

const Premium = () => {
  const navigate = useNavigate();

  const plans = [
    { duration: 'Weekly', price: 4, period: 'week', popular: false },
    { duration: 'Monthly', price: 12, period: 'month', popular: true },
    { duration: '3 Months', price: 28, period: '3 months', popular: false }
  ];

  const featureCategories = [
    {
      icon: Gamepad2,
      title: 'Games',
      color: '#7c3aed',
      features: [
        'Play any game anytime',
        'Choose which game you want to play',
        'Raccoon Feud, Truth or Dare & more'
      ]
    },
    {
      icon: Sparkles,
      title: 'Filters',
      color: '#f43f5e',
      features: [
        'Funny filters (big head, raccoon mask)',
        'Beauty filters',
        'Switch filters anytime during chat'
      ]
    },
    {
      icon: Target,
      title: 'Matching Control',
      color: '#10b981',
      features: [
        'Choose gender filter',
        'Choose country filter',
        'More control over who you match with'
      ]
    },
    {
      icon: MessageCircle,
      title: 'Chat Control',
      color: '#3b82f6',
      features: [
        'Choose chat preferences',
        'Better matching experience',
        'Priority in the queue'
      ]
    }
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
        <div className="px-6 py-6 border-b border-white/5 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
              data-testid="back-button"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Premium</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed]/20 border border-[#7c3aed]/50 rounded-full backdrop-blur-md mb-6">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>PREMIUM</span>
              </div>
              <h2 
                className="text-4xl sm:text-5xl font-black mb-4"
                style={{ 
                  fontFamily: 'Outfit, sans-serif',
                  background: 'linear-gradient(135deg, #ffffff 0%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Unlock Everything
              </h2>
              <p className="text-lg text-gray-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Get full access to games, filters & matching controls
              </p>
            </div>

            {/* Feature Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
              {featureCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <div 
                    key={index} 
                    className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <Icon size={20} style={{ color: category.color }} />
                      </div>
                      <h3 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {category.title}
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {category.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-3">
                          <div 
                            className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-gray-300" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
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
                      BEST VALUE
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
                    data-testid={`premium-${plan.duration.toLowerCase().replace(' ', '-')}-btn`}
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
                Payment integration coming soon. This is a preview.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;
