import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'maroon' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantClasses = {
    default: 'bg-stone-100 text-stone-700 border-stone-200',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    maroon: 'bg-[#FDF2F4] text-[#A43950] border-[#F7D0D8]',
    gold: 'bg-[#FDFBF5] text-[#946E20] border-[#EDDDA2]',
    success: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
