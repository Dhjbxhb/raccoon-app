import React, { useState, useEffect } from 'react';
import { X, Globe, Users, Lock, Crown } from 'lucide-react';

// Country list (major countries)
const COUNTRIES = [
  { code: 'ANY', name: 'Any Country', flag: '🌍' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
];

const MatchingFilters = ({ 
  isOpen, 
  onClose, 
  onApply, 
  isPremium = false,
  onPremiumRequired,
  initialFilters = {} 
}) => {
  const [genderFilter, setGenderFilter] = useState(initialFilters.gender || 'any');
  const [countryFilter, setCountryFilter] = useState(initialFilters.country || 'ANY');
  const [showCountryList, setShowCountryList] = useState(false);

  // Handle gender selection
  const handleGenderSelect = (gender) => {
    if (!isPremium && gender !== 'any') {
      onPremiumRequired?.();
      return;
    }
    setGenderFilter(gender);
  };

  // Handle country selection
  const handleCountrySelect = (countryCode) => {
    if (!isPremium && countryCode !== 'ANY') {
      onPremiumRequired?.();
      return;
    }
    setCountryFilter(countryCode);
    setShowCountryList(false);
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

  const selectedCountry = COUNTRIES.find(c => c.code === countryFilter) || COUNTRIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-[#1a1a2e] to-[#0a0a15] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
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

        {/* Content */}
        <div className="p-6 space-y-6">
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

          {/* Country Filter */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Globe size={16} />
              Country Preference
              {!isPremium && <Lock size={14} className="text-yellow-400" />}
            </label>
            
            <div className="relative">
              <button
                onClick={() => setShowCountryList(!showCountryList)}
                className={`w-full p-4 rounded-2xl transition-all flex items-center justify-between ${
                  countryFilter !== 'ANY'
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                }`}
                data-testid="country-selector"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedCountry.flag}</span>
                  <span className="font-medium">{selectedCountry.name}</span>
                </div>
                <span className="text-gray-400">▼</span>
              </button>

              {/* Country Dropdown */}
              {showCountryList && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 max-h-60 overflow-y-auto">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => handleCountrySelect(country.code)}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-white/10 transition-all ${
                        countryFilter === country.code ? 'bg-[#7c3aed]/20' : ''
                      } ${!isPremium && country.code !== 'ANY' ? 'opacity-60' : ''}`}
                    >
                      <span className="text-xl">{country.flag}</span>
                      <span className="text-white text-sm">{country.name}</span>
                      {!isPremium && country.code !== 'ANY' && (
                        <Lock size={12} className="text-yellow-400 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3">
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
    </div>
  );
};

export default MatchingFilters;
