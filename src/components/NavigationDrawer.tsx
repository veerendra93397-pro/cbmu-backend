import React from 'react';
import { 
  X, 
  Map, 
  Bell, 
  Calendar, 
  Phone, 
  MessageSquare, 
  Settings, 
  Info, 
  ShieldCheck, 
  GraduationCap,
  Sparkles
} from 'lucide-react';

export type ScreenType = 
  | 'chat'
  | 'campus_map'
  | 'notices'
  | 'academic_calendar'
  | 'contact_us'
  | 'feedback'
  | 'settings'
  | 'about'
  | 'ai_tutor'
  | 'admin_login'
  | 'admin_dashboard';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenType) => void;
  unreadNoticesCount: number;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  unreadNoticesCount,
}) => {
  if (!isOpen) return null;

  const handleNav = (screen: ScreenType) => {
    onNavigate(screen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-[300px] max-w-[85vw] h-full bg-white dark:bg-[#1A1A1A] border-r border-slate-200 dark:border-[#2A2A2A] text-slate-900 dark:text-white flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200 transition-colors">
        {/* Drawer Header */}
        <div className="p-5 bg-slate-50 dark:bg-[#141414] border-b border-slate-200 dark:border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#10A37F] to-[#1A7F64] flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight text-slate-900 dark:text-white">CBMU Assistant</h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">Mangalore University</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#2A2A2A] text-slate-400 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Items */}
        <div className="flex-1 overflow-y-auto py-2">
          <nav className="space-y-0.5 px-2">
            <button
              onClick={() => handleNav('ai_tutor')}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 transition-colors text-left font-semibold text-sm mb-1.5"
            >
              <div className="flex items-center gap-3.5">
                <Sparkles className="w-5 h-5 text-[#10A37F]" />
                <span>AI Study Tutor</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white dark:bg-[#10A37F]/20 dark:text-emerald-300">
                New
              </span>
            </button>

            <button
              onClick={() => handleNav('campus_map')}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left font-medium text-sm"
            >
              <Map className="w-5 h-5 text-[#10A37F]" />
              <span>Campus Map</span>
            </button>

            <button
              onClick={() => handleNav('notices')}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left font-medium text-sm"
            >
              <div className="flex items-center gap-3.5">
                <Bell className="w-5 h-5 text-[#10A37F]" />
                <span>Notices & Circulars</span>
              </div>
              {unreadNoticesCount > 0 && (
                <span className="bg-[#10A37F] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {unreadNoticesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNav('academic_calendar')}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left font-medium text-sm"
            >
              <Calendar className="w-5 h-5 text-[#10A37F]" />
              <span>Academic Calendar</span>
            </button>

            <button
              onClick={() => handleNav('contact_us')}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left font-medium text-sm"
            >
              <Phone className="w-5 h-5 text-[#10A37F]" />
              <span>Contact Us</span>
            </button>

            <button
              onClick={() => handleNav('feedback')}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left font-medium text-sm"
            >
              <MessageSquare className="w-5 h-5 text-[#10A37F]" />
              <span>Feedback</span>
            </button>

            <div className="my-2 border-t border-slate-200 dark:border-[#2A2A2A]" />

            <button
              onClick={() => handleNav('settings')}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left font-medium text-sm"
            >
              <Settings className="w-5 h-5 text-slate-400 dark:text-neutral-400" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => handleNav('about')}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white transition-colors text-left font-medium text-sm"
            >
              <Info className="w-5 h-5 text-slate-400 dark:text-neutral-400" />
              <span>About</span>
            </button>

            <div className="my-2 border-t border-slate-200 dark:border-[#2A2A2A]" />

            <button
              onClick={() => handleNav('admin_login')}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-[#2A2A2A] text-slate-700 dark:text-neutral-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-left font-medium text-sm"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Admin Login</span>
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200 dark:border-[#2A2A2A] text-center text-xs text-slate-400 dark:text-neutral-500">
          CBMU Assistant v1.0.0
        </div>
      </div>
    </div>
  );
};
