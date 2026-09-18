import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { AuditService } from '../services/auditService';
import { Notification } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
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

export interface SystemNotificationsPageProps {
  onNavigate?: (path: string) => void;
}

export const SystemNotificationsPage: React.FC<SystemNotificationsPageProps> = ({ onNavigate }) => {
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
    AuditService.log('VIEW', 'NOTIFICATION', `User ${user?.name} (${user?.role}) acknowledged notification ${id}`, id, 'SUCCESS');
    if (link && onNavigate) {
      onNavigate(link);
    }
  };

  const handleReadAll = () => {
    markAllAsRead();
    AuditService.log('UPDATE', 'NOTIFICATION', `User ${user?.name} marked all active notifications as read`, undefined, 'SUCCESS');
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
    <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl mx-auto">
      <PageHeader
        title={isRTL ? 'مركز الإشعارات والتنبيهات' : 'System Notifications & Operational Alerts'}
        subtitle={
          isRTL
            ? 'متابعة تنبيهات الحوكمة، العمليات الميدانية، تحديثات القرعة، واعتماد النتائج.'
            : 'Central notification feed for governance warnings, candidate milestones, lottery dispatches, and result locks.'
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
          <span className="text-xs font-bold text-[#3F3030]">
            {isRTL ? 'تصفية الإشعارات:' : 'Filter Feed:'}
          </span>
          <div className="flex items-center gap-1.5 ms-1">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'ALL'
                  ? 'bg-[#7A2E3A] text-white shadow-xs'
                  : 'text-[#806F6F] hover:bg-[#FAF8F5] hover:text-[#3F3030]'
              }`}
            >
              {isRTL ? 'الكل' : 'All'} ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('UNREAD')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'UNREAD'
                  ? 'bg-[#7A2E3A] text-white shadow-xs'
                  : 'text-[#806F6F] hover:bg-[#FAF8F5] hover:text-[#3F3030]'
              }`}
            >
              {isRTL ? 'غير المقروءة' : 'Unread'} ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('ALERT')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'ALERT'
                  ? 'bg-[#7A2E3A] text-white shadow-xs'
                  : 'text-[#806F6F] hover:bg-[#FAF8F5] hover:text-[#3F3030]'
              }`}
            >
              {isRTL ? 'تنبيهات حرجة' : 'Alerts Only'}
            </button>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReadAll}
            leftIcon={<CheckCheck className="w-4 h-4 text-[#7A2E3A]" />}
          >
            {isRTL ? 'تحديد الكل كمقروء' : 'Mark All Read'}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#E8D9D2] rounded-2xl p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E8D9D2] text-[#806F6F] flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#3F3030]">
              {isRTL ? 'لا توجد إشعارات حالياً' : 'No notifications in this filter'}
            </h4>
            <p className="text-xs text-[#806F6F] mt-1 max-w-sm mx-auto">
              {isRTL
                ? 'جميع المهام والتنبيهات التشغيلية محدثة ولا تتطلب أي إجراء فوري.'
                : 'All operational activities and governance alerts are clear. No pending actions require attention.'}
            </p>
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border transition-all p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                !item.read
                  ? 'border-[#7A2E3A]/40 bg-gradient-to-r from-white via-white to-[#F8ECEE]/20 ring-1 ring-[#7A2E3A]/20'
                  : 'border-[#E8D9D2] hover:border-[#806F6F]/40'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1">
                <div className="mt-0.5 p-2 rounded-xl bg-[#FAF8F5] border border-[#E8D9D2] shrink-0">
                  {getIcon(item.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#3F3030]">
                      {isRTL ? item.titleAr : item.titleEn}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeClass(item.type)}`}>
                      {item.type}
                    </span>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-[#7A2E3A] shrink-0 animate-pulse" />
                    )}
                  </div>

                  <p className="text-xs text-[#806F6F] leading-relaxed">
                    {isRTL ? item.messageAr : item.messageEn}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-[#A89595] pt-0.5">
                    <span>{new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className="p-1.5 rounded-lg text-[#806F6F] hover:text-[#7A2E3A] hover:bg-[#FAF8F5] transition-colors"
                    title={isRTL ? 'تحديد كمقروء' : 'Mark as read'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}

                {item.link && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRead(item.id, item.link)}
                    rightIcon={isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  >
                    {isRTL ? 'عرض الإجراء' : 'View Action'}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
