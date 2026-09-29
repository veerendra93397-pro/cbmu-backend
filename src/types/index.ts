export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  time: string; // ISO date string
  isError?: boolean;
}

export interface CampusEntity {
  key: string;
  name: string;
  name_kn?: string;
  location?: string;
  directions?: string;
  aliases?: string[];
  chairperson?: string;
  chairperson_source?: string;
  person?: string;
  contact?: string;
  fee_note?: string;
  last_verified?: string;
  verified?: boolean;
  note?: string;
  departments_here?: string[];
  timings?: string;
  lat?: number | null;
  lng?: number | null;
  image_url?: string;
  image_attribution?: string;
}

export interface CourseFee {
  key: string;
  label: string;
  year: string;
  pdf: string;
  pdf_label: string;
  note?: string | null;
}

export interface Notice {
  id: string;
  title: string;
  body?: string;
  category: 'general' | 'exam' | 'fee' | 'admission' | 'holiday' | 'event';
  link?: string;
  created_at: string;
}

export type ThemeMode = 'dark' | 'light' | 'system';
export type Language = 'en' | 'kn';
export type BackgroundTheme = 'default' | 'emerald' | 'navy' | 'slate' | 'mesh';

export interface AppSettings {
  backgroundTheme: BackgroundTheme;
  customBackgroundUrl?: string;
  campusName: string;
}

export interface StringsDict {
  appBarTitle: string;
  hint: string;
  clearTitle: string;
  clearBody: string;
  cancel: string;
  delete: string;
  emptyTitle: string;
  emptySubtitle: string;
  thinking: string;
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  goodNight: string;
  welcomeSuffix: string;
  serverError: string;
  timeoutError: string;
  connectionError: string;
  retry: string;
  copied: string;
  noMaps: string;
  openMaps: string;
  voiceListening: string;
  voiceUnsupported: string;
  voicePermissionDenied: string;
  voiceStop: string;
  voiceStart: string;
  searchHistory: string;
  searchPlaceholder: string;
  noSearchResults: string;
  searchResultsCount: string;
  exportChat: string;
  exportText: string;
  exportPdf: string;
}
