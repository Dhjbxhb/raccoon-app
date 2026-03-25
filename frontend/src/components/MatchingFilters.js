import React, { useState, useEffect, useMemo } from 'react';
import { X, Globe, Users, Lock, Crown, Search, MapPin } from 'lucide-react';

// Complete list of all countries with flags
const ALL_COUNTRIES = [
  { code: 'ANY', name: 'Any Country', flag: '🌍' },
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CV', name: 'Cape Verde', flag: '🇨🇻' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮' },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨' },
  { code: 'VC', name: 'Saint Vincent', flag: '🇻🇨' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
  { code: 'ST', name: 'Sao Tome and Principe', flag: '🇸🇹' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
];

const MatchingFilters = ({ 
  isOpen, 
  onClose, 
  onApply, 
  isPremium = false,
  onPremiumRequired,
  initialFilters = {},
  userCountry = null
}) => {
  const [genderFilter, setGenderFilter] = useState(initialFilters.gender || 'any');
  const [countryFilter, setCountryFilter] = useState(initialFilters.country || 'ANY');
  const [showCountryList, setShowCountryList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detectedCountry, setDetectedCountry] = useState(null);

  // Auto-detect country on mount
  useEffect(() => {
    if (userCountry) {
      setDetectedCountry(userCountry);
    } else {
      // Fetch from localStorage or user data
      const stored = localStorage.getItem('raccoon_user_country');
      if (stored) {
        setDetectedCountry(stored);
      }
    }
  }, [userCountry]);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return ALL_COUNTRIES;
    }
    const query = searchQuery.toLowerCase();
    return ALL_COUNTRIES.filter(country => 
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
    setSearchQuery('');
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
    setSearchQuery('');
  };

  // Select detected country
  const handleSelectDetected = () => {
    if (!isPremium) {
      onPremiumRequired?.();
      return;
    }
    if (detectedCountry) {
      setCountryFilter(detectedCountry);
      setShowCountryList(false);
    }
  };

  if (!isOpen) return null;

  const selectedCountry = ALL_COUNTRIES.find(c => c.code === countryFilter) || ALL_COUNTRIES[0];
  const detectedCountryData = ALL_COUNTRIES.find(c => c.code === detectedCountry);

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

          {/* Country Filter */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Globe size={16} />
              Country Preference
              {!isPremium && <Lock size={14} className="text-yellow-400" />}
            </label>

            {/* Auto-detected country suggestion */}
            {detectedCountryData && detectedCountry !== countryFilter && (
              <button
                onClick={handleSelectDetected}
                className="w-full mb-3 p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3 transition-all"
              >
                <MapPin size={18} className="text-green-400" />
                <span className="text-green-400 text-sm">Your location:</span>
                <span className="text-xl">{detectedCountryData.flag}</span>
                <span className="text-white text-sm font-medium">{detectedCountryData.name}</span>
                {!isPremium && <Lock size={12} className="text-yellow-400 ml-auto" />}
              </button>
            )}
            
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
                <span className="text-gray-400">{showCountryList ? '▲' : '▼'}</span>
              </button>

              {/* Country Dropdown with Search */}
              {showCountryList && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10">
                  {/* Search Input */}
                  <div className="p-3 border-b border-white/10">
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search countries..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-gray-500 outline-none focus:border-[#7c3aed]/50 text-sm"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Country List */}
                  <div className="max-h-60 overflow-y-auto">
                    {filteredCountries.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No countries found
                      </div>
                    ) : (
                      filteredCountries.map((country) => (
                        <button
                          key={country.code}
                          onClick={() => handleCountrySelect(country.code)}
                          className={`w-full p-3 flex items-center gap-3 hover:bg-white/10 transition-all ${
                            countryFilter === country.code ? 'bg-[#7c3aed]/20' : ''
                          } ${!isPremium && country.code !== 'ANY' ? 'opacity-60' : ''}`}
                        >
                          <span className="text-xl">{country.flag}</span>
                          <span className="text-white text-sm flex-1 text-left">{country.name}</span>
                          {country.code === detectedCountry && (
                            <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">You</span>
                          )}
                          {!isPremium && country.code !== 'ANY' && (
                            <Lock size={12} className="text-yellow-400" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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
    </div>
  );
};

export default MatchingFilters;
