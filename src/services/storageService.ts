import { 
  DEMO_USERS, DEMO_COUNTRIES, DEMO_CENTERS, DEMO_BATCHES, 
  DEMO_SCHEDULES, DEMO_CANDIDATES, DEMO_TASKS, DEMO_WORKSHEETS,
  DEMO_TASK_ALLOCATIONS, DEMO_ASSESSOR_LOTTERY, DEMO_TASK_LOTTERY,
  DEMO_ASSESSMENTS, DEMO_RESULTS, DEMO_NOTIFICATIONS, DEMO_AUDIT_LOGS,
  DEMO_COMPLAINTS, DEMO_LIVE_ACTIVITY, DEMO_APRO_CONFIG, DEMO_SERIAL_CONFIG,
  DEMO_ASSESSMENT_SETTINGS, DEMO_IDCARD_CONFIG, DEMO_RESERVATIONS,
  DEMO_EVALUATION_RATINGS, DEMO_EVALUATION_SHEETS, DEMO_VARIANCE_RECORDS
} from './demoData';
import { SystemSettings } from '../types';

export const STORAGE_KEYS = {
  USERS: 'skillassess360_users',
  COUNTRIES: 'skillassess360_countries',
  CENTERS: 'skillassess360_centers',
  SCHEDULES: 'skillassess360_schedules',
  BATCHES: 'skillassess360_batches',
  CANDIDATES: 'skillassess360_candidates',
  RESERVATIONS: 'skillassess360_reservations',
  ASSESSMENTS: 'skillassess360_assessments',
  TASKS: 'skillassess360_tasks',
  PRACTICAL_TASKS: 'skillassess360_tasks',
  WORKSHEETS: 'skillassess360_worksheets',
  TASK_ALLOCATIONS: 'skillassess360_task_allocations',
  PASSPORT_VERIFICATIONS: 'skillassess360_passport_verifications',
  CANDIDATE_PHOTOS: 'skillassess360_candidate_photos',
  CANDIDATE_EXITS: 'skillassess360_candidate_exits',
  ASSESSOR_LOTTERY: 'skillassess360_assessor_lottery',
  TASK_LOTTERY: 'skillassess360_task_lottery',
  RESULTS: 'skillassess360_results',
  EVALUATION_RATINGS: 'skillassess360_evaluation_ratings',
  EVALUATION_SHEETS: 'skillassess360_evaluation_sheets',
  VARIANCE_RECORDS: 'skillassess360_variance_records',
  NOTIFICATIONS: 'skillassess360_notifications',
  AUDIT: 'skillassess360_audit',
  AUDIT_LOGS: 'skillassess360_audit',
  COMPLAINTS: 'skillassess360_complaints',
  LIVE_ACTIVITY: 'skillassess360_live_activity',
  CONFIG_APRO: 'skillassess360_config_apro',
  CONFIG_SERIAL: 'skillassess360_config_serial',
  CONFIG_ASSESSMENT: 'skillassess360_config_assessment',
  CONFIG_IDCARD: 'skillassess360_config_idcard',
  CONFIG_TASKS: 'skillassess360_config_tasks',
  CONFIG_NOTIFICATIONS: 'skillassess360_config_notifications',
  SETTINGS: 'skillassess360_settings',
  AUTH: 'skillassess360_auth',
  LANG: 'skillassess360_lang',
} as const;

export class StorageService {
  private static _memoryStore: Map<string, string> = new Map();

