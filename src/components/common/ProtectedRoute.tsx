import React, { useEffect } from 'react';
import { ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AuditService } from '../../services/auditService';
import { Role } from '../../types';
import { Permission } from '../../services/securityService';
import { Button } from '../ui/Button';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requiredPermissions?: Permission[];
  onNavigate: (path: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermissions,
  onNavigate,
}) => {
  const { user, isAuthenticated, hasRole, hasPermission } = useAuth();
  const { language, isRTL } = useLanguage();

  const isRoleDenied = allowedRoles && !hasRole(allowedRoles);
  const isPermissionDenied = requiredPermissions && !requiredPermissions.every(p => hasPermission(p));
  const isDenied = isRoleDenied || isPermissionDenied;

  useEffect(() => {
    if (isDenied && user) {
      AuditService.log(
        'VIEW',
        'AUTH',
        `Access restricted: Unauthorized navigation attempt to ${window.location.pathname} by ${user.name} (${user.role})`,
        user.id,
        'FAILURE'
      );
    }
  }, [isDenied, user?.id]);

  if (!isAuthenticated) {
    onNavigate('/login');
    return null;
  }

  if (isDenied && user) {
    const defaultDashboard = user.role === 'ASSESSOR' ? '/assessor/dashboard' : '/dashboard';

    return (
      <div className="p-8 sm:p-12 text-center rounded-2xl border border-rose-200 bg-white max-w-lg mx-auto my-12 shadow-modal animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#3F3030] mb-1">
          {language === 'ar' ? 'الوصول مقيد - غير مصرح' : 'Access Restricted'}
        </h3>
        <p className="text-xs text-[#806F6F] mb-6 leading-relaxed">
          {language === 'ar' ? (
            <>
              حسابك الحالي بدور (<strong>{user.role}</strong>) لا يملك الصلاحيات الكافية للوصول إلى هذا القسم. يُرجى مراجعة المشرف العام إذا كنت تعتقد أن هذا خطأ.
            </>
          ) : (
            <>
              Your account with role (<strong>{user.role}</strong>) does not have authorization to access this module. Please contact your system administrator if you believe this is an error.
            </>
          )}
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onNavigate(defaultDashboard)}
          leftIcon={isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        >
          {language === 'ar' ? 'العودة إلى لوحة التحكم' : 'Return to My Dashboard'}
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
