import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';
import { AuditService } from '../../services/auditService';
import { Notification } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Filter,
  Check
} from 'lucide-react';

export interface SupportStaffNotificationsProps {
  onNavigate?: (path: string) => void;
}

export const SupportStaffNotifications: React.FC<SupportStaffNotificationsProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const isRTL = language === 'ar';

  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'ALERT'>('ALL');

  const filtered = notifications.filter(n => {
    if (filterType === 'UNREAD') return !n.read;
    if (filterType === 'ALERT') return n.type === 'ALERT' || n.type === 'WARNING';
    return true;
  });

  const handleRead = (id: string, link?: string) => {
    markAsRead(id);
    AuditService.log('VIEW', 'NOTIFICATION', `Support Staff acknowledged notification ${id}`, id);
    if (link && onNavigate) {
      onNavigate(link);
    }
  };

  const handleReadAll = () => {
    markAllAsRead();
    AuditService.log('UPDATE', 'NOTIFICATION', 'Support Staff marked all center notifications as read');
    showToast(isRTL ? 'تم تحديد جميع الإشعارات كمقروءة' : 'All notifications marked as read', 'success');
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'ALERT':
        return <ShieldAlert className="w-5 h-5 text-rose-700" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5 text-amber-700" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-700" />;
      case 'INFO':
      default:
        return <Info className="w-5 h-5 text-[#7A2E3A]" />;
    }
  };

  const getBadgeClass = (type: Notification['type']) => {
    switch (type) {
      case 'ALERT':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'WARNING':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'INFO':
      default:
        return 'bg-[#F8ECEE] text-[#7A2E3A] border-[#E8D9D2]';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title={isRTL ? 'تنبيهات وإشعارات الدعم التشغيلي' : 'Support Staff Operational Notifications'}
        subtitle={
          isRTL
            ? 'متابعة مهام الاستقبال الميداني، إشعارات مطابقة الصور، وبدء ورديات التقييم.'
            : 'Operational notifications for candidate intake, biometric photo validation flags, and assessment shift updates.'
        }
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: isRTL ? 'الإشعارات' : 'Notifications' },
        ]}
      />

      {/* Action and Filter Toolbar */}
      <div className="p-3 bg-white border border-[#E8D9D2] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#806F6F]" />
          <div className="inline-flex rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'ALL'
                  ? 'bg-[#7A2E3A] text-white shadow-xs'
                  : 'text-[#806F6F] hover:text-[#3F3030]'
              }`}
            >
              {isRTL ? 'الكل' : 'All'} ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('UNREAD')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'UNREAD'
                  ? 'bg-[#7A2E3A] text-white shadow-xs'
                  : 'text-[#806F6F] hover:text-[#3F3030]'
              }`}
            >
              {isRTL ? 'غير مقروءة' : 'Unread'} ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('ALERT')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'ALERT'
                  ? 'bg-[#7A2E3A] text-white shadow-xs'
                  : 'text-[#806F6F] hover:text-[#3F3030]'
              }`}
            >
              {isRTL ? 'تنبيهات حرجة' : 'Alerts'}
            </button>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReadAll}
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
          >
            {isRTL ? 'تحديد الكل كمقروء' : 'Mark All as Read'}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-[#E8D9D2] bg-white text-[#806F6F] space-y-2">
            <Bell className="w-10 h-10 mx-auto opacity-30 text-[#7A2E3A]" />
            <h4 className="text-sm font-bold text-[#3F3030]">
              {isRTL ? 'لا توجد إشعارات تطابق التصفية' : 'No Notifications Found'}
            </h4>
            <p className="text-xs">
              {isRTL ? 'جميع مهام الدعم والتحقق محدثة بالكامل.' : 'All support duties and verification tasks are up to date.'}
            </p>
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                !item.read
                  ? 'bg-white border-[#7A2E3A]/40 shadow-xs ring-1 ring-[#7A2E3A]/10'
                  : 'bg-[#FFFCF8] border-[#E8D9D2] hover:bg-white'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="p-2 rounded-xl bg-white border border-[#E8D9D2] shrink-0 shadow-2xs">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-xs font-bold ${!item.read ? 'text-[#7A2E3A]' : 'text-[#3F3030]'}`}>
                      {isRTL ? item.titleAr : item.titleEn}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeClass(item.type)}`}>
                      {item.type}
                    </span>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-[#7A2E3A] shrink-0" title="Unread" />
                    )}
                  </div>

                  <p className="text-xs text-[#5C4E4E] leading-relaxed">
                    {isRTL ? item.messageAr : item.messageEn}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-[#806F6F]">
                    <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-center sm:self-start">
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => handleRead(item.id)}
                    className="p-1.5 rounded-lg text-[#806F6F] hover:text-[#7A2E3A] hover:bg-[#F8ECEE] transition-colors"
                    title={isRTL ? 'تحديد كمقروء' : 'Mark as read'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {item.link && (
                  <button
                    type="button"
                    onClick={() => handleRead(item.id, item.link)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#7A2E3A] bg-[#F8ECEE] hover:bg-[#7A2E3A] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <span>{isRTL ? 'فتح' : 'View'}</span>
                    {isRTL ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
