import React, { useState } from 'react';
import { ArrowLeft, Plus, Receipt, Edit3, Trash2, X } from 'lucide-react';
import { storage } from '../../services/storage';
import { CourseFee } from '../../types';

interface AdminFeesScreenProps {
  onBack: () => void;
}

export const AdminFeesScreen: React.FC<AdminFeesScreenProps> = ({ onBack }) => {
  const [fees, setFees] = useState<Record<string, CourseFee>>(() => storage.getFees());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Sync latest from backend on mount and listen to changes
  React.useEffect(() => {
    const refresh = () => setFees(storage.getFees());
    storage.syncFeesFromBackend().then(latest => setFees(latest));
    window.addEventListener('cbmu_data_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cbmu_data_updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Edit fields
  const [editLabel, setEditLabel] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editPdf, setEditPdf] = useState('');
  const [editPdfLabel, setEditPdfLabel] = useState('');
  const [editNote, setEditNote] = useState('');

  // Add fields
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newPdf, setNewPdf] = useState('');
  const [newPdfLabel, setNewPdfLabel] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStartEdit = (key: string, fee: CourseFee) => {
    setEditingKey(key);
    setEditLabel(fee.label);
    setEditYear(fee.year);
    setEditPdf(fee.pdf);
    setEditPdfLabel(fee.pdf_label);
    setEditNote(fee.note || '');
  };

  const handleSaveEdit = () => {
    if (!editingKey) return;
    const updated = { ...fees };
    updated[editingKey] = {
      key: editingKey,
      label: editLabel.trim(),
      year: editYear.trim(),
      pdf: editPdf.trim(),
      pdf_label: editPdfLabel.trim(),
      note: editNote.trim() || null,
    };
    setFees(updated);
    storage.saveFees(updated);
    showToast(`Updated fee for "${editLabel}"`);
    setEditingKey(null);
  };

  const handleDelete = (key: string) => {
    const target = fees[key];
    if (window.confirm(`Delete fee structure for "${target?.label || key}"?`)) {
      const updated = { ...fees };
      delete updated[key];
      setFees(updated);
      storage.saveFees(updated);
      showToast("Fee entry deleted");
      setEditingKey(null);
    }
  };

  const handleAddFee = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newKey.trim().toLowerCase();
    const cleanLabel = newLabel.trim();
    if (!cleanKey || !cleanLabel) {
      alert("Key and label are required");
      return;
    }

    const updated = { ...fees };
    updated[cleanKey] = {
      key: cleanKey,
      label: cleanLabel,
      year: newYear.trim() || '2026-27',
      pdf: newPdf.trim() || 'https://mangaloreuniversity.ac.in',
      pdf_label: newPdfLabel.trim() || cleanLabel + ' Fee Circular',
    };
    setFees(updated);
    storage.saveFees(updated);
    showToast(`Added fee entry for "${cleanLabel}"`);
    setIsAdding(false);
    setNewKey('');
    setNewLabel('');
    setNewYear('');
    setNewPdf('');
    setNewPdfLabel('');
  };

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      {/* Header */}
      <div className="h-14 px-4 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-[#2A2A2A] text-white transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base leading-none">Course Fees</h2>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Auto-synced</span>
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">{Object.keys(fees).length} structures • automatically persists to backend</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-semibold rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      {toast && (
        <div className="bg-[#10A37F] text-white text-xs font-semibold px-4 py-2 text-center animate-in slide-in-from-top">
          {toast}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-w-2xl mx-auto w-full">
        {Object.entries(fees).map(([key, f]) => (
          <div
            key={key}
            onClick={() => handleStartEdit(key, f)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-neutral-700 rounded-xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <Receipt className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-white truncate">{f.label}</h4>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  Academic Year: {f.year} · {f.pdf_label}
                </p>
              </div>
            </div>

            <Edit3 className="w-4 h-4 text-neutral-500 shrink-0" />
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Edit Fee Structure</h3>
              <button onClick={() => setEditingKey(null)} className="p-1 rounded-lg hover:bg-[#2A2A2A] text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 font-medium">Program Label</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 font-medium">Academic Year</label>
                <input
                  type="text"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  placeholder="e.g. 2025-26"
                  className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 font-medium">Official PDF Link</label>
                <input
                  type="text"
                  value={editPdf}
                  onChange={(e) => setEditPdf(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 font-medium">PDF Display Title</label>
                <input
                  type="text"
                  value={editPdfLabel}
                  onChange={(e) => setEditPdfLabel(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 font-medium">Special Note (optional)</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleDelete(editingKey)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium py-2 px-3 rounded-lg hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingKey(null)}
                  className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-neutral-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-semibold rounded-xl"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form onSubmit={handleAddFee} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Add New Fee Structure</h3>
              <button type="button" onClick={() => setIsAdding(false)} className="p-1 rounded-lg hover:bg-[#2A2A2A] text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium">Internal Key (e.g. "bca", "msc") *</label>
              <input
                type="text"
                required
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="bca"
                className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium">Program Label *</label>
              <input
                type="text"
                required
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="BCA (Bachelor of Computer Applications)"
                className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium">Academic Year</label>
              <input
                type="text"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                placeholder="2026-27"
                className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium">PDF URL</label>
              <input
                type="text"
                value={newPdf}
                onChange={(e) => setNewPdf(e.target.value)}
                placeholder="https://..."
                className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium">PDF Title</label>
              <input
                type="text"
                value={newPdfLabel}
                onChange={(e) => setNewPdfLabel(e.target.value)}
                placeholder="Fee Structure Notification"
                className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-neutral-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-semibold rounded-xl"
              >
                Add Fee
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
