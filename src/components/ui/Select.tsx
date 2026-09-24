import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  isRequired?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helperText,
  leftIcon,
  className = '',
  id,
  required,
  isRequired,
  ...props
}) => {
  const generatedId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
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
        <select
          id={generatedId}
          required={required}
          className={`w-full text-xs sm:text-sm bg-[#FFFFFF] text-stone-800 border rounded-lg py-2.5 ps-3.5 pe-9 appearance-none transition-colors focus:outline-none focus:ring-2 cursor-pointer ${
            leftIcon ? 'ps-10' : ''
          } ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15'
              : 'border-[#E5E7EB] focus:border-[#A43950] focus:ring-[#A43950]/20 active:border-[#A43950]'
          } ${className}`}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none text-[#806F6F]">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-[#806F6F]">{helperText}</p>}
    </div>
  );
};
