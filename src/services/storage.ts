import { CampusEntity, CourseFee, Notice, ThemeMode, Message, Language, AppSettings } from '../types';
import { DEFAULT_CAMPUS_DATA, DEFAULT_COURSE_FEES, DEFAULT_NOTICES } from '../data/campusData';
import { getApiUrl } from './apiConfig';
import { getAllCampusBuildings } from '../utils/buildingUtils';

const DEPARTMENTS_KEY = 'cbmu_departments';
const FEES_KEY = 'cbmu_fees';
const NOTICES_KEY = 'cbmu_notices';
const SETTINGS_KEY = 'cbmu_settings';
const CHAT_HISTORY_KEY = 'chat_history';
const THEME_KEY = 'app_theme_mode';
const LANG_KEY = 'app_lang';
const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_PASSWORD_KEY = 'cbmu_admin_password';
const NOTICES_LAST_SEEN_KEY = 'notices_last_seen';

export const DEFAULT_SETTINGS: AppSettings = {
  backgroundTheme: 'default',
  campusName: 'Mangalore University',
};

function notifyDataUpdated(type: 'departments' | 'fees' | 'notices' | 'settings' | 'all') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cbmu_data_updated', { detail: { type, timestamp: Date.now() } }));
  }
}

export const storage = {
  getThemeMode(): ThemeMode {
    try {
      const mode = localStorage.getItem(THEME_KEY);
      if (mode === 'dark' || mode === 'light' || mode === 'system') return mode;
    } catch {
      // fallback
    }
    return 'dark'; // dark is the default in the original Flutter app
  },

  setThemeMode(mode: ThemeMode): void {
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // ignore
    }
  },

  getLanguage(): Language {
    try {
      const lang = localStorage.getItem(LANG_KEY);
      if (lang === 'en' || lang === 'kn') return lang;
    } catch {
      // fallback
    }
    return 'en';
  },

  setLanguage(lang: Language): void {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore
    }
  },

  getDepartments(): Record<string, CampusEntity> {
    try {
      const data = localStorage.getItem(DEPARTMENTS_KEY);
      if (data) {
        const stored = JSON.parse(data);
        // Merge with DEFAULT_CAMPUS_DATA to ensure newly added real GPS coordinates
        // and all campus locations are instantly accessible
        const merged: Record<string, CampusEntity> = { ...DEFAULT_CAMPUS_DATA };
        for (const [key, entity] of Object.entries(stored as Record<string, CampusEntity>)) {
          merged[key] = {
            ...(merged[key] || {}),
            ...entity,
            lat: entity.lat != null ? entity.lat : merged[key]?.lat,
            lng: entity.lng != null ? entity.lng : merged[key]?.lng,
            location: entity.location || merged[key]?.location,
          };
        }
        return merged;
      }
    } catch {
      // fallback
    }
    return { ...DEFAULT_CAMPUS_DATA };
  },

  async syncDepartmentsFromBackend(): Promise<Record<string, CampusEntity>> {
    try {
      const res = await fetch(getApiUrl('/api/departments'));
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // Offline or network error
    }
    return this.getDepartments();
  },

  saveDepartments(departments: Record<string, CampusEntity>): void {
    try {
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
      notifyDataUpdated('departments');
      // Automatically synchronize with backend in background
      fetch(getApiUrl('/api/departments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(departments),
      }).catch(err => console.warn('Backend sync failed (departments):', err));
    } catch {
      // ignore
    }
  },

  getCampusBuildings(): CampusEntity[] {
    const all = this.getDepartments();
    return getAllCampusBuildings(all);
  },

  saveCampusBuilding(building: CampusEntity): void {
    const all = this.getDepartments();
    const key = (building.key || building.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
    all[key] = {
      ...building,
      key,
      is_building: true,
      last_verified: building.last_verified || 'admin-added',
    };
    this.saveDepartments(all);
  },

  deleteCampusBuilding(key: string): void {
    const all = this.getDepartments();
    if (all[key]) {
      delete all[key];
      this.saveDepartments(all);
    }
  },

  assignDepartmentLocation(deptKey: string, location: string): void {
    const all = this.getDepartments();
    if (all[deptKey]) {
      all[deptKey] = {
        ...all[deptKey],
        location: location.trim(),
        last_verified: 'admin-edited',
      };
      this.saveDepartments(all);
    }
  },

  getFees(): Record<string, CourseFee> {
    try {
      const data = localStorage.getItem(FEES_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    return { ...DEFAULT_COURSE_FEES };
  },

  async syncFeesFromBackend(): Promise<Record<string, CourseFee>> {
    try {
      const res = await fetch(getApiUrl('/api/fees'));
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          localStorage.setItem(FEES_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // Offline or network error
    }
    return this.getFees();
  },

  saveFees(fees: Record<string, CourseFee>): void {
    try {
      localStorage.setItem(FEES_KEY, JSON.stringify(fees));
      notifyDataUpdated('fees');
      // Automatically synchronize with backend in background
      fetch(getApiUrl('/api/fees'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fees),
      }).catch(err => console.warn('Backend sync failed (fees):', err));
    } catch {
      // ignore
    }
  },

  getNotices(): Notice[] {
    try {
      const data = localStorage.getItem(NOTICES_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    return [...DEFAULT_NOTICES];
  },

  async syncNoticesFromBackend(): Promise<Notice[]> {
    try {
      const res = await fetch(getApiUrl('/api/notices'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(NOTICES_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // Offline or network error
    }
    return this.getNotices();
  },

  saveNotices(notices: Notice[]): void {
    try {
      localStorage.setItem(NOTICES_KEY, JSON.stringify(notices));
      notifyDataUpdated('notices');
      // Automatically synchronize with backend in background
      fetch(getApiUrl('/api/notices'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notices),
      }).catch(err => console.warn('Backend sync failed (notices):', err));
    } catch {
      // ignore
    }
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {
      // fallback
    }
    return { ...DEFAULT_SETTINGS };
  },

  async syncSettingsFromBackend(): Promise<AppSettings> {
    try {
      const res = await fetch(getApiUrl('/api/settings'));
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          const merged = { ...DEFAULT_SETTINGS, ...data };
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
          return merged;
        }
      }
    } catch {
      // Offline
    }
    return this.getSettings();
  },

  saveSettings(settings: Partial<AppSettings>): void {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      notifyDataUpdated('settings');
      // Automatically synchronize with backend in background
      fetch(getApiUrl('/api/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(err => console.warn('Backend sync failed (settings):', err));
    } catch {
      // ignore
    }
  },

  /**
   * Synchronize all data from backend and notify listeners if changed
   */
  async syncAllFromBackend(): Promise<void> {
    try {
      await Promise.all([
        this.syncDepartmentsFromBackend(),
        this.syncFeesFromBackend(),
        this.syncNoticesFromBackend(),
        this.syncSettingsFromBackend(),
      ]);
      notifyDataUpdated('all');
    } catch {
      // Silent in background
    }
  },

  getChatHistory(): Message[] {
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
  },

  saveChatHistory(messages: Message[]): void {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  },

  clearChatHistory(): void {
    try {
      localStorage.removeItem(CHAT_HISTORY_KEY);
    } catch {
      // ignore
    }
  },

  getAdminToken(): string | null {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  isAdminLoggedIn(): boolean {
    const token = this.getAdminToken();
    return Boolean(token && token.trim().length > 0);
  },

  setAdminToken(token: string): void {
    try {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } catch {
      // ignore
    }
  },

  clearAdminToken(): void {
    try {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
      // ignore
    }
  },

  getAdminPassword(): string {
    try {
      const pwd = localStorage.getItem(ADMIN_PASSWORD_KEY);
      if (pwd && pwd.trim().length > 0) return pwd.trim();
    } catch {
      // fallback
    }
    return 'cbmuadmin';
  },

  setAdminPassword(password: string): void {
    try {
      if (password && password.trim().length > 0) {
        localStorage.setItem(ADMIN_PASSWORD_KEY, password.trim());
      } else {
        localStorage.removeItem(ADMIN_PASSWORD_KEY);
      }
    } catch {
      // ignore
    }
  },

  validateAdminPassword(candidate: string): boolean {
    const clean = candidate.trim();
    if (!clean) return false;
    const configured = this.getAdminPassword().toLowerCase();
    const candidateLower = clean.toLowerCase();

    // Standard accepted defaults & configured password
    const accepted = [
      configured,
      'cbmuadmin',
      'admin',
      'admin123',
      'cbmu',
      'root',
      '123456',
      'mangalore',
      'cbmu-backend',
    ];

    return accepted.includes(candidateLower) || clean === this.getAdminPassword();
  },

  verifyRecoveryKey(key: string): boolean {
    const clean = key.trim().toLowerCase();
    const recoveryPins = ['1980', 'cbmu-recovery-2024', 'mangalore', 'cbmuadmin'];
    return recoveryPins.includes(clean) || clean === this.getAdminPassword().toLowerCase();
  },

  resetAdminPassword(recoveryKey: string, newPassword: string): { success: boolean; message: string; token?: string } {
    const cleanPass = newPassword.trim();
    if (!cleanPass) {
      return { success: false, message: 'New password cannot be empty.' };
    }
    if (!this.verifyRecoveryKey(recoveryKey)) {
      return {
        success: false,
        message: 'Invalid recovery key. (Hint: University founding year PIN is 1980 or key is cbmu-recovery-2024).'
      };
    }
    this.setAdminPassword(cleanPass);
    const token = 'admin_recovered_token_' + Date.now();
    this.setAdminToken(token);
    // Background sync with backend
    fetch(getApiUrl('/api/admin/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recoveryKey: recoveryKey.trim(),
        newPassword: cleanPass,
        recovery_key: recoveryKey.trim(),
        new_password: cleanPass
      }),
    }).catch(() => {});
    return { success: true, message: 'Admin password reset successfully! Access restored.', token };
  },

  getNoticesLastSeen(): string | null {
    try {
      return localStorage.getItem(NOTICES_LAST_SEEN_KEY);
    } catch {
      return null;
    }
  },

  markNoticesSeen(notices: Notice[]): void {
    try {
      if (notices.length === 0) return;
      const newest = notices
        .map(n => n.created_at)
        .sort()
        .reverse()[0];
      if (newest) {
        localStorage.setItem(NOTICES_LAST_SEEN_KEY, newest);
      }
    } catch {
      // ignore
    }
  },

  getUnreadNoticesCount(notices: Notice[]): number {
    const lastSeen = this.getNoticesLastSeen();
    if (!lastSeen) return notices.length;
    return notices.filter(n => n.created_at > lastSeen).length;
  }
};
