import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, User } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => boolean;
  logout: () => void;
  switchRole: (role: Role) => void;
  hasRole: (allowedRoles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    StorageService.initializeDemoData();
    return StorageService.get<User | null>(STORAGE_KEYS.AUTH, null);
  });
  const { showToast } = useToast();

  useEffect(() => {
    // If no user is logged in, by default on first launch we can keep user null so login screen is shown,
    // or if previously logged in, user will be loaded from storage.
  }, []);

  const login = (identifier: string, _password?: string): boolean => {
    const users = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    const clean = identifier.trim().toLowerCase();
    const foundUser = users.find(u => 
      u.email.trim().toLowerCase() === clean || 
      (u.username && u.username.trim().toLowerCase() === clean) ||
      (clean === 'assessor01' && (u.role === 'ASSESSOR' || u.id === 'usr-4')) ||
      (clean === 'support01' && (u.role === 'SUPPORT_STAFF' || u.id === 'usr-5'))
    );

    if (foundUser) {
      const updatedUser: User = {
        ...foundUser,
        lastLogin: new Date().toISOString()
      };
      
      setUser(updatedUser);
      StorageService.set(STORAGE_KEYS.AUTH, updatedUser);
      StorageService.updateItem(STORAGE_KEYS.USERS, updatedUser);

      AuditService.log('LOGIN', 'AUTH', `User ${updatedUser.name} (${updatedUser.role}) signed in successfully.`);
      return true;
    }

    AuditService.log('LOGIN', 'AUTH', `Failed sign-in attempt for identifier: ${identifier}`, undefined, 'FAILURE');
    return false;
  };

  const logout = () => {
    if (user) {
      AuditService.log('LOGOUT', 'AUTH', `User ${user.name} logged out.`);
    }
    setUser(null);
    StorageService.clear(STORAGE_KEYS.AUTH);
    showToast('Signed out successfully.', 'info');
  };

  const switchRole = (role: Role) => {
    const users = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    const matchingUser = users.find(u => u.role === role);
    if (matchingUser) {
      setUser(matchingUser);
      StorageService.set(STORAGE_KEYS.AUTH, matchingUser);
      AuditService.log('LOGIN', 'AUTH', `Switched active session to role: ${role}`);
      showToast(`Switched active profile to ${role.replace('_', ' ')}`, 'success');
    }
  };

  const hasRole = (allowedRoles: Role[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      switchRole,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
