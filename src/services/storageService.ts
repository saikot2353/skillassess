import { 
  DEMO_USERS, DEMO_COUNTRIES, DEMO_CENTERS, DEMO_BATCHES, 
  DEMO_SCHEDULES, DEMO_CANDIDATES, DEMO_TASKS, DEMO_WORKSHEETS,
  DEMO_TASK_ALLOCATIONS, DEMO_ASSESSOR_LOTTERY, DEMO_TASK_LOTTERY,
  DEMO_ASSESSMENTS, DEMO_RESULTS, DEMO_NOTIFICATIONS, DEMO_AUDIT_LOGS,
  DEMO_COMPLAINTS, DEMO_LIVE_ACTIVITY, DEMO_APRO_CONFIG, DEMO_SERIAL_CONFIG,
  DEMO_ASSESSMENT_SETTINGS, DEMO_IDCARD_CONFIG, DEMO_RESERVATIONS,
  DEMO_EVALUATION_RATINGS, DEMO_EVALUATION_SHEETS
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
  ASSESSOR_LOTTERY: 'skillassess360_assessor_lottery',
  TASK_LOTTERY: 'skillassess360_task_lottery',
  RESULTS: 'skillassess360_results',
  EVALUATION_RATINGS: 'skillassess360_evaluation_ratings',
  EVALUATION_SHEETS: 'skillassess360_evaluation_sheets',
  NOTIFICATIONS: 'skillassess360_notifications',
  AUDIT: 'skillassess360_audit',
  AUDIT_LOGS: 'skillassess360_audit',
  COMPLAINTS: 'skillassess360_complaints',
  LIVE_ACTIVITY: 'skillassess360_live_activity',
  CONFIG_APRO: 'skillassess360_config_apro',
  CONFIG_SERIAL: 'skillassess360_config_serial',
  CONFIG_ASSESSMENT: 'skillassess360_config_assessment',
  CONFIG_IDCARD: 'skillassess360_config_idcard',
  SETTINGS: 'skillassess360_settings',
  AUTH: 'skillassess360_auth',
  LANG: 'skillassess360_lang',
} as const;

export class StorageService {
  /**
   * Safely retrieve item from localStorage with malformed/corrupted data handling
   */
  static get<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        return defaultValue;
      }
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[storageService] Error parsing key "${key}". Falling back to default.`, err);
      return defaultValue;
    }
  }

  /**
   * Safely write item to localStorage
   */
  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[storageService] Error saving key "${key}".`, err);
    }
  }

  /**
   * Update or append an item in an array-based collection
   */
  static updateItem<T extends { id: string }>(key: string, item: T): void {
    const list = this.get<T[]>(key, []);
    const index = list.findIndex(i => i.id === item.id);
    if (index >= 0) {
      list[index] = item;
    } else {
      list.unshift(item);
    }
    this.set(key, list);
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
      localStorage.removeItem(key);
    } else {
      Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    }
  }

  /**
   * Check whether key exists in localStorage
   */
  static hasKey(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Initialize demo data without overwriting existing user data
   */
  static initializeDemoData(): void {
    if (!this.hasKey(STORAGE_KEYS.USERS)) {
      this.set(STORAGE_KEYS.USERS, DEMO_USERS);
    }
    if (!this.hasKey(STORAGE_KEYS.COUNTRIES)) {
      this.set(STORAGE_KEYS.COUNTRIES, DEMO_COUNTRIES);
    }
    if (!this.hasKey(STORAGE_KEYS.CENTERS)) {
      this.set(STORAGE_KEYS.CENTERS, DEMO_CENTERS);
    }
    if (!this.hasKey(STORAGE_KEYS.BATCHES)) {
      this.set(STORAGE_KEYS.BATCHES, DEMO_BATCHES);
    }
    if (!this.hasKey(STORAGE_KEYS.SCHEDULES)) {
      this.set(STORAGE_KEYS.SCHEDULES, DEMO_SCHEDULES);
    }
    if (!this.hasKey(STORAGE_KEYS.CANDIDATES)) {
      this.set(STORAGE_KEYS.CANDIDATES, DEMO_CANDIDATES);
    }
    if (!this.hasKey(STORAGE_KEYS.RESERVATIONS)) {
      this.set(STORAGE_KEYS.RESERVATIONS, DEMO_RESERVATIONS);
    }
    if (!this.hasKey(STORAGE_KEYS.TASKS)) {
      this.set(STORAGE_KEYS.TASKS, DEMO_TASKS);
    }
    if (!this.hasKey(STORAGE_KEYS.WORKSHEETS)) {
      this.set(STORAGE_KEYS.WORKSHEETS, DEMO_WORKSHEETS);
    }
    if (!this.hasKey(STORAGE_KEYS.TASK_ALLOCATIONS)) {
      this.set(STORAGE_KEYS.TASK_ALLOCATIONS, DEMO_TASK_ALLOCATIONS);
    }
    if (!this.hasKey(STORAGE_KEYS.ASSESSOR_LOTTERY)) {
      this.set(STORAGE_KEYS.ASSESSOR_LOTTERY, DEMO_ASSESSOR_LOTTERY);
    }
    if (!this.hasKey(STORAGE_KEYS.TASK_LOTTERY)) {
      this.set(STORAGE_KEYS.TASK_LOTTERY, DEMO_TASK_LOTTERY);
    }
    if (!this.hasKey(STORAGE_KEYS.ASSESSMENTS)) {
      this.set(STORAGE_KEYS.ASSESSMENTS, DEMO_ASSESSMENTS);
    }
    if (!this.hasKey(STORAGE_KEYS.RESULTS)) {
      this.set(STORAGE_KEYS.RESULTS, DEMO_RESULTS);
    }
    if (!this.hasKey(STORAGE_KEYS.EVALUATION_RATINGS)) {
      this.set(STORAGE_KEYS.EVALUATION_RATINGS, DEMO_EVALUATION_RATINGS);
    }
    if (!this.hasKey(STORAGE_KEYS.EVALUATION_SHEETS)) {
      this.set(STORAGE_KEYS.EVALUATION_SHEETS, DEMO_EVALUATION_SHEETS);
    }
    if (!this.hasKey(STORAGE_KEYS.COMPLAINTS)) {
      this.set(STORAGE_KEYS.COMPLAINTS, DEMO_COMPLAINTS);
    }
    if (!this.hasKey(STORAGE_KEYS.LIVE_ACTIVITY)) {
      this.set(STORAGE_KEYS.LIVE_ACTIVITY, DEMO_LIVE_ACTIVITY);
    }
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
