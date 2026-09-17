import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, Search, Bell, Globe, ChevronDown, Check,
  LogOut, Settings, User as UserIcon, Shield, Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Role } from '../../types';

export interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onNavigate: (path: string) => void;
  currentPath: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenSearch,
  onNavigate,
}) => {
  const { language, isRTL, setLanguage, t } = useLanguage();
  const { user, logout, switchRole } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rolesList: { role: Role; label: string }[] = [
    { role: 'SUPER_ADMIN', label: t.roles.SUPER_ADMIN },
    { role: 'COUNTRY_ACCOUNT', label: t.roles.COUNTRY_ACCOUNT },
    { role: 'CENTER_ADMIN', label: t.roles.CENTER_ADMIN },
    { role: 'ASSESSOR', label: t.roles.ASSESSOR },
    { role: 'SUPPORT_STAFF', label: t.roles.SUPPORT_STAFF },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-borderlight bg-white px-4 sm:px-6 flex items-center justify-between shadow-soft">
      {/* Start / Left Section: Mobile Toggle & Brand Indicator */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Tag in Header for small screens / context */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-maroon-800 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm">
            360
          </div>
          <div className="hidden lg:block">
            <span className="text-sm font-bold text-stone-900 leading-none block">
              {t.brand.name}
            </span>
            <span className="text-[10px] text-stone-400 font-medium leading-none block mt-0.5">
              {t.brand.tagline}
            </span>
          </div>
        </div>
      </div>

      {/* Center Section: Global Search Trigger Button */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-stone-400 bg-stone-50 border border-borderlight rounded-md hover:bg-stone-100/70 hover:border-stone-300 transition-all text-start"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-stone-400" />
            <span>{t.common.globalSearchPlaceholder}</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-stone-400 bg-white border border-stone-200 rounded shadow-xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* End / Right Section: Language, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Icon */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="md:hidden p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
          aria-label="Open search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Language Switcher Pill */}
        <div className="flex items-center border border-borderlight rounded-md p-0.5 bg-canvas-subtle/70 text-xs font-medium">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 rounded transition-colors ${
              language === 'en'
                ? 'bg-white text-maroon-900 shadow-soft font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            English
          </button>
          <span className="text-stone-300">|</span>
          <button
            type="button"
            onClick={() => setLanguage('ar')}
            className={`px-2.5 py-1 rounded transition-colors font-arabic ${
              language === 'ar'
                ? 'bg-white text-maroon-900 shadow-soft font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            العربية
          </button>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(prev => !prev)}
            className="relative p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 end-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-maroon-700 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div 
              className={`absolute top-full mt-2 w-80 sm:w-96 rounded-lg bg-white border border-borderlight shadow-modal overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 ${
                isRTL ? 'start-0' : 'end-0'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-borderlight bg-canvas-subtle/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-900">{t.header.notifications}</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-maroon-100 text-maroon-800">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] text-maroon-800 hover:underline font-medium"
                  >
                    {t.header.markAllRead}
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-borderlight">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-400">
                    {t.header.noNotifications}
                  </div>
                ) : (
                  notifications.slice(0, 5).map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        markAsRead(item.id);
                        if (item.link) {
                          setIsNotifOpen(false);
                          onNavigate(item.link);
                        }
                      }}
                      className={`p-3.5 hover:bg-canvas-base/70 cursor-pointer transition-colors ${
                        !item.read ? 'bg-maroon-50/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-stone-900">
                          {language === 'ar' ? item.titleAr : item.titleEn}
                        </p>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-maroon-700 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                        {language === 'ar' ? item.messageAr : item.messageEn}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Area */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(prev => !prev)}
            className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-stone-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-maroon-100 border border-maroon-200 text-maroon-800 font-bold text-xs flex items-center justify-center shrink-0">
              {user?.name.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-start">
              <span className="text-xs font-semibold text-stone-900 block leading-tight truncate max-w-[120px]">
                {user?.name || 'Guest'}
              </span>
              <span className="text-[10px] text-stone-500 block leading-tight font-medium">
                {user?.role ? t.roles[user.role] : 'Guest'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
          </button>

          {isProfileOpen && (
            <div 
              className={`absolute top-full mt-2 w-64 rounded-lg bg-white border border-borderlight shadow-modal overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 ${
                isRTL ? 'start-0' : 'end-0'
              }`}
            >
              {/* Profile Card Header */}
              <div className="p-4 border-b border-borderlight bg-canvas-subtle/40">
                <p className="text-xs font-bold text-stone-900 truncate">{user?.name}</p>
                <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gold-50 border border-gold-200 text-gold-900 text-[10px] font-semibold">
                  <Shield className="w-3 h-3 text-gold-700" />
                  <span>{user?.role ? t.roles[user.role] : ''}</span>
                </div>
              </div>

              {/* Demo Role Switcher Section */}
              <div className="p-3 border-b border-borderlight bg-stone-50/70">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  <Sparkles className="w-3 h-3 text-maroon-700" />
                  <span>Switch Role (Prototype Tool)</span>
                </div>
                <div className="flex flex-col gap-1">
                  {rolesList.map(item => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => {
                        switchRole(item.role);
                        setIsProfileOpen(false);
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                        user?.role === item.role
                          ? 'bg-maroon-100 text-maroon-900 font-semibold'
                          : 'text-stone-600 hover:bg-stone-200/60'
                      }`}
                    >
                      <span>{item.label}</span>
                      {user?.role === item.role && <Check className="w-3.5 h-3.5 text-maroon-800" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Links */}
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onNavigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-md transition-colors text-start"
                >
                  <UserIcon className="w-4 h-4 text-stone-400" />
                  <span>{t.header.profile}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onNavigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-md transition-colors text-start"
                >
                  <Settings className="w-4 h-4 text-stone-400" />
                  <span>{t.header.accountSettings}</span>
                </button>
                <div className="my-1 border-t border-borderlight" />
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                    onNavigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md transition-colors text-start"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>{t.nav.logout}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
