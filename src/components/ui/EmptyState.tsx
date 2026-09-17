import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-borderlight bg-canvas-subtle/30 ${className}`}>
      <div className="p-3 mb-3 rounded-full bg-white border border-borderlight text-stone-400 shadow-soft">
        {icon || <Inbox className="w-7 h-7 stroke-1" />}
      </div>
      <h4 className="text-sm font-semibold text-stone-800 mb-1">{title}</h4>
      {description && <p className="text-xs text-stone-500 max-w-sm mb-4">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
