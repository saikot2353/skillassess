import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { Notification } from '../../types';
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
  Trash2
} from 'lucide-react';

interface AssessorNotificationsProps {
  onNavigate?: (path: string) => void;
}

export const AssessorNotifications: React.FC<AssessorNotificationsProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'ALERT'>('ALL');

  useEffect(() => {
    const allNotifs = storageService.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    setNotifications(allNotifs);
  }, []);

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    storageService.set(STORAGE_KEYS.NOTIFICATIONS, updated);
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    storageService.set(STORAGE_KEYS.NOTIFICATIONS, updated);
  };

  const filtered = notifications.filter(n => {
    if (filterType === 'UNREAD') return !n.read;
    if (filterType === 'ALERT') return n.type === 'ALERT' || n.type === 'WARNING';
    return true;
  });

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'ALERT':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'WARNING':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'INFO':
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Bell className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'مركز الإشعارات والتنبيهات' : 'Notifications Hub'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3F3030]">
            {isRTL ? 'إشعارات وتنبيهات المقيم' : 'Assessor Operational Notifications'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRTL
              ? 'متابعة تحديثات الجداول، تحركات المرشحين، وتوجيهات إدارة المركز الميدانية.'
              : 'Real-time schedule shifts, candidate arrival alerts, and center administration directives.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <CheckCheck className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'تحديد الكل كمقروء' : 'Mark All Read'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filterType === 'ALL'
              ? 'bg-[#7A2E3A] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {isRTL ? 'جميع الإشعارات' : 'All Notifications'} ({notifications.length})
        </button>

        <button
          onClick={() => setFilterType('UNREAD')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filterType === 'UNREAD'
              ? 'bg-[#7A2E3A] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {isRTL ? 'غير المقروءة' : 'Unread'} ({notifications.filter(n => !n.read).length})
        </button>

        <button
          onClick={() => setFilterType('ALERT')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            filterType === 'ALERT'
              ? 'bg-[#7A2E3A] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {isRTL ? 'التنبيهات العاجلة' : 'Urgent Alerts'}
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#E8D9D2] text-gray-500 shadow-sm">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold">{isRTL ? 'لا توجد إشعارات حالياً.' : 'No notifications found in this view.'}</p>
          </div>
        ) : (
          filtered.map(notif => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                !notif.read
                  ? 'bg-white border-[#7A2E3A]/40 shadow-sm'
                  : 'bg-gray-50/70 border-gray-200 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-xs font-bold ${!notif.read ? 'text-gray-950' : 'text-gray-700'}`}>
                    {isRTL ? notif.titleAr : notif.titleEn}
                  </h3>
                  <span className="text-[11px] text-gray-400 font-mono whitespace-nowrap">
                    {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>

                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {isRTL ? notif.messageAr : notif.messageEn}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                  <div>
                    {notif.link && (
                      <button
                        onClick={() => onNavigate?.(notif.link!)}
                        className="text-xs font-bold text-[#7A2E3A] hover:underline flex items-center gap-1"
                      >
                        <span>{isRTL ? 'الانتقال إلى الشاشة' : 'Open Related Screen'}</span>
                        {isRTL ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {!notif.read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="text-[11px] font-bold text-gray-500 hover:text-[#7A2E3A]"
                    >
                      {isRTL ? 'تحديد كمقروء' : 'Mark as read'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
