import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRIES } from '@/data/countries';
import Flag from '@/components/ui/Flag';

/**
 * Searchable country dial-code picker. Shows flag + "+<dial>" and, when open,
 * a search box over the full country list (match by name, code, or dial).
 * value/onChange deal in a country object: { code, name, dial }.
 */
const CountryCodeSelect = ({ value, onChange, disabled }) => {
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
    // focus search on open
    setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const digits = q.replace(/[^\d]/g, '');
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q ||
        (digits && c.dial.startsWith(digits))
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
        className="h-12 pl-3 pr-2 flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl text-white hover:bg-black/60 transition-all disabled:opacity-60 focus:outline-none focus:border-[#7c3aed]/60"
        style={{ fontFamily: 'Manrope, sans-serif' }}
        data-testid="country-code-button"
        aria-label="Select country"
      >
        <Flag code={value?.code} className="w-5 h-3.5" />
        <span className="text-sm text-gray-300">+{value?.dial}</span>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 max-w-[80vw] left-0 bg-[#12121c] border border-white/15 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code"
                className="w-full bg-black/40 border border-white/10 rounded-lg h-9 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#7c3aed]/60"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                data-testid="country-search-input"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1" data-testid="country-list">
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
                    <span className="text-gray-500">+{c.dial}</span>
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

export default CountryCodeSelect;
