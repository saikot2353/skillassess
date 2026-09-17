import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { Button } from '../ui/Button';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  onNavigate: (path: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  onNavigate,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    onNavigate('/login');
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-lg border border-amber-200 bg-amber-50/50 max-w-lg mx-auto my-12 shadow-soft">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-stone-900 mb-1">Access Restricted</h3>
        <p className="text-xs text-stone-600 mb-4">
          Your current account role (<strong>{user.role}</strong>) does not have authorization to view this module.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onNavigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
