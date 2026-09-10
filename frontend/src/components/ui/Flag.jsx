import React from 'react';
import * as Flags from 'country-flag-icons/react/3x2';

/**
 * Country flag rendered as an SVG (works on every OS, unlike flag emoji which
 * Windows does not draw). Falls back to the ISO code text for unknown codes.
 */
const Flag = ({ code, className = '' }) => {
  const c = (code || '').toUpperCase();
  const FlagIcon = Flags[c];
  if (!FlagIcon) {
    return <span className={`inline-block text-[10px] font-bold text-gray-400 ${className}`}>{c}</span>;
  }
  return <FlagIcon className={`inline-block rounded-[2px] object-cover ${className}`} title={c} />;
};

export default Flag;
