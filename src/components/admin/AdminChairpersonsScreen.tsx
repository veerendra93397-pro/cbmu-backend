import React, { useState } from 'react';
import { ArrowLeft, UserCheck, Edit3, X } from 'lucide-react';
import { storage } from '../../services/storage';
import { CampusEntity } from '../../types';

interface AdminChairpersonsScreenProps {
  onBack: () => void;
}

export const AdminChairpersonsScreen: React.FC<AdminChairpersonsScreenProps> = ({ onBack }) => {
  const [departments, setDepartments] = useState<Record<string, CampusEntity>>(() => storage.getDepartments());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [chairText, setChairText] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Sync latest from backend on mount and listen to changes
  React.useEffect(() => {
    const refresh = () => setDepartments(storage.getDepartments());
    storage.syncDepartmentsFromBackend().then(latest => setDepartments(latest));
    window.addEventListener('cbmu_data_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cbmu_data_updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStartEdit = (key: string, current: string) => {
    setEditingKey(key);
    setChairText(current);
  };

  const handleSave = () => {
    if (!editingKey) return;
    const updated = { ...departments };
    const current = updated[editingKey];
    if (current) {
      updated[editingKey] = {
        ...current,
        chairperson: chairText.trim(),
        last_verified: 'admin-edited',
      };
      setDepartments(updated);
      storage.saveDepartments(updated);
      showToast(`Updated chairperson for "${current.name}"`);
    }
    setEditingKey(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent text-white">
      {/* Header */}
      <div className="h-14 px-4 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-[#2A2A2A] text-white transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-base leading-none">Chairpersons & Heads</h2>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Auto-synced</span>
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">Quick Chairperson Manager • saves to backend in background</p>
        </div>
      </div>

      {toast && (
        <div className="bg-[#10A37F] text-white text-xs font-semibold px-4 py-2 text-center animate-in slide-in-from-top">
          {toast}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-w-2xl mx-auto w-full">
        {Object.entries(departments).map(([key, d]) => {
          const person = d.chairperson || d.person || '';
          const hasChair = person.trim().length > 0;
          const unconfirmed = person.toLowerCase().includes('unconfirmed');

          return (
            <div
              key={key}
              onClick={() => handleStartEdit(key, person)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-neutral-700 rounded-xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  hasChair && !unconfirmed ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
                }`}>
                  <UserCheck className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-white truncate">{d.name}</h4>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {hasChair ? person : 'Not set / unconfirmed'}
                  </p>
                </div>
              </div>

              <Edit3 className="w-4 h-4 text-neutral-500 shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">
                {departments[editingKey]?.name}
              </h3>
              <button onClick={() => setEditingKey(null)} className="p-1 rounded-lg hover:bg-[#2A2A2A] text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium">Chairperson / Head of Department</label>
              <input
                type="text"
                autoFocus
                value={chairText}
                onChange={(e) => setChairText(e.target.value)}
                placeholder="Dr. / Prof. Full Name"
                className="w-full mt-1.5 px-3.5 py-2.5 bg-[#222222] border border-[#333333] rounded-xl text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-neutral-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-[#10A37F]/20"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
