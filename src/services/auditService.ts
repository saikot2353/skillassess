import { AuditAction, AuditLog, Role } from '../types';
import { StorageService, STORAGE_KEYS } from './storageService';

export class AuditService {
  static getLogs(): AuditLog[] {
    return StorageService.get<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
  }

  static log(
    action: AuditAction, 
    entity: string, 
    details: string, 
    entityId?: string, 
    status: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
    userOverride?: { id: string; name: string; role: Role; centerId?: string; countryId?: string }
  ): void {
    const authUser = userOverride || StorageService.get<{ id: string; name: string; role: Role; centerId?: string; countryId?: string } | null>(STORAGE_KEYS.AUTH, null);
    
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: authUser?.id || 'sys-anon',
      userName: authUser?.name || 'System / Unauthenticated',
      role: authUser?.role || 'SUPER_ADMIN',
      countryId: authUser?.countryId,
      centerId: authUser?.centerId,
      action,
      entity,
      entityId,
      details,
      ipAddress: '192.168.1.10',
      timestamp: new Date().toISOString(),
      status
    };

    const currentLogs = this.getLogs();
    // Keep most recent 200 logs
    const updated = [newLog, ...currentLogs].slice(0, 200);
    StorageService.set(STORAGE_KEYS.AUDIT, updated);
  }
}
