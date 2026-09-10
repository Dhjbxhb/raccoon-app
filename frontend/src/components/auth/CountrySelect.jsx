import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRIES } from '@/data/countries';
import Flag from '@/components/ui/Flag';

/**
 * Searchable country picker (flag + name). value/onChange deal in a country
 * object { code, name, dial }. Same dropdown mechanics as CountryCodeSelect
 * but shows the full name and takes the whole field width.
 */
const CountrySelect = ({ value, onChange, disabled, error }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q
    );
  }, [query]);

  const handleSelect = (country) => {
    onChange(country);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-12 px-4 flex items-center gap-3 bg-black/40 border rounded-xl text-white hover:bg-black/60 transition-all disabled:opacity-60 focus:outline-none ${
          error ? 'border-red-500/50' : 'border-white/10 focus:border-[#7c3aed]/60'
        }`}
        style={{ fontFamily: 'Manrope, sans-serif' }}
        data-testid="country-select-button"
      >
        {value ? (
          <>
            <Flag code={value.code} className="w-5 h-3.5 shrink-0" />
            <span className="flex-1 text-left truncate">{value.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-gray-500">Select your country</span>
        )}
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-[#12121c] border border-white/15 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country"
                className="w-full bg-black/40 border border-white/10 rounded-lg h-9 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#7c3aed]/60"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                data-testid="country-select-search"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-500 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
                No matches
              </li>
            ) : (
              results.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors ${
                      value?.code === c.code ? 'bg-[#7c3aed]/20' : ''
                    }`}
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    <Flag code={c.code} className="w-5 h-3.5 shrink-0" />
                    <span className="flex-1 text-gray-200 truncate">{c.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
