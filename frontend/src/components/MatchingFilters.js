import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Globe, Users, Lock, Crown } from 'lucide-react';
import { PremiumPromptModal } from './premium/PremiumGate';

// The 7 continents the Continent Filter offers, plus "Worldwide" (no filter).
// country_filter sent to the backend is one of these `code` values verbatim
// (a continent name) or 'ANY' - see backend/services/continent_service.py.
const CONTINENTS = [
  { code: 'ANY', name: 'Worldwide', icon: '🌍' },
  { code: 'Europe', name: 'Europe', icon: '🇪🇺' },
  { code: 'Asia', name: 'Asia', icon: '🌏' },
  { code: 'Middle East', name: 'Middle East', icon: '🕌' },
  { code: 'North America', name: 'North America', icon: '🌎' },
  { code: 'South America', name: 'South America', icon: '🌎' },
  { code: 'Africa', name: 'Africa', icon: '🌍' },
  { code: 'Oceania', name: 'Oceania', icon: '🏝️' },
];

const MatchingFilters = ({
  isOpen,
  onClose,
  onApply,
  isPremium = false,
  onPremiumRequired,
  initialFilters = {}
}) => {
  const navigate = useNavigate();
  const [genderFilter, setGenderFilter] = useState(initialFilters.gender || 'any');
  const [countryFilter, setCountryFilter] = useState(initialFilters.country || 'ANY');

  // Premium prompt modal state
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [premiumFeatureName, setPremiumFeatureName] = useState('');

  // Show premium prompt with feature name
  const showPremiumModal = (featureName) => {
    setPremiumFeatureName(featureName);
    setShowPremiumPrompt(true);
  };

  // Handle premium upgrade navigation
  const handlePremiumUpgrade = () => {
    setShowPremiumPrompt(false);
    if (onPremiumRequired) {
      onPremiumRequired();
    } else {
      navigate('/premium');
    }
  };

  // Handle gender selection
  const handleGenderSelect = (gender) => {
    if (!isPremium && gender !== 'any') {
      showPremiumModal('Gender Filter');
      return;
    }
    setGenderFilter(gender);
  };

  // Handle continent selection
  const handleContinentSelect = (continentCode) => {
    if (!isPremium && continentCode !== 'ANY') {
      showPremiumModal('Continent Filter');
      return;
    }
    setCountryFilter(continentCode);
  };

  // Apply filters
  const handleApply = () => {
    onApply({
      gender: genderFilter,
      country: countryFilter,
    });
    onClose();
  };

  // Reset filters
  const handleReset = () => {
    setGenderFilter('any');
    setCountryFilter('ANY');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#0a0a15] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <div className="w-10 h-10 bg-[#7c3aed]/20 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-[#7c3aed]" />
              </div>
              Matching Filters
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
            >
              <X size={24} className="text-gray-400" />
            </button>
          </div>
          
          {!isPremium && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
              <Crown size={20} className="text-yellow-400" />
              <p className="text-sm text-yellow-200/80" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Filters are a Premium feature
              </p>
            </div>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Gender Filter */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Users size={16} />
              Gender Preference
              {!isPremium && <Lock size={14} className="text-yellow-400" />}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'any', label: 'Anyone', icon: '👤' },
                { value: 'male', label: 'Male', icon: '👨' },
                { value: 'female', label: 'Female', icon: '👩' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleGenderSelect(option.value)}
                  className={`relative p-4 rounded-2xl transition-all flex flex-col items-center gap-2 ${
                    genderFilter === option.value
                      ? 'bg-[#7c3aed] text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  } ${!isPremium && option.value !== 'any' ? 'opacity-60' : ''}`}
                  data-testid={`gender-${option.value}`}
                >
                  {!isPremium && option.value !== 'any' && (
                    <div className="absolute top-2 right-2">
                      <Lock size={12} className="text-yellow-400" />
                    </div>
                  )}
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Continent Filter */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Globe size={16} />
              Continent Preference
              {!isPremium && <Lock size={14} className="text-yellow-400" />}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CONTINENTS.map((continent) => (
                <button
                  key={continent.code}
                  onClick={() => handleContinentSelect(continent.code)}
                  className={`relative p-3 rounded-2xl transition-all flex items-center gap-2 ${
                    countryFilter === continent.code
                      ? 'bg-[#7c3aed] text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  } ${!isPremium && continent.code !== 'ANY' ? 'opacity-60' : ''}`}
                  data-testid={`continent-${continent.code === 'ANY' ? 'any' : continent.code.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {!isPremium && continent.code !== 'ANY' && (
                    <Lock size={12} className="absolute top-2 right-2 text-yellow-400" />
                  )}
                  <span className="text-xl">{continent.icon}</span>
                  <span className="text-sm font-medium text-left">{continent.name}</span>
                </button>
              ))}
            </div>
            {countryFilter !== 'ANY' && (
              <p className="text-xs text-gray-500 mt-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                If no one's online in {countryFilter} yet, we'll automatically search worldwide after a short wait.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3 flex-shrink-0">
          <button
            onClick={handleReset}
            className="flex-1 py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold text-white transition-all"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 px-6 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold text-white transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)]"
            style={{ fontFamily: 'Manrope, sans-serif' }}
            data-testid="apply-filters-btn"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Premium Prompt Modal */}
      <PremiumPromptModal
        isOpen={showPremiumPrompt}
        onClose={() => setShowPremiumPrompt(false)}
        featureName={premiumFeatureName}
        onUpgrade={handlePremiumUpgrade}
      />
    </div>
  );
};

export default MatchingFilters;
