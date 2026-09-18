import { AuditAction, AuditLog, Role } from '../types';
import { StorageService, STORAGE_KEYS } from './storageService';

export class AuditService {
  static getLogs(): AuditLog[] {
    return StorageService.get<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
  }

  static getLogsForCenter(centerId: string): AuditLog[] {
    const all = this.getLogs();
    return all.filter(l => l.centerId === centerId);
  }

  static log(
    action: AuditAction, 
    entity: string, 
    details: string, 
    entityId?: string, 
    status: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
    userOverride?: { id: string; name: string; role: Role; centerId?: string; countryId?: string },
    metadata?: { ipAddress?: string; deviceInfo?: string; browserInfo?: string; osInfo?: string }
  ): void {
    const authUser = userOverride || StorageService.get<{ id: string; name: string; role: Role; centerId?: string; countryId?: string } | null>(STORAGE_KEYS.AUTH, null);
    
    // Prototype device / browser telemetry simulation (strictly transparent prototype data per Section 19)
    const simulatedDevice = metadata?.deviceInfo || (typeof navigator !== 'undefined' && /Mobile|Android/i.test(navigator.userAgent) ? 'Tablet / Mobile Station' : 'Dedicated Desktop Workstation (Dell OptiPlex 7090)');
    const simulatedBrowser = metadata?.browserInfo || (typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Chrome') ? 'Google Chrome (Kiosk Mode v124)' : 'Enterprise Secure Browser') : 'Chrome 124 (Certified)');
    const simulatedOs = metadata?.osInfo || (typeof navigator !== 'undefined' && navigator.platform ? navigator.platform : 'Windows 11 Enterprise (ISO SECURE)');

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
      ipAddress: metadata?.ipAddress || (authUser?.role === 'SUPER_ADMIN' ? '10.0.4.12' : (authUser?.centerId === 'ctr-sa-2' ? '172.16.20.15' : '192.168.1.10')),
      deviceInfo: simulatedDevice,
      browserInfo: simulatedBrowser,
      osInfo: simulatedOs,
      timestamp: new Date().toISOString(),
      status
    };

    const currentLogs = this.getLogs();
    // Keep most recent 250 logs
    const updated = [newLog, ...currentLogs].slice(0, 250);
    StorageService.set(STORAGE_KEYS.AUDIT, updated);
  }
}
