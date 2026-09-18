import React from 'react';
import { Badge } from './Badge';

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  let variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'maroon' | 'gold' = 'neutral';
  let label = status.replace(/_/g, ' ');

  switch (normalized) {
    case 'ACTIVE':
    case 'COMPLETED':
    case 'APPROVED':
    case 'PUBLISHED':
    case 'PASS':
    case 'VERIFIED':
    case 'RESOLVED':
    case 'NORMAL':
    case 'ENROLLED':
      variant = 'success';
      break;

    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'PENDING_AUDIT':
    case 'SCHEDULED':
    case 'ACTION_REQUIRED':
    case 'REVIEW_REQUIRED':
    case 'VARIANCE_DETECTED':
      variant = 'warning';
      break;

    case 'IN_PROGRESS':
    case 'IN_ASSESSMENT':
    case 'UNDER_REVIEW':
    case 'SUBMITTED':
      variant = 'info';
      break;

    case 'EVALUATED':
    case 'LOCKED':
    case 'CORRECTED':
    case 'ATTENTION':
      variant = 'gold';
      break;

    case 'OPEN':
      variant = 'maroon';
      break;

    case 'INACTIVE':
    case 'SUSPENDED':
    case 'REJECTED':
    case 'CANCELLED':
    case 'FAIL':
    case 'ABSENT':
      variant = 'danger';
      break;

    case 'CLOSED':
    case 'DRAFT':
    case 'REGISTERED':
    default:
      variant = 'neutral';
      break;
  }

  return (
    <Badge variant={variant} size="sm" className={className}>
      {label}
    </Badge>
  );
};
