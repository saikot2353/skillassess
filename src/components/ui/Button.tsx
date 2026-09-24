import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'outline' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]';

  const sizeClasses = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3.5 py-1.5 text-xs sm:text-sm gap-1.5',
    md: 'px-4.5 py-2 text-sm gap-2',
    lg: 'px-5.5 py-2.5 text-base gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-[#A43950] hover:bg-[#8E2F43] active:bg-[#7D283A] text-[#FFFFFF] shadow-xs focus:ring-[#A43950]/30 border border-transparent',
    secondary: 'bg-[#FFFFFF] hover:bg-stone-50 active:bg-stone-100 text-stone-700 border border-[#E5E7EB] focus:ring-[#A43950]/20 shadow-xs',
    gold: 'bg-[#D4AF37] hover:bg-[#B88E28] active:bg-[#946E20] text-[#FFFFFF] shadow-xs focus:ring-[#D4AF37]/30 border border-transparent',
    outline: 'bg-transparent hover:bg-[#FDF2F4] active:bg-[#FCE7EB] text-[#A43950] border border-[#E5E7EB] hover:border-[#A43950]/40 focus:ring-[#A43950]/20',
    danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-[#FFFFFF] shadow-xs focus:ring-rose-500/30 border border-transparent',
    ghost: 'bg-transparent hover:bg-[#FDF2F4] active:bg-[#FCE7EB] text-stone-600 hover:text-[#A43950] focus:ring-[#A43950]/20 border-transparent',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