  /**
   * Safely retrieve item with memory cache read-through and malformed data handling
   */
  static get<T>(key: string, defaultValue: T): T {
    try {
      // 1. Check in-memory store first (always reflects the most recent session state)
      if (this._memoryStore.has(key)) {
        const memoryVal = this._memoryStore.get(key);
        if (memoryVal !== undefined) {
          return JSON.parse(memoryVal) as T;
        }
      }

      // 2. Read through to localStorage if not yet cached in memory
      if (typeof localStorage === 'undefined') {
        return defaultValue;
      }
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        return defaultValue;
      }

      // Cache in memory store
      this._memoryStore.set(key, raw);
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[storageService] Error reading/parsing key "${key}". Falling back to default.`, err);
      return defaultValue;
    }
  }

  /**
   * Safely write item to localStorage with write-through memory store & quota recovery
   */
  static set<T>(key: string, value: T): boolean {
    const serialized = JSON.stringify(value);
    this._memoryStore.set(key, serialized);

    try {
      if (typeof localStorage === 'undefined') {
        return true;
      }
      localStorage.setItem(key, serialized);
      return true;
    } catch (err) {
      console.warn(`[storageService] Storage quota or write issue for key "${key}". Running auto-recovery...`, err);
      try {
        // Prune transient and bulky collections to free up localStorage quota
        const auditLogs = this.get<any[]>(STORAGE_KEYS.AUDIT, []);
        if (auditLogs.length > 25) {
          const trimmedAudit = JSON.stringify(auditLogs.slice(0, 25));
          this._memoryStore.set(STORAGE_KEYS.AUDIT, trimmedAudit);
          localStorage.setItem(STORAGE_KEYS.AUDIT, trimmedAudit);
        }
        const liveActivity = this.get<any[]>(STORAGE_KEYS.LIVE_ACTIVITY, []);
        if (liveActivity.length > 15) {
          const trimmedActivity = JSON.stringify(liveActivity.slice(0, 15));
          this._memoryStore.set(STORAGE_KEYS.LIVE_ACTIVITY, trimmedActivity);
          localStorage.setItem(STORAGE_KEYS.LIVE_ACTIVITY, trimmedActivity);
        }
        const notifications = this.get<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
        if (notifications.length > 15) {
          const trimmedNotifications = JSON.stringify(notifications.slice(0, 15));
          this._memoryStore.set(STORAGE_KEYS.NOTIFICATIONS, trimmedNotifications);
          localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, trimmedNotifications);
        }
        const photos = this.get<any[]>(STORAGE_KEYS.CANDIDATE_PHOTOS, []);
        if (photos.length > 25) {
          const trimmedPhotos = JSON.stringify(photos.slice(0, 25));
          this._memoryStore.set(STORAGE_KEYS.CANDIDATE_PHOTOS, trimmedPhotos);
          localStorage.setItem(STORAGE_KEYS.CANDIDATE_PHOTOS, trimmedPhotos);
        }
        // Retry writing key to localStorage
        localStorage.setItem(key, serialized);
        return true;
      } catch (retryErr) {
        console.warn(`[storageService] Persistent storage full. Retaining in active session memory store for "${key}".`, retryErr);
        // Stored reliably in _memoryStore, returning true to prevent breaking user workflow
        return true;
      }
    }
  }

  /**
   * Update or append an item in an array-based collection
   */
  static updateItem<T extends { id: string }>(key: string, item: T): boolean {
    try {
      const list = this.get<T[]>(key, []);
      const index = list.findIndex(i => i.id === item.id);
      if (index >= 0) {
        list[index] = item;
      } else {
        list.unshift(item);
      }
      return this.set(key, list);
    } catch (err) {
      console.error(`[storageService] Error updating item in key "${key}".`, err);
      return false;
    }
  }

  /**
   * Remove an item by id from an array-based collection
   */
  static removeItem<T extends { id: string }>(key: string, id: string): void {
    const list = this.get<T[]>(key, []);
    const filtered = list.filter(i => i.id !== id);
    this.set(key, filtered);
  }

  /**
   * Remove a whole key or clear entire skillassess360 namespaces
   */
  static clear(key?: string): void {
    if (key) {
      this._memoryStore.delete(key);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch {}
    } else {
      this._memoryStore.clear();
      try {
        if (typeof localStorage !== 'undefined') {
          Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
        }
      } catch {}
    }
  }

  /**
   * Check whether key exists in localStorage
   */
  static hasKey(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Helper to ensure all predefined demo items exist in storage without wiping custom user records
   */
  private static ensurePredefinedItems<T extends { id: string; email?: string }>(
    key: string,
    demoItems: T[],
    checkEmail = false
  ): void {
    if (!this.hasKey(key)) {
      this.set(key, demoItems);
      return;
    }
    const current = this.get<T[]>(key, []);
    if (!Array.isArray(current) || current.length === 0) {
      this.set(key, demoItems);
      return;
    }
    const currentIds = new Set(current.map(i => i.id));
    const currentEmails = checkEmail
      ? new Set(current.filter(i => i.email).map(i => i.email!.trim().toLowerCase()))
      : null;

    let hasChange = false;
    const merged = [...current];

    for (const item of demoItems) {
      const idExists = currentIds.has(item.id);
      const emailExists = checkEmail && item.email && currentEmails?.has(item.email.trim().toLowerCase());
      if (!idExists && !emailExists) {
        merged.push(item);
        currentIds.add(item.id);
        if (checkEmail && item.email) currentEmails?.add(item.email.trim().toLowerCase());
        hasChange = true;
      }
    }

    if (hasChange) {
      this.set(key, merged);
    }
  }

  /**
   * Initialize demo data, ensuring missing demo items are merged into existing storage
   */
  static initializeDemoData(): void {
    this.ensurePredefinedItems(STORAGE_KEYS.USERS, DEMO_USERS, true);
    this.ensurePredefinedItems(STORAGE_KEYS.COUNTRIES, DEMO_COUNTRIES);
    this.ensurePredefinedItems(STORAGE_KEYS.CENTERS, DEMO_CENTERS);
    this.ensurePredefinedItems(STORAGE_KEYS.BATCHES, DEMO_BATCHES);
    this.ensurePredefinedItems(STORAGE_KEYS.SCHEDULES, DEMO_SCHEDULES);
    this.ensurePredefinedItems(STORAGE_KEYS.CANDIDATES, DEMO_CANDIDATES);
    this.ensurePredefinedItems(STORAGE_KEYS.RESERVATIONS, DEMO_RESERVATIONS);
    this.ensurePredefinedItems(STORAGE_KEYS.TASKS, DEMO_TASKS);
    this.ensurePredefinedItems(STORAGE_KEYS.WORKSHEETS, DEMO_WORKSHEETS);
    this.ensurePredefinedItems(STORAGE_KEYS.TASK_ALLOCATIONS, DEMO_TASK_ALLOCATIONS);
    this.ensurePredefinedItems(STORAGE_KEYS.ASSESSOR_LOTTERY, DEMO_ASSESSOR_LOTTERY);
    this.ensurePredefinedItems(STORAGE_KEYS.TASK_LOTTERY, DEMO_TASK_LOTTERY);
    this.ensurePredefinedItems(STORAGE_KEYS.ASSESSMENTS, DEMO_ASSESSMENTS);
    this.ensurePredefinedItems(STORAGE_KEYS.RESULTS, DEMO_RESULTS);
    this.ensurePredefinedItems(STORAGE_KEYS.EVALUATION_RATINGS, DEMO_EVALUATION_RATINGS);
    this.ensurePredefinedItems(STORAGE_KEYS.EVALUATION_SHEETS, DEMO_EVALUATION_SHEETS);
    this.ensurePredefinedItems(STORAGE_KEYS.VARIANCE_RECORDS, DEMO_VARIANCE_RECORDS);
    this.ensurePredefinedItems(STORAGE_KEYS.COMPLAINTS, DEMO_COMPLAINTS);
    this.ensurePredefinedItems(STORAGE_KEYS.LIVE_ACTIVITY, DEMO_LIVE_ACTIVITY);

    if (!this.hasKey(STORAGE_KEYS.CONFIG_APRO)) {
      this.set(STORAGE_KEYS.CONFIG_APRO, DEMO_APRO_CONFIG);
    }
    if (!this.hasKey(STORAGE_KEYS.CONFIG_SERIAL)) {
      this.set(STORAGE_KEYS.CONFIG_SERIAL, DEMO_SERIAL_CONFIG);
    }
    if (!this.hasKey(STORAGE_KEYS.CONFIG_ASSESSMENT)) {
      this.set(STORAGE_KEYS.CONFIG_ASSESSMENT, DEMO_ASSESSMENT_SETTINGS);
    }
    if (!this.hasKey(STORAGE_KEYS.CONFIG_IDCARD)) {
      this.set(STORAGE_KEYS.CONFIG_IDCARD, DEMO_IDCARD_CONFIG);
    }
    if (!this.hasKey(STORAGE_KEYS.NOTIFICATIONS)) {
      this.set(STORAGE_KEYS.NOTIFICATIONS, DEMO_NOTIFICATIONS);
    }
    if (!this.hasKey(STORAGE_KEYS.AUDIT)) {
      this.set(STORAGE_KEYS.AUDIT, DEMO_AUDIT_LOGS);
    }
    if (!this.hasKey(STORAGE_KEYS.SETTINGS)) {
      const defaultSettings: SystemSettings = {
        language: 'en',
        notificationsEnabled: true,
        autoRefreshInterval: 30,
        compactSidebar: false
      };
      this.set(STORAGE_KEYS.SETTINGS, defaultSettings);
    }
  }

  /**
   * Reset database back to fresh demo state
   */
  static resetToDemo(): void {
    this.clear();
    this.initializeDemoData();
  }
}

export const storageService = StorageService;
export default StorageService;
