import React, { useRef, useCallback } from 'react';

/**
 * 6-digit code entry as individual boxes (auto-advances focus, supports
 * paste, backspace moves to the previous box). Used for both password
 * reset codes and email verification codes.
 */
const OTPInput = ({ value, onChange, length = 6, error, testId }) => {
  const inputRefs = useRef([]);
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  const focusInput = (index) => {
    const el = inputRefs.current[index];
    if (el) el.focus();
  };

  const handleChange = useCallback((index, rawValue) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    onChange(nextDigits.join(''));

    if (digit && index < length - 1) {
      focusInput(index + 1);
    }
  }, [digits, onChange, length]);

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
  }, [digits]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted.padEnd(length, '').slice(0, length).replace(/\s/g, ''));
      focusInput(Math.min(pasted.length, length - 1));
    }
  }, [onChange, length]);

  return (
    <div>
      <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={handlePaste} data-testid={testId}>
        {digits.map((digit, index) => {
          const filled = !!digit;
          return (
            <div key={index} className="relative">
              {filled && (
                <div
                  className="absolute inset-0 rounded-2xl blur-md opacity-60 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.55) 0%, transparent 70%)' }}
                />
              )}
              <input
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`relative w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-2xl outline-none transition-all duration-150 border-2 ${
                  error
                    ? 'bg-red-500/[0.08] border-red-500/50 focus:border-red-500/80 focus:ring-2 focus:ring-red-500/25'
                    : filled
                      ? 'bg-gradient-to-br from-[#7c3aed]/20 to-[#9333ea]/10 border-[#7c3aed]/70 shadow-[0_0_16px_rgba(124,58,237,0.35)]'
                      : 'bg-black/40 border-white/10 focus:border-[#7c3aed]/60 focus:ring-2 focus:ring-[#7c3aed]/20'
                }`}
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  // Force white text explicitly - some mobile browsers (notably
                  // iOS Safari) otherwise render input text in their own default
                  // (black) color regardless of the Tailwind text-color class.
                  color: error ? '#fecaca' : '#ffffff',
                  WebkitTextFillColor: error ? '#fecaca' : '#ffffff',
                  colorScheme: 'dark'
                }}
              />
            </div>
          );
        })}
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-3 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default OTPInput;
