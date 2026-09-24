import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isRequired?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  required,
  isRequired,
  ...props
}) => {
  const generatedId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const showRequiredMark = isRequired || required;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={generatedId} className="block text-xs font-semibold text-stone-800 mb-1.5">
          {label}
          {showRequiredMark && <span className="text-[#A43950] ms-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-stone-400">
            {leftIcon}
          </div>
        )}
        <input
          id={generatedId}
          required={required}
          className={`w-full text-xs sm:text-sm bg-[#FFFFFF] text-stone-800 border rounded-lg py-2.5 px-3.5 transition-colors placeholder:text-stone-400 focus:outline-none focus:ring-2 ${
            leftIcon ? 'ps-10' : ''
          } ${rightIcon ? 'pe-10' : ''} ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15'
              : 'border-[#E5E7EB] focus:border-[#A43950] focus:ring-[#A43950]/20 active:border-[#A43950]'
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 end-0 flex items-center pe-3.5 pointer-events-none text-[#806F6F]">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-[#806F6F]">{helperText}</p>}
    </div>
  );
};
