import React, { useState } from 'react';
import { ArrowLeft, MapPin, Edit3, X } from 'lucide-react';
import { storage } from '../../services/storage';
import { CampusEntity } from '../../types';

interface AdminBuildingsScreenProps {
  onBack: () => void;
}

export const AdminBuildingsScreen: React.FC<AdminBuildingsScreenProps> = ({ onBack }) => {
  const [departments, setDepartments] = useState<Record<string, CampusEntity>>(() => storage.getDepartments());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [locationText, setLocationText] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStartEdit = (key: string, current: string) => {
    setEditingKey(key);
    setLocationText(current);
  };

  const handleSave = () => {
    if (!editingKey) return;
    const updated = { ...departments };
    const current = updated[editingKey];
    if (current) {
      updated[editingKey] = {
        ...current,
        location: locationText.trim(),
        last_verified: 'admin-edited',
      };
      setDepartments(updated);
      storage.saveDepartments(updated);
      showToast(`Updated building location for "${current.name}"`);
    }
    setEditingKey(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
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
          <h2 className="font-semibold text-base">Buildings & Locations</h2>
          <p className="text-[11px] text-neutral-400">Campus Facilities Location Editor</p>
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
          const loc = (d.location || '').trim();
          const hasLocation = loc.length > 0;

          return (
            <div
              key={key}
              onClick={() => handleStartEdit(key, loc)}
              className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-neutral-700 rounded-xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  hasLocation ? 'bg-[#10A37F]/15 text-[#10A37F]' : 'bg-red-500/15 text-red-400'
                }`}>
                  <MapPin className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-white truncate">{d.name}</h4>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {hasLocation ? loc : 'No building location assigned yet'}
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
              <label className="text-xs text-neutral-400 font-medium">Building / Campus Location</label>
              <input
                type="text"
                autoFocus
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="e.g. Science Block, 2nd Floor, Room 204"
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
