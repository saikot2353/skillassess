import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  ...props
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-stone-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full text-xs sm:text-sm bg-white text-stone-900 border border-borderlight rounded-md py-1.5 ps-9 pe-8 focus:outline-none focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700 transition-colors placeholder:text-stone-400"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 end-0 flex items-center pe-2.5 text-stone-400 hover:text-stone-700 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
