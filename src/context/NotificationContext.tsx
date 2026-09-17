import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notification } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  const loadNotifications = () => {
    const all = StorageService.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    if (!user) {
      setNotifications(all);
    } else {
      // Filter notifications relevant for this user role or 'ALL'
      const relevant = all.filter(n => !n.targetRole || n.targetRole === 'ALL' || n.targetRole === user.role);
      setNotifications(relevant);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const markAsRead = (id: string) => {
    const all = StorageService.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const updated = all.map(n => n.id === id ? { ...n, read: true } : n);
    StorageService.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    loadNotifications();
  };

  const markAllAsRead = () => {
    const all = StorageService.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const updated = all.map(n => ({ ...n, read: true }));
    StorageService.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    loadNotifications();
  };

  const clearAll = () => {
    StorageService.set(STORAGE_KEYS.NOTIFICATIONS, []);
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAll,
      refreshNotifications: loadNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
