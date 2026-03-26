import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ArrowLeft, Crown, Zap, Shield, X, Calendar, RefreshCw,
  CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import PricingCards from '@/components/premium/PricingCards';
import PremiumFeatureList from '@/components/premium/PremiumFeatureList';
import '@/styles/premium.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// FAQ Data
const FAQ_DATA = [
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel anytime from the Premium page. Your benefits will continue until the end of your billing period."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, debit cards, and PayPal through our secure Stripe payment processor."
  },
  {
    question: "Can I switch plans?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle."
  },
  {
    question: "Is there a free trial?",
    answer: "We offer a satisfaction guarantee. If you're not happy within the first 7 days, contact support for a full refund."
  },
  {
    question: "What happens when my subscription expires?",
    answer: "Your account will revert to the free tier. You can resubscribe anytime to regain premium access."
  }
];

const Premium = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  // State
  const [plans, setPlans] = useState([]);
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Fetch plans and premium status
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('raccoon_token');
      
      // Fetch plans (no auth required)
      const plansRes = await fetch(`${API_URL}/api/payments/plans`);
      const plansData = await plansRes.json();
      
      if (plansData.plans) {
        setPlans(plansData.plans);
        setStripeEnabled(plansData.stripe_enabled);
      }
      
      // Fetch premium status (requires auth)
      if (token) {
        const [statusRes, subRes] = await Promise.all([
          fetch(`${API_URL}/api/payments/premium-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/api/payments/subscription`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setPremiumStatus(statusData);
        }
        
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.has_subscription) {
            setCurrentSubscription(subData.subscription);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching premium data:', error);
      toast.error('Failed to load premium data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle plan selection
  const handleSelectPlan = async (plan) => {
    if (!user) {
      toast.info('Please sign in to subscribe');
      navigate('/login');
      return;
    }

    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('raccoon_token');
      
      if (stripeEnabled) {
        // Create Stripe checkout session
        const response = await fetch(`${API_URL}/api/payments/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            plan_id: plan.plan_id,
            success_url: `${window.location.origin}/premium?success=true`,
            cancel_url: `${window.location.origin}/premium?cancelled=true`
          })
        });

        const data = await response.json();
        
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else if (data.success === false) {
          toast.info(data.message || 'Please complete payment setup');
        }
      } else {
        // Development mode - create subscription directly
        const response = await fetch(`${API_URL}/api/payments/create-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            plan_id: plan.plan_id
          })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          toast.success('🎉 Premium activated!');
          await fetchData();
          if (refreshUser) refreshUser();
        } else {
          toast.error(data.detail || data.message || 'Failed to activate premium');
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Unable to process subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async (immediate = false) => {
    if (!currentSubscription) return;
    
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('raccoon_token');
      
      const response = await fetch(`${API_URL}/api/payments/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: 'User requested cancellation',
          immediate
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(data.message);
        setShowCancelModal(false);
        await fetchData();
        if (refreshUser) refreshUser();
      } else {
        toast.error(data.detail || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      toast.error('Unable to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reactivation
  const handleReactivate = async () => {
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('raccoon_token');
      
      const response = await fetch(`${API_URL}/api/payments/reactivate-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Subscription reactivated!');
        await fetchData();
      } else {
        toast.error(data.detail || 'Failed to reactivate');
      }
    } catch (error) {
      console.error('Reactivation error:', error);
      toast.error('Unable to reactivate subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  // Check URL params for success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('🎉 Payment successful! Welcome to Premium!');
      fetchData();
      window.history.replaceState({}, '', '/premium');
    } else if (params.get('cancelled') === 'true') {
      toast.info('Payment was cancelled');
      window.history.replaceState({}, '', '/premium');
    }
  }, [fetchData]);

  return (
    <div className="premium-page">
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
      <div className="relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#030305]/80 backdrop-blur-xl border-b border-white/5">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
              data-testid="back-button"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-yellow-400" />
              <span className="font-bold">Premium</span>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
              data-testid="close-button"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="premium-content">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={40} className="animate-spin text-[#7c3aed]" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="premium-header">
                <div className="premium-header-icon">
                  <Crown size={40} />
                </div>
                <h1 className="premium-title">
                  {premiumStatus?.is_premium ? 'Your Premium Status' : 'Upgrade to Premium'}
                </h1>
                <p className="premium-subtitle">
                  {premiumStatus?.is_premium 
                    ? 'Manage your subscription and premium benefits'
                    : 'Match faster, choose who you meet, unlock all features'}
                </p>
              </div>

              {/* Current Status Card */}
              {premiumStatus && (
                <div className={`premium-status-card ${premiumStatus.is_premium ? 'active' : ''}`} data-testid="premium-status-card">
                  <div className="status-info">
                    <div className={`status-icon ${premiumStatus.is_premium ? 'premium' : 'free'}`}>
                      {premiumStatus.is_premium ? <Crown size={24} /> : <Zap size={24} />}
                    </div>
                    <div className="status-text">
                      <h3>
                        {premiumStatus.is_premium 
                          ? `${premiumStatus.plan_name || 'Premium'} Member`
                          : 'Free Member'}
                      </h3>
                      <p>
                        {premiumStatus.is_premium 
                          ? premiumStatus.days_remaining !== null
                            ? `${premiumStatus.days_remaining} days remaining`
                            : 'Lifetime access'
                          : 'Upgrade for premium features'}
                      </p>
                    </div>
                  </div>
                  
                  {premiumStatus.is_premium && currentSubscription && (
                    <div className="status-actions">
                      {currentSubscription.cancelled_at ? (
                        <button 
                          onClick={handleReactivate}
                          disabled={actionLoading}
                          className="status-btn primary"
                          data-testid="reactivate-btn"
                        >
                          {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                          Reactivate
                        </button>
                      ) : (
                        <>
                          {premiumStatus.can_upgrade && (
                            <button 
                              onClick={() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })}
                              className="status-btn secondary"
                            >
                              Upgrade Plan
                            </button>
                          )}
                          <button 
                            onClick={() => setShowCancelModal(true)}
                            className="status-btn danger"
                            data-testid="cancel-btn"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Subscription Details */}
              {currentSubscription && (
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-8">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Subscription Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className={`font-medium ${
                        currentSubscription.status === 'active' ? 'text-green-400' : 
                        currentSubscription.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
                        {currentSubscription.cancelled_at && ' (Cancelling)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Started</p>
                      <p className="font-medium">{formatDate(currentSubscription.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">
                        {currentSubscription.cancelled_at ? 'Ends' : 'Renews'}
                      </p>
                      <p className="font-medium">{formatDate(currentSubscription.expiry_date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Auto-Renew</p>
                      <p className={`font-medium ${currentSubscription.auto_renew ? 'text-green-400' : 'text-gray-400'}`}>
                        {currentSubscription.auto_renew ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Cards */}
              {(!premiumStatus?.is_premium || premiumStatus.can_upgrade) && (
                <div id="pricing-section">
                  <h2 className="text-2xl font-bold text-center mb-8">
                    {premiumStatus?.is_premium ? 'Upgrade Your Plan' : 'Choose Your Plan'}
                  </h2>
                  <PricingCards 
                    plans={plans}
                    currentPlan={currentSubscription}
                    onSelectPlan={handleSelectPlan}
                    loading={actionLoading}
                    stripeEnabled={stripeEnabled}
                  />
                </div>
              )}

              {/* Features */}
              <PremiumFeatureList compact={premiumStatus?.is_premium} />

              {/* Guarantee */}
              <div className="premium-guarantee">
                <div className="guarantee-icon">
                  <Shield />
                </div>
                <h3 className="guarantee-title">7-Day Satisfaction Guarantee</h3>
                <p className="guarantee-text">
                  Not happy with Premium? Contact us within 7 days for a full refund. No questions asked.
                </p>
              </div>

              {/* FAQ */}
              <div className="premium-faq">
                <h3 className="faq-title">Frequently Asked Questions</h3>
                <div className="faq-list">
                  {FAQ_DATA.map((item, idx) => (
                    <div key={idx} className="faq-item">
                      <button
                        className="faq-question"
                        onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      >
                        {item.question}
                        {expandedFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {expandedFaq === idx && (
                        <div className="faq-answer">{item.answer}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stripe Note */}
              {!stripeEnabled && (
                <div className="mt-8 text-center text-sm text-gray-500">
                  <AlertCircle size={16} className="inline mr-2" />
                  Payment processing with Stripe is being configured. Subscriptions are in test mode.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCancelModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#0a0a15] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Cancel Subscription</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to cancel? Your premium benefits will continue until {formatDate(currentSubscription?.expiry_date)}.
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleCancelSubscription(false)}
                disabled={actionLoading}
                className="w-full py-3 bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Cancel at Period End
              </button>
              <button
                onClick={() => handleCancelSubscription(true)}
                disabled={actionLoading}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-all"
              >
                Cancel Immediately
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full py-3 text-gray-400 hover:text-white transition-all"
              >
                Keep Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Premium;
