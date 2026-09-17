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
    primary: 'bg-[#7A2E3A] hover:bg-[#64242F] text-[#FFFFFF] shadow-soft focus:ring-[#7A2E3A]/30 border border-transparent',
    secondary: 'bg-[#FFFFFF] hover:bg-[#F8ECEE] text-[#3F3030] border border-[#E8D9D2] focus:ring-[#E8D9D2] shadow-soft',
    gold: 'bg-[#C9A24D] hover:bg-[#B6903D] text-[#FFFFFF] shadow-soft focus:ring-[#C9A24D]/30 border border-transparent',
    outline: 'bg-transparent hover:bg-[#F8ECEE] text-[#7A2E3A] border border-[#E8D9D2] focus:ring-[#7A2E3A]/20',
    danger: 'bg-[#7A2E3A] hover:bg-[#64242F] text-[#FFFFFF] shadow-soft focus:ring-[#7A2E3A]/30 border border-transparent',
    ghost: 'bg-transparent hover:bg-[#F8ECEE] text-[#806F6F] hover:text-[#3F3030] focus:ring-[#E8D9D2] border-transparent',
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
