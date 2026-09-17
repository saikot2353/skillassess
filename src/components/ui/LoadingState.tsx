import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <Loader2 className="w-7 h-7 text-maroon-700 animate-spin mb-3" />
      <p className="text-xs sm:text-sm font-medium text-stone-600">{message}</p>
    </div>
  );
};
