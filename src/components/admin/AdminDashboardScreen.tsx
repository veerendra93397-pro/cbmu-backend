import React, { useState, useEffect, useMemo } from 'react';
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
  Sparkles,
  Search,
  ExternalLink,
  Compass,
  Layers,
  Edit3,
  Trash2,
  X
} from 'lucide-react';
import { storage } from '../../services/storage';
import { BackgroundTheme, AppSettings, CampusEntity } from '../../types';
import { getAllCampusBuildings, getBuildingDepartments } from '../../utils/buildingUtils';

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
  const [departmentsMap, setDepartmentsMap] = useState<Record<string, CampusEntity>>(() => storage.getDepartments());
  const [deptCount, setDeptCount] = useState(0);
  const [chairCount, setChairCount] = useState(0);
  const [feeCount, setFeeCount] = useState(0);
  const [buildingCount, setBuildingCount] = useState(0);
  const [noticeCount, setNoticeCount] = useState(0);
  const [recentUpdates, setRecentUpdates] = useState<Array<{ name: string; tag: string }>>([]);
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');

  // Campus Buildings state in dashboard
  const [buildings, setBuildings] = useState<CampusEntity[]>([]);
  const [buildingSearch, setBuildingSearch] = useState('');
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<CampusEntity | null>(null);

  // Building form fields
  const [bName, setBName] = useState('');
  const [bNameKn, setBNameKn] = useState('');
  const [bLocation, setBLocation] = useState('');
  const [bLat, setBLat] = useState('12.81661');
  const [bLng, setBLng] = useState('74.92405');
  const [bDirections, setBDirections] = useState('');
  const [bDepartments, setBDepartments] = useState('');
  const [dashboardToast, setDashboardToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setDashboardToast(msg);
    setTimeout(() => setDashboardToast(null), 3000);
  };

  const loadData = () => {
    const depts = storage.getDepartments();
    const fees = storage.getFees();
    const notices = storage.getNotices();
    const currentSettings = storage.getSettings();
    setDepartmentsMap(depts);
    setSettings(currentSettings);

    const deptValues = Object.values(depts);
    const chairpersons = deptValues.filter(d => {
      const c = d.chairperson || d.person;
      return c && c.trim().length > 0 && !c.toLowerCase().includes('unconfirmed');
    });

    const campusBuildings = getAllCampusBuildings(depts);
    setBuildings(campusBuildings);

    const recents = deptValues
      .filter(d => (d.last_verified || '').startsWith('admin-'))
      .map(d => ({
        name: d.name || d.key,
        tag: d.last_verified === 'admin-added' ? 'Added by admin' : 'Edited by admin'
      }));

    setDeptCount(deptValues.length);
    setChairCount(chairpersons.length);
    setFeeCount(Object.keys(fees).length);
    setBuildingCount(campusBuildings.length);
    setNoticeCount(notices.length);
    setRecentUpdates(recents);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await storage.syncAllFromBackend();
      loadData();
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast('Live synchronization complete');
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleSelectBackgroundTheme = (themeKey: BackgroundTheme) => {
    storage.saveSettings({ backgroundTheme: themeKey });
    setSettings(prev => ({ ...prev, backgroundTheme: themeKey }));
  };

  // Add / Edit Building from Dashboard
  const handleOpenAddBuildingModal = () => {
    setEditingBuilding(null);
    setBName('');
    setBNameKn('');
    setBLocation('Mangalore University Campus, Konaje');
    setBLat('12.81661');
    setBLng('74.92405');
    setBDirections('');
    setBDepartments('');
    setBuildingModalOpen(true);
  };

  const handleOpenEditBuildingModal = (b: CampusEntity) => {
    setEditingBuilding(b);
    setBName(b.name);
    setBNameKn(b.name_kn || '');
    setBLocation(b.location || '');
    setBLat(b.lat != null ? String(b.lat) : '12.81661');
    setBLng(b.lng != null ? String(b.lng) : '74.92405');
    setBDirections(b.directions || '');
    const depts = getBuildingDepartments(b, departmentsMap);
    setBDepartments(depts.join(', '));
    setBuildingModalOpen(true);
  };

  const handleSaveBuilding = () => {
    if (!bName.trim()) {
      alert('Building Name is required');
      return;
    }

    const key = editingBuilding?.key || bName.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim();
    const parsedLat = parseFloat(bLat.trim());
    const parsedLng = parseFloat(bLng.trim());

    const deptArray = bDepartments
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const updated = { ...departmentsMap };
    const existing = updated[key] || {};

    updated[key] = {
      ...existing,
      key,
      name: bName.trim(),
      name_kn: bNameKn.trim() || undefined,
      location: bLocation.trim() || undefined,
      lat: !isNaN(parsedLat) ? parsedLat : 12.81661,
      lng: !isNaN(parsedLng) ? parsedLng : 74.92405,
      directions: bDirections.trim() || undefined,
      departments_here: deptArray.length > 0 ? deptArray : undefined,
      is_building: true,
      last_verified: editingBuilding ? 'admin-edited' : 'admin-added',
      verified: true,
    };

    storage.saveDepartments(updated);
    setDepartmentsMap(updated);
    setBuildingModalOpen(false);
    loadData();
    showToast(editingBuilding ? `Updated "${bName}"` : `Added new building "${bName}"`);
  };

  const handleDeleteBuilding = (key: string, name: string) => {
    if (!confirm(`Are you sure you want to remove building "${name}"?`)) return;

    const updated = { ...departmentsMap };
    delete updated[key];
    storage.saveDepartments(updated);
    setDepartmentsMap(updated);
    if (editingBuilding?.key === key) {
      setBuildingModalOpen(false);
    }
    loadData();
    showToast(`Removed building "${name}"`);
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

  // Filtered buildings for dashboard directory
  const filteredBuildings = useMemo(() => {
    const q = buildingSearch.trim().toLowerCase();
    if (!q) return buildings;
    return buildings.filter(b => 
      b.name.toLowerCase().includes(q) ||
      (b.name_kn && b.name_kn.toLowerCase().includes(q)) ||
      (b.location && b.location.toLowerCase().includes(q)) ||
      (b.departments_here && b.departments_here.some(d => d.toLowerCase().includes(q)))
    );
  }, [buildings, buildingSearch]);

  const backgroundThemeOptions: Array<{ key: BackgroundTheme; name: string; preview: string; desc: string }> = [
    { key: 'default', name: 'Default Onyx', preview: 'bg-black border-neutral-700', desc: 'Classic solid dark' },
    { key: 'emerald', name: 'Mangalore Emerald', preview: 'bg-gradient-to-br from-[#041a12] to-[#010906] border-emerald-500/40', desc: 'Campus university green' },
    { key: 'navy', name: 'Midnight Navy', preview: 'bg-gradient-to-br from-[#061226] to-[#02070e] border-blue-500/40', desc: 'Academic deep blue' },
    { key: 'slate', name: 'Graphite Slate', preview: 'bg-gradient-to-br from-[#0f1722] to-[#070a0e] border-slate-500/40', desc: 'Cool neutral slate' },
    { key: 'mesh', name: 'Campus Aura Mesh', preview: 'bg-[#080d0b] border-emerald-400/50', desc: 'Radiant aurora glow' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-transparent text-white">
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
            <p className="text-[11px] text-neutral-400 mt-0.5">Campus Records, Buildings & Directory Manager</p>
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

      {dashboardToast && (
        <div className="bg-[#10A37F] text-white text-xs font-semibold px-4 py-2 text-center animate-in slide-in-from-top shrink-0">
          {dashboardToast}
        </div>
      )}

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
            className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-emerald-500/50 rounded-2xl p-4.5 flex flex-col justify-between text-left transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3">
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

        {/* ==================================================================== */}
        {/* CAMPUS BUILDINGS & BLOCKS DIRECTORY SECTION (Explicitly added in Dashboard) */}
        {/* ==================================================================== */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4.5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Campus Building Names & Blocks</h3>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                    {buildings.length} Registered
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Official university building names, academic complexes & GPS locations</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOpenAddBuildingModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                title="Add new building name"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Building</span>
              </button>
              <button
                onClick={() => onOpenSubScreen('buildings')}
                className="px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-neutral-200 text-xs font-medium rounded-xl border border-neutral-700 transition-colors"
                title="Manage all buildings and department assignments"
              >
                Manage All
              </button>
            </div>
          </div>

          {/* Real-time search building names */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={buildingSearch}
              onChange={(e) => setBuildingSearch(e.target.value)}
              placeholder="Search building names (e.g. Science Block, Central Library, MBA Block)..."
              className="w-full pl-9 pr-9 py-2 bg-[#222222] border border-[#333333] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#10A37F] transition-colors"
            />
            {buildingSearch && (
              <button
                onClick={() => setBuildingSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Building Names List / Cards */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredBuildings.length === 0 ? (
              <div className="bg-[#202020] border border-neutral-800 rounded-xl p-5 text-center space-y-2">
                <p className="text-xs text-neutral-400">
                  No buildings found matching &quot;{buildingSearch}&quot;.
                </p>
                <button
                  onClick={handleOpenAddBuildingModal}
                  className="px-3.5 py-1.5 bg-[#10A37F] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add as New Building</span>
                </button>
              </div>
            ) : (
              filteredBuildings.map((b) => {
                const deptsHoused = getBuildingDepartments(b, departmentsMap);
                const hasGps = b.lat != null && b.lng != null;

                return (
                  <div
                    key={b.key}
                    className="bg-[#202020] border border-neutral-800/80 hover:border-neutral-700 rounded-xl p-3 flex flex-col gap-2 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-xs text-white leading-tight">
                              {b.name}
                            </h4>
                            {b.name_kn && (
                              <span className="text-[10px] text-emerald-400/90 font-medium">
                                ({b.name_kn})
                              </span>
                            )}
                          </div>
                          {b.location && (
                            <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                              📍 {b.location}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditBuildingModal(b)}
                          className="p-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#353535] text-neutral-300 hover:text-white transition-colors"
                          title="Edit building name & info"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {hasGps && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=walking`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#353535] text-neutral-300 hover:text-emerald-400 transition-colors"
                            title="Open in Maps"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteBuilding(b.key, b.name)}
                          className="p-1.5 rounded-lg bg-[#2a2a2a] hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                          title="Delete building"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata: Coordinates & Departments preview */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-400 border-t border-neutral-800/60 pt-1.5">
                      {hasGps && (
                        <span className="inline-flex items-center gap-1 font-mono text-neutral-300">
                          <Compass className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{b.lat?.toFixed(5)}, {b.lng?.toFixed(5)}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-neutral-400">
                        <Layers className="w-2.5 h-2.5 text-blue-400" />
                        <span>{deptsHoused.length} department(s) located here</span>
                      </span>
                    </div>

                    {deptsHoused.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deptsHoused.slice(0, 4).map((dName, i) => (
                          <span
                            key={i}
                            className="text-[9px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded-md"
                          >
                            {dName}
                          </span>
                        ))}
                        {deptsHoused.length > 4 && (
                          <span className="text-[9px] text-neutral-500 px-1 py-0.5">
                            +{deptsHoused.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
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

      {/* ==================================================================== */}
      {/* ADD / EDIT BUILDING MODAL DIRECTLY IN DASHBOARD */}
      {/* ==================================================================== */}
      {buildingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#10A37F]/15 text-[#10A37F] flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingBuilding ? 'Edit Campus Building' : 'Add New Building Name'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">Registered campus building directory</p>
                </div>
              </div>
              <button
                onClick={() => setBuildingModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#2A2A2A] text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Building Name (English) *
                </label>
                <input
                  type="text"
                  autoFocus
                  value={bName}
                  onChange={(e) => setBName(e.target.value)}
                  placeholder="e.g. Science Block or MBA Block"
                  className="w-full px-3.5 py-2.5 bg-[#222222] border border-[#333333] rounded-xl text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Building Name (Kannada - ಕನ್ನಡ)
                </label>
                <input
                  type="text"
                  value={bNameKn}
                  onChange={(e) => setBNameKn(e.target.value)}
                  placeholder="e.g. ವಿಜ್ಞಾನ ಬ್ಲಾಕ್ ಅಥವಾ ಎಂಬಿಎ ಬ್ಲಾಕ್"
                  className="w-full px-3.5 py-2.5 bg-[#222222] border border-[#333333] rounded-xl text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Campus Zone / Complex
                </label>
                <input
                  type="text"
                  value={bLocation}
                  onChange={(e) => setBLocation(e.target.value)}
                  placeholder="e.g. Faculty of Science Complex, Konaje"
                  className="w-full px-3.5 py-2.5 bg-[#222222] border border-[#333333] rounded-xl text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">
                    GPS Latitude
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={bLat}
                    onChange={(e) => setBLat(e.target.value)}
                    placeholder="12.81685"
                    className="w-full px-3.5 py-2 bg-[#222222] border border-[#333333] rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-[#10A37F]"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">
                    GPS Longitude
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={bLng}
                    onChange={(e) => setBLng(e.target.value)}
                    placeholder="74.92306"
                    className="w-full px-3.5 py-2 bg-[#222222] border border-[#333333] rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-[#10A37F]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Campus Directions & Notes
                </label>
                <textarea
                  rows={2}
                  value={bDirections}
                  onChange={(e) => setBDirections(e.target.value)}
                  placeholder="e.g. Near Library lawn, opposite Administration Block."
                  className="w-full px-3.5 py-2 bg-[#222222] border border-[#333333] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Departments / Offices Inside (comma-separated)
                </label>
                <input
                  type="text"
                  value={bDepartments}
                  onChange={(e) => setBDepartments(e.target.value)}
                  placeholder="Computer Science, Physics, Chemistry..."
                  className="w-full px-3.5 py-2 bg-[#222222] border border-[#333333] rounded-xl text-xs text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]">
              {editingBuilding ? (
                <button
                  type="button"
                  onClick={() => handleDeleteBuilding(editingBuilding.key, bName)}
                  className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBuildingModalOpen(false)}
                  className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-neutral-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBuilding}
                  className="px-5 py-2 bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#10A37F]/20 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingBuilding ? 'Save Changes' : 'Add Building'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
