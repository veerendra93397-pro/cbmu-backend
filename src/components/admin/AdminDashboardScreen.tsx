import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  LogOut, 
  Building2, 
  UserCheck, 
  Receipt, 
  MapPin, 
  Bell, 
  Clock, 
  ChevronRight,
  Plus,
  Palette,
  Check,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { storage } from '../../services/storage';
import { BackgroundTheme, AppSettings } from '../../types';

export type AdminSubScreen = 
  | 'departments' 
  | 'chairpersons' 
  | 'fees' 
  | 'buildings' 
  | 'notices';

interface AdminDashboardScreenProps {
  onBack: () => void;
  onLogout: () => void;
  onOpenSubScreen: (sub: AdminSubScreen) => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  onBack,
  onLogout,
  onOpenSubScreen,
}) => {
  const [deptCount, setDeptCount] = useState(0);
  const [chairCount, setChairCount] = useState(0);
  const [feeCount, setFeeCount] = useState(0);
  const [buildingCount, setBuildingCount] = useState(0);
  const [noticeCount, setNoticeCount] = useState(0);
  const [recentUpdates, setRecentUpdates] = useState<Array<{ name: string; tag: string }>>([]);
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');

  const loadData = () => {
    const depts = storage.getDepartments();
    const fees = storage.getFees();
    const notices = storage.getNotices();
    const currentSettings = storage.getSettings();
    setSettings(currentSettings);

    const deptValues = Object.values(depts);
    const chairpersons = deptValues.filter(d => {
      const c = d.chairperson || d.person;
      return c && c.trim().length > 0 && !c.toLowerCase().includes('unconfirmed');
    });

    const buildings = new Set(
      deptValues
        .map(d => (d.location || '').trim())
        .filter(l => l.length > 0)
    );

    const recents = deptValues
      .filter(d => (d.last_verified || '').startsWith('admin-'))
      .map(d => ({
        name: d.name || d.key,
        tag: d.last_verified === 'admin-added' ? 'Added by admin' : 'Edited by admin'
      }));

    setDeptCount(deptValues.length);
    setChairCount(chairpersons.length);
    setFeeCount(Object.keys(fees).length);
    setBuildingCount(buildings.size);
    setNoticeCount(notices.length);
    setRecentUpdates(recents);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await storage.syncAllFromBackend();
      loadData();
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleSelectBackgroundTheme = (themeKey: BackgroundTheme) => {
    storage.saveSettings({ backgroundTheme: themeKey });
    setSettings(prev => ({ ...prev, backgroundTheme: themeKey }));
  };

  useEffect(() => {
    loadData();
    storage.syncAllFromBackend().then(() => {
      loadData();
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    });

    const handleUpdate = () => {
      loadData();
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    window.addEventListener('cbmu_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('cbmu_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const backgroundThemeOptions: Array<{ key: BackgroundTheme; name: string; preview: string; desc: string }> = [
    { key: 'default', name: 'Default Onyx', preview: 'bg-black border-neutral-700', desc: 'Classic solid dark' },
    { key: 'emerald', name: 'Mangalore Emerald', preview: 'bg-gradient-to-br from-[#041a12] to-[#010906] border-emerald-500/40', desc: 'Campus university green' },
    { key: 'navy', name: 'Midnight Navy', preview: 'bg-gradient-to-br from-[#061226] to-[#02070e] border-blue-500/40', desc: 'Academic deep blue' },
    { key: 'slate', name: 'Graphite Slate', preview: 'bg-gradient-to-br from-[#0f1722] to-[#070a0e] border-slate-500/40', desc: 'Cool neutral slate' },
    { key: 'mesh', name: 'Campus Aura Mesh', preview: 'bg-[#080d0b] border-emerald-400/50', desc: 'Radiant aurora glow' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      {/* Header */}
      <div className="h-14 px-4 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-[#2A2A2A] text-white transition-colors"
            title="Back to App"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base leading-none">Admin Dashboard</h2>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Sync Active</span>
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">Campus Records & Directory Manager</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-red-500/20 text-neutral-300 hover:text-red-400 text-xs font-medium transition-colors"
          title="Log out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 max-w-2xl mx-auto w-full">
        {/* Real-time Backend & Background Sync Banner */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-[#1A1A1A] to-[#1A1A1A] border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white tracking-wide uppercase">Automatic Background Sync</h4>
                <span className="text-[10px] text-emerald-400 font-mono">● Active ({lastSyncedTime})</span>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5 line-clamp-1">
                Any changes you edit automatically save to server files and live AI assistant.
              </p>
            </div>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#252525] hover:bg-[#303030] border border-neutral-700 text-xs font-medium text-neutral-200 shrink-0 transition-colors"
            title="Force refresh data from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Sync Now</span>
          </button>
        </div>

        {/* 2x2 Stats Grid (matching Flutter GridView.count) */}
        <div className="grid grid-cols-2 gap-3.5">
          <button
            onClick={() => onOpenSubScreen('departments')}
            className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#10A37F]/50 rounded-2xl p-4.5 flex flex-col justify-between text-left transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#10A37F]/15 flex items-center justify-center text-[#10A37F] mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white tracking-tight">{deptCount}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-neutral-400 font-medium">Departments</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
            </div>
          </button>

          <button
            onClick={() => onOpenSubScreen('chairpersons')}
            className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-blue-500/50 rounded-2xl p-4.5 flex flex-col justify-between text-left transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white tracking-tight">{chairCount}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-neutral-400 font-medium">Chairpersons</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
            </div>
          </button>

          <button
            onClick={() => onOpenSubScreen('fees')}
            className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-amber-500/50 rounded-2xl p-4.5 flex flex-col justify-between text-left transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 mb-3">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white tracking-tight">{feeCount}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-neutral-400 font-medium">Fees</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
            </div>
          </button>

          <button
            onClick={() => onOpenSubScreen('buildings')}
            className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-red-500/50 rounded-2xl p-4.5 flex flex-col justify-between text-left transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400 mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white tracking-tight">{buildingCount}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-neutral-400 font-medium">Buildings</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
            </div>
          </button>
        </div>

        {/* App & Background Theme Manager */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Palette className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">App Background Theme</h4>
                <p className="text-xs text-neutral-400">Controls background atmosphere across all user portals</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              {settings.backgroundTheme}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {backgroundThemeOptions.map((opt) => {
              const isSelected = settings.backgroundTheme === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectBackgroundTheme(opt.key)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50'
                      : 'border-[#2A2A2A] bg-[#222222] hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`w-5 h-5 rounded-md border ${opt.preview}`} />
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-xs font-semibold text-white leading-tight">{opt.name}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notices Quick Action Banner */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Campus Notices ({noticeCount})</h4>
              <p className="text-xs text-neutral-400">Post announcements and deadlines</p>
            </div>
          </div>
          <button
            onClick={() => onOpenSubScreen('notices')}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#2A2A2A] hover:bg-[#10A37F] text-neutral-200 hover:text-white text-xs font-semibold rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage</span>
          </button>
        </div>

        {/* Recent Updates */}
        <div>
          <h3 className="text-sm font-bold text-neutral-200 mb-2.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#10A37F]" />
            <span>Recent Updates</span>
          </h3>

          {recentUpdates.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 text-center">
              <p className="text-xs text-neutral-400">
                No admin edits yet — changes you make to departments, fees, chairpersons, or buildings will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentUpdates.map((u, i) => (
                <div
                  key={i}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3.5 flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-white">{u.name}</span>
                  <span className="text-xs text-[#10A37F] font-semibold">{u.tag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
