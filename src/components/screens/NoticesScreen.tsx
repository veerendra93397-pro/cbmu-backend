import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Bell, 
  ExternalLink, 
  FileEdit, 
  Receipt, 
  UserCheck, 
  Palmtree, 
  Calendar, 
  Megaphone,
  Sparkles,
  RotateCw
} from 'lucide-react';
import { storage } from '../../services/storage';
import { Notice } from '../../types';
import { aiService } from '../../services/aiService';

interface NoticesScreenProps {
  onBack: () => void;
  onRefreshBadge: () => void;
}

export const NoticesScreen: React.FC<NoticesScreenProps> = ({ onBack, onRefreshBadge }) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  useEffect(() => {
    const list = storage.getNotices();
    // Sort newest first
    const sorted = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    setNotices(sorted);
    // Mark as read
    storage.markNoticesSeen(sorted);
    onRefreshBadge();

    // Fetch latest from backend
    storage.syncNoticesFromBackend().then(latest => {
      const sortedLatest = [...latest].sort((a, b) => b.created_at.localeCompare(a.created_at));
      setNotices(sortedLatest);
      storage.markNoticesSeen(sortedLatest);
      onRefreshBadge();
    });
  }, [onRefreshBadge]);

  const handleSummarizeNotice = async (notice: Notice) => {
    if (summaries[notice.id]) {
      // Toggle off if already generated
      setSummaries(prev => {
        const next = { ...prev };
        delete next[notice.id];
        return next;
      });
      return;
    }

    setSummarizingId(notice.id);
    try {
      const summaryText = await aiService.summarizeNotice(notice.title, notice.body || '', 'en');
      setSummaries(prev => ({ ...prev, [notice.id]: summaryText }));
    } catch {
      setSummaries(prev => ({ 
        ...prev, 
        [notice.id]: '⚠️ AI summary could not be retrieved at this moment.' 
      }));
    } finally {
      setSummarizingId(null);
    }
  };

  const categoryConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    exam: { label: 'EXAM', color: 'text-red-400', bg: 'bg-red-400/15', icon: <FileEdit className="w-3.5 h-3.5" /> },
    fee: { label: 'FEE', color: 'text-amber-400', bg: 'bg-amber-400/15', icon: <Receipt className="w-3.5 h-3.5" /> },
    admission: { label: 'ADMISSION', color: 'text-blue-400', bg: 'bg-blue-400/15', icon: <UserCheck className="w-3.5 h-3.5" /> },
    holiday: { label: 'HOLIDAY', color: 'text-purple-400', bg: 'bg-purple-400/15', icon: <Palmtree className="w-3.5 h-3.5" /> },
    event: { label: 'EVENT', color: 'text-pink-400', bg: 'bg-pink-400/15', icon: <Calendar className="w-3.5 h-3.5" /> },
    general: { label: 'GENERAL', color: 'text-emerald-400', bg: 'bg-emerald-400/15', icon: <Megaphone className="w-3.5 h-3.5" /> },
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso.substring(0, 10);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent text-white">
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
            <h2 className="font-semibold text-base">Notices</h2>
            <p className="text-[11px] text-neutral-400">University Announcements</p>
          </div>
        </div>
      </div>

      {/* Notices List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-w-xl mx-auto w-full">
        {notices.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Bell className="w-12 h-12 text-[#10A37F] mb-3" />
            <h4 className="text-base font-semibold text-white">No notices yet</h4>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs">
              New announcements from the university office will appear here.
            </p>
          </div>
        ) : (
          notices.map((n) => {
            const config = categoryConfig[n.category] || categoryConfig['general'];
            return (
              <div
                key={n.id}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4.5 space-y-2.5 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${config.bg} ${config.color}`}>
                    {config.icon}
                    <span>{config.label}</span>
                  </div>
                  <span className="text-xs text-neutral-400">{formatDate(n.created_at)}</span>
                </div>

                <h3 className="font-bold text-base text-white leading-snug">{n.title}</h3>

                {n.body && (
                  <p className="text-xs text-neutral-300 leading-relaxed">{n.body}</p>
                )}

                {/* Actions Row */}
                <div className="pt-2 flex items-center justify-between border-t border-[#252525]">
                  <button
                    type="button"
                    onClick={() => handleSummarizeNotice(n)}
                    disabled={summarizingId === n.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#242424] hover:bg-[#2E2E2E] border border-[#10A37F]/30 text-xs font-semibold text-emerald-400 transition-colors"
                  >
                    {summarizingId === n.id ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{summaries[n.id] ? 'Hide AI Summary' : 'AI Summary'}</span>
                  </button>

                  {n.link && (
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10A37F] hover:underline"
                    >
                      <span>View details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* AI Summary Card */}
                {summaries[n.id] && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs space-y-1.5 text-neutral-200 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-[11px] uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      <span>AI Key Takeaways</span>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed text-neutral-300">
                      {summaries[n.id]}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
