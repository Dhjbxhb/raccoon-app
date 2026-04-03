import React, { useState } from 'react';
import { Check, Crown, Sparkles, Star, Zap, Clock, Calendar, Infinity, Flame } from 'lucide-react';

const PricingCards = ({ 
  plans, 
  currentPlan,
  onSelectPlan, 
  loading,
  stripeEnabled 
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [processingPlanId, setProcessingPlanId] = useState(null);

  const getPlanIcon = (planType) => {
    const icons = {
      weekly: Clock,
      monthly: Calendar,
      quarterly: Star,
      yearly: Sparkles,
      lifetime: Infinity
    };
    return icons[planType] || Crown;
  };

  // Format price based on plan type - KEEP EXACT PRICES
  const formatPrice = (price, planType) => {
    if (planType === 'lifetime') {
      return { main: `$${price}`, sub: '' };
    }
    if (planType === 'yearly') {
      // $39.99/year = $3.33/month
      return { main: `$${(price / 12).toFixed(2)}`, sub: '/month' };
    }
    if (planType === 'quarterly') {
      // $19.99/3mo = $6.66/month
      return { main: `$${(price / 3).toFixed(2)}`, sub: '/month' };
    }
    if (planType === 'monthly') {
      return { main: `$${price}`, sub: '/month' };
    }
    // Weekly
    return { main: `$${price}`, sub: '/week' };
  };

  // Get billing clarity text for each plan
  const getBillingInfo = (plan) => {
    switch (plan.plan_type) {
      case 'weekly':
        return {
          billedText: 'Billed weekly',
          subText: 'Flexible short-term access',
          highlight: null
        };
      case 'monthly':
        return {
          billedText: 'Billed monthly',
          subText: 'Cancel anytime',
          highlight: null
        };
      case 'quarterly':
        return {
          billedText: 'Billed every 3 months ($19.99)',
          subText: 'Save 33%',
          highlight: 'savings'
        };
      case 'yearly':
        return {
          billedText: 'Billed yearly ($39.99)',
          subText: 'Best value',
          highlight: 'best'
        };
      case 'lifetime':
        return {
          billedText: 'One-time payment',
          subText: 'Pay once, keep forever',
          highlight: 'lifetime'
        };
      default:
        return { billedText: '', subText: '', highlight: null };
    }
  };

  // Define visual hierarchy - Annual is strongest
  const getPlanPriority = (planType) => {
    const priorities = {
      yearly: 1,      // BEST VALUE - strongest visual
      quarterly: 2,   // Second strongest
      monthly: 3,     // Neutral
      weekly: 4,      // Lowest priority
      lifetime: 5     // Premium gold style
    };
    return priorities[planType] || 3;
  };

  const handleSelect = async (plan) => {
    if (processingPlanId) return;
    
    setSelectedPlanId(plan.plan_id);
    setProcessingPlanId(plan.plan_id);
    
    try {
      await onSelectPlan(plan);
    } finally {
      setProcessingPlanId(null);
    }
  };

  const isCurrentPlan = (planId) => {
    return currentPlan && currentPlan.plan_id === planId;
  };

  // Sort plans by priority for display
  const sortedPlans = [...plans].sort((a, b) => {
    return getPlanPriority(a.plan_type) - getPlanPriority(b.plan_type);
  });

  return (
    <div className="pricing-cards-container" data-testid="pricing-cards">
      <div className="pricing-cards-grid">
        {sortedPlans.map((plan) => {
          const Icon = getPlanIcon(plan.plan_type);
          const { main: priceMain, sub: priceSub } = formatPrice(plan.price, plan.plan_type);
          const billingInfo = getBillingInfo(plan);
          const isSelected = selectedPlanId === plan.plan_id;
          const isProcessing = processingPlanId === plan.plan_id;
          const isCurrent = isCurrentPlan(plan.plan_id);
          const isYearly = plan.plan_type === 'yearly';
          const isQuarterly = plan.plan_type === 'quarterly';
          const isLifetime = plan.plan_type === 'lifetime';

          return (
            <div
              key={plan.plan_id}
              className={`pricing-card 
                ${isSelected ? 'selected' : ''} 
                ${isYearly ? 'best-value highlighted' : ''} 
                ${isQuarterly ? 'popular' : ''} 
                ${isLifetime ? 'lifetime-gold' : ''} 
                ${isCurrent ? 'current' : ''}`}
              data-testid={`pricing-card-${plan.plan_id}`}
            >
              {/* Best Value Badge for Annual */}
              {isYearly && (
                <div className="pricing-badge best-value">
                  <Flame size={12} className="inline mr-1" />
                  BEST VALUE
                </div>
              )}

              {/* Popular Badge for Quarterly */}
              {isQuarterly && !isYearly && (
                <div className="pricing-badge popular">
                  POPULAR
                </div>
              )}

              {/* Limited Offer Badge for Lifetime */}
              {isLifetime && (
                <div className="pricing-badge lifetime">
                  LIMITED OFFER
                </div>
              )}

              {/* Current Plan Indicator */}
              {isCurrent && (
                <div className="current-plan-badge">
                  <Check size={12} />
                  Current Plan
                </div>
              )}

              {/* Plan Header */}
              <div className="pricing-card-header">
                <div className={`pricing-icon ${plan.plan_type}`}>
                  <Icon size={24} />
                </div>
                <h3 className="pricing-plan-name">{plan.display_name}</h3>
                <p className="pricing-plan-description">{plan.description}</p>
              </div>

              {/* Price Display */}
              <div className="pricing-price">
                <span className="price-main">{priceMain}</span>
                <span className="price-sub">{priceSub}</span>
              </div>

              {/* Billing Clarity Section - CRITICAL */}
              <div className="billing-clarity">
                <p className="billing-text">{billingInfo.billedText}</p>
                {billingInfo.subText && (
                  <p className={`billing-highlight ${billingInfo.highlight || ''}`}>
                    {billingInfo.highlight === 'best' && <Flame size={14} className="inline mr-1" />}
                    {billingInfo.subText}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="pricing-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="pricing-feature">
                    <Check size={16} className="feature-check" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelect(plan)}
                disabled={isProcessing || loading || isCurrent}
                className={`pricing-cta 
                  ${isYearly ? 'best-value' : ''} 
                  ${isQuarterly ? 'popular' : ''} 
                  ${isLifetime ? 'lifetime' : ''} 
                  ${isCurrent ? 'current' : ''}`}
                data-testid={`select-plan-${plan.plan_id}`}
              >
                {isProcessing ? (
                  <>
                    <span className="cta-spinner" />
                    Processing...
                  </>
                ) : isCurrent ? (
                  'Current Plan'
                ) : (
                  <>
                    <Zap size={16} />
                    {stripeEnabled ? 'Subscribe Now' : 'Upgrade Now'}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingCards;
