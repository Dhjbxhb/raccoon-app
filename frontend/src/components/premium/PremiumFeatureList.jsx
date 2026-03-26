import React from 'react';
import { 
  Filter, Sparkles, Users, Shield, Gamepad2, BadgeCheck, 
  Zap, Globe, Camera, Ban, MessageSquare, Crown, Star
} from 'lucide-react';

const PremiumFeatureList = ({ compact = false }) => {
  const features = [
    {
      icon: Filter,
      title: "Advanced Matching Filters",
      description: "Filter by gender and country to find exactly who you want to meet",
      color: "purple"
    },
    {
      icon: Camera,
      title: "Premium Camera Filters",
      description: "Look your best with exclusive beauty filters, effects, and overlays",
      color: "pink"
    },
    {
      icon: Zap,
      title: "Priority Matching",
      description: "Get matched faster with priority queue placement",
      color: "yellow"
    },
    {
      icon: Ban,
      title: "Ad-Free Experience",
      description: "Enjoy uninterrupted sessions without any advertisements",
      color: "red"
    },
    {
      icon: Gamepad2,
      title: "Exclusive Games",
      description: "Access fun mini-games like Raccoon Feud and Truth or Dare",
      color: "green"
    },
    {
      icon: BadgeCheck,
      title: "Premium Badge",
      description: "Stand out with an exclusive premium badge on your profile",
      color: "blue"
    },
    {
      icon: Globe,
      title: "Worldwide Access",
      description: "Connect with people from specific countries of your choice",
      color: "cyan"
    },
    {
      icon: Shield,
      title: "Priority Support",
      description: "Get faster responses from our support team",
      color: "orange"
    }
  ];

  if (compact) {
    return (
      <div className="premium-features-compact" data-testid="premium-features-compact">
        <div className="features-grid-compact">
          {features.slice(0, 4).map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className={`feature-item-compact ${feature.color}`}>
                <Icon size={18} />
                <span>{feature.title}</span>
              </div>
            );
          })}
        </div>
        <p className="and-more">+ {features.length - 4} more premium features</p>
      </div>
    );
  }

  return (
    <div className="premium-features-section" data-testid="premium-features">
      <div className="features-header">
        <Crown className="features-crown" size={32} />
        <h2 className="features-title">Premium Features</h2>
        <p className="features-subtitle">Unlock the full Raccoon experience</p>
      </div>

      <div className="features-grid">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div 
              key={idx} 
              className={`feature-card ${feature.color}`}
              data-testid={`feature-${idx}`}
            >
              <div className={`feature-icon ${feature.color}`}>
                <Icon size={24} />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          );
        })}
      </div>

      {/* Social Proof */}
      <div className="premium-social-proof">
        <div className="proof-item">
          <Star className="proof-icon" size={20} />
          <span><strong>50,000+</strong> Premium Members</span>
        </div>
        <div className="proof-item">
          <MessageSquare className="proof-icon" size={20} />
          <span><strong>4.8/5</strong> Average Rating</span>
        </div>
        <div className="proof-item">
          <Users className="proof-icon" size={20} />
          <span><strong>24/7</strong> Support</span>
        </div>
      </div>
    </div>
  );
};

export default PremiumFeatureList;
