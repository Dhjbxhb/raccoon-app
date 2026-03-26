import React, { useState } from 'react';
import { Check, Crown, Sparkles, Star, Zap, Clock, Calendar, Infinity } from 'lucide-react';

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

  const formatPrice = (price, planType) => {
    if (planType === 'lifetime') {
      return { main: `$${price}`, sub: 'one-time' };
    }
    if (planType === 'yearly') {
      return { main: `$${(price / 12).toFixed(2)}`, sub: '/month' };
    }
    if (planType === 'quarterly') {
      return { main: `$${(price / 3).toFixed(2)}`, sub: '/month' };
    }
    if (planType === 'monthly') {
      return { main: `$${price}`, sub: '/month' };
    }
    return { main: `$${price}`, sub: '/week' };
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

  return (
    <div className="pricing-cards-container" data-testid="pricing-cards">
      <div className="pricing-cards-grid">
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan.plan_type);
          const { main: priceMain, sub: priceSub } = formatPrice(plan.price, plan.plan_type);
          const isSelected = selectedPlanId === plan.plan_id;
          const isProcessing = processingPlanId === plan.plan_id;
          const isCurrent = isCurrentPlan(plan.plan_id);
          const isPopular = plan.badge === 'Most Popular';
          const isBestValue = plan.badge === 'Best Value';

          return (
            <div
              key={plan.plan_id}
              className={`pricing-card ${isSelected ? 'selected' : ''} ${isPopular ? 'popular' : ''} ${isBestValue ? 'best-value' : ''} ${isCurrent ? 'current' : ''}`}
              data-testid={`pricing-card-${plan.plan_id}`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`pricing-badge ${isPopular ? 'popular' : ''} ${isBestValue ? 'best-value' : ''}`}>
                  {plan.badge}
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

              {/* Price */}
              <div className="pricing-price">
                <span className="price-main">{priceMain}</span>
                <span className="price-sub">{priceSub}</span>
              </div>

              {/* Savings */}
              {plan.savings_percent > 0 && (
                <div className="pricing-savings">
                  Save {plan.savings_percent}%
                </div>
              )}

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
                className={`pricing-cta ${isPopular ? 'popular' : ''} ${isBestValue ? 'best-value' : ''} ${isCurrent ? 'current' : ''}`}
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
                    {stripeEnabled ? 'Subscribe Now' : 'Get Started'}
                  </>
                )}
              </button>

              {/* Billing note */}
              {plan.plan_type !== 'lifetime' && !isCurrent && (
                <p className="pricing-billing-note">
                  Billed {plan.plan_type === 'weekly' ? 'weekly' : plan.plan_type === 'monthly' ? 'monthly' : plan.plan_type === 'quarterly' ? 'every 3 months' : 'annually'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingCards;
