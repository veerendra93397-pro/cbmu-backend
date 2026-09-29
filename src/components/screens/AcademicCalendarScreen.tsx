import React from 'react';
import { ArrowLeft, Calendar, ExternalLink, School } from 'lucide-react';

interface AcademicCalendarScreenProps {
  onBack: () => void;
  onAskBot?: (query: string) => void;
}

export const AcademicCalendarScreen: React.FC<AcademicCalendarScreenProps> = ({ onBack, onAskBot }) => {
  const notificationsUrl = "https://mangaloreuniversity.ac.in";

  const handleOpenOfficial = () => {
    window.open(notificationsUrl, '_blank', 'noopener,noreferrer');
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
        <h2 className="font-semibold text-base">Academic Calendar</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 max-w-xl mx-auto w-full">
        <div className="flex flex-col items-start pt-2">
          <div className="w-14 h-14 rounded-2xl bg-[#10A37F]/15 flex items-center justify-center mb-5">
            <Calendar className="w-8 h-8 text-[#10A37F]" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            Exact dates aren't shown here
          </h3>

          <p className="text-neutral-400 text-sm leading-relaxed mb-6">
            Semester start/end dates, examination schedules, and holidays change every academic year and vary by faculty and program. Rather than show dates that could be outdated or unverified, this directs you straight to the university's official notifications portal — always the most authoritative source.
          </p>

          <button
            onClick={handleOpenOfficial}
            className="w-full flex items-center justify-center gap-2.5 bg-[#10A37F] hover:bg-[#1A7F64] active:scale-[0.98] text-white font-medium py-3.5 px-5 rounded-xl transition-all shadow-lg shadow-[#10A37F]/20 mb-4"
          >
            <ExternalLink className="w-5 h-5" />
            <span>Open Official Notifications Page</span>
          </button>

          <div className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-start gap-3 mt-2">
            <School className="w-5 h-5 text-[#10A37F] shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-300 leading-relaxed">
              <p>
                <strong>Tip:</strong> Ask the CBMU Assistant directly for fee deadlines, MCA/MBA exams, or circulars — it links to the specific current PDF notifications directly.
              </p>
              {onAskBot && (
                <button
                  onClick={() => onAskBot("exam notification and fees")}
                  className="mt-2 text-[#10A37F] hover:underline font-semibold block"
                >
                  Ask about current exams →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
