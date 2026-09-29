import React, { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fadedIn, setFadedIn] = useState(false);

  useEffect(() => {
    // Fade in animation
    const t1 = setTimeout(() => setFadedIn(true), 80);
    // Transition after 2.2 seconds (matching Flutter splash_screen.dart: 2200ms)
    const t2 = setTimeout(() => onFinish(), 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black select-none">
      <div
        className={`flex flex-col items-center transition-all duration-700 ease-out transform ${
          fadedIn ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Teal gradient badge with graduation cap */}
        <div className="w-[140px] h-[140px] rounded-[32px] bg-gradient-to-b from-[#10A37F] to-[#1A7F64] shadow-[0_0_30px_rgba(16,163,127,0.35)] flex items-center justify-center">
          <GraduationCap className="w-[68px] h-[68px] text-white" strokeWidth={1.8} />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-wide text-white">
          CBMU Assistant
        </h1>
        <p className="mt-2 text-xs tracking-wider text-neutral-400">
          Mangalore University
        </p>

        {/* Circular spinner */}
        <div className="mt-10">
          <div className="w-[22px] h-[22px] border-[2.4px] border-[#10A37F]/30 border-t-[#10A37F] rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
};
