import { CampusEntity, CourseFee, Notice, ThemeMode, Message, Language } from '../types';
import { DEFAULT_CAMPUS_DATA, DEFAULT_COURSE_FEES, DEFAULT_NOTICES } from '../data/campusData';

const DEPARTMENTS_KEY = 'cbmu_departments';
const FEES_KEY = 'cbmu_fees';
const NOTICES_KEY = 'cbmu_notices';
const CHAT_HISTORY_KEY = 'chat_history';
const THEME_KEY = 'app_theme_mode';
const LANG_KEY = 'app_lang';
const ADMIN_TOKEN_KEY = 'admin_token';
const NOTICES_LAST_SEEN_KEY = 'notices_last_seen';

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
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    return { ...DEFAULT_CAMPUS_DATA };
  },

  saveDepartments(departments: Record<string, CampusEntity>): void {
    try {
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
    } catch {
      // ignore
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

  saveFees(fees: Record<string, CourseFee>): void {
    try {
      localStorage.setItem(FEES_KEY, JSON.stringify(fees));
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

  saveNotices(notices: Notice[]): void {
    try {
      localStorage.setItem(NOTICES_KEY, JSON.stringify(notices));
    } catch {
      // ignore
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
