import React from 'react';
import { ArrowLeft, GraduationCap, Info, ExternalLink } from 'lucide-react';

interface AboutScreenProps {
  onBack: () => void;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
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
        <h2 className="font-semibold text-base">About</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 max-w-xl mx-auto w-full space-y-5">
        <div className="flex flex-col items-center justify-center pt-3 pb-1">
          <div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#10A37F] to-[#1A7F64] flex items-center justify-center shadow-lg shadow-[#10A37F]/20 mb-3.5">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">CBMU Assistant</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Version 1.0.0</p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4.5 space-y-2.5">
          <div className="flex items-center gap-2 text-[#10A37F]">
            <Info className="w-4.5 h-4.5" />
            <h4 className="font-bold text-sm text-white">Important Note</h4>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            This is an independent, unofficial student project built to help Mangalore University students find department, office, hostel, and fee information more easily. It is <strong>NOT</strong> an official app of Mangalore University and is not affiliated with or endorsed by the university administration.
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed pt-1">
            Some information (department chairpersons, phone numbers) may change as academic roles rotate. Always verify critical fee payments, admission deadlines, or official certificates directly with the university registrar office before relying upon them.
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4.5 space-y-2">
          <h4 className="font-bold text-sm text-white">Architecture & Technology</h4>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Engineered with React, TypeScript, Vite, Tailwind CSS, and Leaflet maps, featuring an offline-resilient university knowledge engine grounded in verified administrative directories and official PDF circulars.
          </p>
        </div>

        <div className="pt-2 text-center">
          <p className="text-xs text-neutral-500 mb-1.5">Official University Website</p>
          <a
            href="https://mangaloreuniversity.ac.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10A37F] hover:underline"
          >
            <span>mangaloreuniversity.ac.in</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
