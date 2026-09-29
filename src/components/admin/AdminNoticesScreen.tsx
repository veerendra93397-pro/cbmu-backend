import React, { useState } from 'react';
import { ArrowLeft, Plus, Megaphone, Trash2, X } from 'lucide-react';
import { storage } from '../../services/storage';
import { Notice } from '../../types';

interface AdminNoticesScreenProps {
  onBack: () => void;
}

export const AdminNoticesScreen: React.FC<AdminNoticesScreenProps> = ({ onBack }) => {
  const [notices, setNotices] = useState<Notice[]>(() => storage.getNotices());
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Notice['category']>('general');
  const [link, setLink] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = (id: string, noticeTitle: string) => {
    if (window.confirm(`Delete notice "${noticeTitle}"?`)) {
      const updated = notices.filter(n => n.id !== id);
      setNotices(updated);
      storage.saveNotices(updated);
      showToast("Notice deleted");
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("A title is required");
      return;
    }

    const newNotice: Notice = {
      id: "notice-" + Date.now(),
      title: title.trim(),
      body: body.trim() || undefined,
      category,
      link: link.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    const updated = [newNotice, ...notices];
    setNotices(updated);
    storage.saveNotices(updated);
    showToast("Notice published");
    setIsAdding(false);
    setTitle('');
    setBody('');
    setCategory('general');
    setLink('');
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
            <h2 className="font-semibold text-base">Notices Management</h2>
            <p className="text-[11px] text-neutral-400">{notices.length} active announcements</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-semibold rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Post</span>
        </button>
      </div>

      {toast && (
        <div className="bg-[#10A37F] text-white text-xs font-semibold px-4 py-2 text-center animate-in slide-in-from-top">
          {toast}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-w-2xl mx-auto w-full">
        {notices.map((n) => (
          <div
            key={n.id}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3.5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <Megaphone className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-white truncate">{n.title}</h4>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  <span className="uppercase font-semibold text-[#10A37F]">{n.category}</span> · {n.created_at.substring(0, 10)}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleDelete(n.id, n.title)}
              className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form onSubmit={handlePublish} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Post Campus Notice</h3>
              <button type="button" onClick={() => setIsAdding(false)} className="p-1 rounded-lg hover:bg-[#2A2A2A] text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium">Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notice headline"
                className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Notice['category'])}
                className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F]"
              >
                <option value="general">General</option>
                <option value="exam">Exam</option>
                <option value="fee">Fee</option>
                <option value="admission">Admission</option>
                <option value="holiday">Holiday</option>
                <option value="event">Event</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium">Details (optional)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Notice description or summary..."
                className="w-full mt-1 px-3 py-2 bg-[#222222] border border-[#333333] rounded-lg text-sm text-white focus:outline-hidden focus:border-[#10A37F] resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-medium">Link to official circular PDF (optional)</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://mangaloreuniversity.ac.in/..."
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
                Publish Notice
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
