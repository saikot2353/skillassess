import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, User } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { SecurityService, Permission } from '../services/securityService';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => boolean;
  logout: () => void;
  switchRole: (role: Role) => void;
  hasRole: (allowedRoles: Role[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
  checkScope: (targetCountryId?: string, targetCenterId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(() => {
    StorageService.initializeDemoData();
    const cachedUser = StorageService.get<User | null>(STORAGE_KEYS.AUTH, null);
    if (!cachedUser) return null;

    // Hardened session validation: verify user still exists in database and remains ACTIVE
    const users = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    const liveUser = users.find(u => u.id === cachedUser.id);
    if (!liveUser || liveUser.status !== 'ACTIVE') {
      StorageService.clear(STORAGE_KEYS.AUTH);
      return null;
    }
    return liveUser;
  });

  // Verify active session integrity periodically or on storage change
  useEffect(() => {
    const handleStorageChange = () => {
      if (user) {
        const users = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
        const liveUser = users.find(u => u.id === user.id);
        if (!liveUser || liveUser.status !== 'ACTIVE') {
          setUser(null);
          StorageService.clear(STORAGE_KEYS.AUTH);
          showToast('Active session terminated: account has been disabled or suspended.', 'error');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  const login = (identifier: string, password?: string): boolean => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Prevent submission of empty credentials
    if (!cleanId || (password !== undefined && !cleanPass)) {
      AuditService.log('LOGIN', 'AUTH', 'Sign-in rejected: empty credentials submitted.', undefined, 'FAILURE');
      showToast('Username/email and password cannot be blank.', 'error');
      return false;
    }

    const users = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    const foundUser = users.find(u => 
      u.email.trim().toLowerCase() === cleanId || 
      (u.username && u.username.trim().toLowerCase() === cleanId) ||
      (cleanId === 'dhaka.admin' && (u.username === 'admin.dhaka' || u.email === 'dhaka.admin@skillassess360.com')) ||
      (cleanId === 'kamal.assessor' && (u.username === 'assessor.kamal' || u.email === 'kamal.assessor@skillassess360.com')) ||
      (cleanId === 'assessor01' && (u.username === 'assessor.lead' || u.id === 'usr-4')) ||
      (cleanId === 'support01' && (u.username === 'staff.maryam' || u.id === 'usr-5')) ||
      (cleanId === 'organizer01' && (u.username === 'organizer01' || u.id === 'usr-org-1')) ||
      (cleanId === 'organizer' && (u.username === 'organizer01' || u.id === 'usr-org-1')) ||
      (cleanId === 'organizer.jeddah' && (u.username === 'organizer.jeddah' || u.id === 'usr-org-2')) ||
      (cleanId === 'organizer.dubai' && (u.username === 'organizer.dubai' || u.id === 'usr-org-3')) ||
      (cleanId === 'organizer.dhaka' && (u.username === 'organizer.dhaka' || u.id === 'usr-org-4')) ||
      (cleanId === 'cbtsupport01' && (u.username === 'cbtsupport01' || u.id === 'usr-cbt-1')) ||
      (cleanId === 'cbt.riyadh' && (u.username === 'cbtsupport01' || u.id === 'usr-cbt-1')) ||
      (cleanId === 'cbt.jeddah' && (u.username === 'cbt.jeddah' || u.id === 'usr-cbt-2')) ||
      (cleanId === 'cbt.dubai' && (u.username === 'cbt.dubai' || u.id === 'usr-cbt-3')) ||
      (cleanId === 'cbt.dhaka' && (u.username === 'cbt.dhaka' || u.id === 'usr-cbt-4'))
    );

    if (!foundUser) {
      AuditService.log('LOGIN', 'AUTH', `Failed sign-in attempt for identifier: ${identifier}`, undefined, 'FAILURE');
      return false;
    }

    // Account status check: prevent inactive or suspended accounts from logging in
    if (foundUser.status !== 'ACTIVE') {
      AuditService.log(
        'LOGIN', 
        'AUTH', 
        `Sign-in rejected for ${foundUser.name} (${foundUser.email}): Account is ${foundUser.status}`, 
        foundUser.id, 
        'FAILURE'
      );
      showToast(`Account is ${foundUser.status.toLowerCase()}. Please contact Super Admin.`, 'error');
      return false;
    }

    // Prototype password check
    const demoPasswordMap: Record<string, string> = {
      'superadmin': 'admin123',
      'country.sa': 'country123',
      'country.ae': 'country123',
      'country.bd': 'country123',
      'admin.riyadh': 'center123',
      'center.admin': 'center123',
      'admin.dhaka': 'center123',
      'dhaka.admin': 'center123',
      'admin.dubai': 'center123',
      'dubai.admin': 'center123',
      'admin.jeddah': 'center123',
      'admin.dammam': 'center123',
      'assessor01': 'assessor123',
      'assessor.lead': 'assessor123',
      'assessor.kamal': 'assessor123',
      'kamal.assessor': 'assessor123',
      'assessor.salem': 'assessor123',
      'assessor.ibrahim': 'assessor123',
      'assessor.rashid': 'assessor123',
      'support01': 'support123',
      'support.staff': 'support123',
      'staff.anowar': 'support123',
      'anowar.staff': 'support123',
      'staff.maryam': 'support123',
      'staff.abdulrahman': 'support123',
      'staff.mona': 'support123',
      'staff.hessa': 'support123',
      'staff.fatima': 'support123',
      'organizer01': 'organizer123',
      'organizer': 'organizer123',
      'organizer.jeddah': 'organizer123',
      'organizer.dubai': 'organizer123',
      'organizer.dhaka': 'organizer123',
      'cbtsupport01': 'cbt123',
      'cbt.riyadh': 'cbt123',
      'cbt.jeddah': 'cbt123',
      'cbt.dubai': 'cbt123',
      'cbt.dhaka': 'cbt123',
    };

    const expectedPass = foundUser.password || foundUser.tempPassword || demoPasswordMap[foundUser.username || ''] || 
      (foundUser.role === 'GLOBAL_ADMIN' || foundUser.role === 'SUPER_ADMIN' ? 'admin123' :
       foundUser.role === 'COUNTRY_ADMIN' || foundUser.role === 'COUNTRY_ACCOUNT' ? 'country123' :
       foundUser.role === 'CENTER_ADMIN' ? 'center123' :
       foundUser.role === 'ASSESSOR' ? 'Demo@12345' :
       foundUser.role === 'ORGANIZER' ? 'organizer123' :
       foundUser.role === 'CBT_TEST_SUPPORT' ? 'cbt123' : 'support123');

    const isValidPassword = 
      cleanPass === expectedPass ||
      (foundUser.password && cleanPass === foundUser.password) ||
      (foundUser.tempPassword && cleanPass === foundUser.tempPassword) ||
      cleanPass === 'admin123' ||
      cleanPass === 'country123' ||
      cleanPass === 'Demo@12345' ||
      (foundUser.role === 'ASSESSOR' && cleanPass === 'assessor123');

    if (cleanPass && !isValidPassword) {
      AuditService.log('LOGIN', 'AUTH', `Incorrect password entered for account ${foundUser.email}`, foundUser.id, 'FAILURE');
      return false;
    }

    const updatedUser: User = {
      ...foundUser,
      lastLogin: new Date().toISOString()
    };
    
    setUser(updatedUser);
    StorageService.set(STORAGE_KEYS.AUTH, updatedUser);
    StorageService.updateItem(STORAGE_KEYS.USERS, updatedUser);

    AuditService.log('LOGIN', 'AUTH', `User ${updatedUser.name} (${updatedUser.role}) signed in successfully.`);
    return true;
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
    // Map role equivalents for demo switching
    const roleMatches = (userRole: Role, targetRole: Role) => {
      if (userRole === targetRole) return true;
      if ((targetRole === 'GLOBAL_ADMIN' || targetRole === 'SUPER_ADMIN') && (userRole === 'GLOBAL_ADMIN' || userRole === 'SUPER_ADMIN')) return true;
      if ((targetRole === 'COUNTRY_ADMIN' || targetRole === 'COUNTRY_ACCOUNT') && (userRole === 'COUNTRY_ADMIN' || userRole === 'COUNTRY_ACCOUNT')) return true;
      return false;
    };

    // If the current user is assigned to a specific center, prioritize matching within the same center
    const matchingUser = 
      (user?.centerId ? users.find(u => roleMatches(u.role, role) && u.centerId === user.centerId && u.status === 'ACTIVE') : null) ||
      users.find(u => roleMatches(u.role, role) && u.status === 'ACTIVE');
    if (matchingUser) {
      setUser(matchingUser);
      StorageService.set(STORAGE_KEYS.AUTH, matchingUser);
      AuditService.log('LOGIN', 'AUTH', `Switched active session to profile: ${matchingUser.name} (${role})`);
      showToast(`Switched active profile to ${role.replace('_', ' ')} (${matchingUser.name})`, 'success');
    } else {
      showToast(`No active demo account found for role ${role}`, 'warning');
    }
  };

  const hasRole = (allowedRoles: Role[]): boolean => {
    return SecurityService.hasRole(user, allowedRoles);
  };

  const hasPermission = (permission: Permission): boolean => {
    return SecurityService.hasPermission(user, permission);
  };

  const checkScope = (targetCountryId?: string, targetCenterId?: string): boolean => {
    return SecurityService.isScopeAllowed(user, targetCountryId, targetCenterId);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      switchRole,
      hasRole,
      hasPermission,
      checkScope,
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
