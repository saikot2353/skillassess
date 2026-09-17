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
    maroon: 'bg-maroon-50 text-maroon-800 border-maroon-200',
    gold: 'bg-gold-50 text-gold-800 border-gold-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
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
