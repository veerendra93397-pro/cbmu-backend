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
  Plus
} from 'lucide-react';
import { storage } from '../../services/storage';

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

  const loadData = () => {
    const depts = storage.getDepartments();
    const fees = storage.getFees();
    const notices = storage.getNotices();

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

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      {/* Header */}
      <div className="h-14 px-4 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-[#2A2A2A] text-white transition-colors"
            title="Back to App"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-base">Admin Dashboard</h2>
            <p className="text-[11px] text-neutral-400">Campus Records & Directory</p>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-2xl mx-auto w-full">
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
