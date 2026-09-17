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
        <label htmlFor={generatedId} className="block text-xs font-semibold text-[#3F3030] mb-1.5">
          {label}
          {showRequiredMark && <span className="text-[#7A2E3A] ms-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-[#806F6F]">
            {leftIcon}
          </div>
        )}
        <input
          id={generatedId}
          required={required}
          className={`w-full text-xs sm:text-sm bg-[#FFFFFF] text-[#3F3030] border rounded-lg py-2.5 px-3.5 transition-colors placeholder:text-[#A89595] focus:outline-none focus:ring-1 ${
            leftIcon ? 'ps-10' : ''
          } ${rightIcon ? 'pe-10' : ''} ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15'
              : 'border-[#E8D9D2] focus:border-[#7A2E3A] focus:ring-[#7A2E3A]'
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
