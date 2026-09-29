import React from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Info, Moon, Sun, Monitor } from 'lucide-react';
import { ThemeMode } from '../../types';

interface SettingsScreenProps {
  currentTheme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onNavigateAbout: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentTheme,
  onThemeChange,
  onNavigateAbout,
  onBack,
}) => {
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
        <h2 className="font-semibold text-base">Settings</h2>
      </div>

      {/* Settings list */}
      <div className="flex-1 overflow-y-auto p-4 max-w-xl mx-auto w-full space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1 mb-2.5">
            Appearance
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => onThemeChange('dark')}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] hover:border-neutral-700 rounded-xl p-3.5 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-neutral-300" />
                <span className="font-medium text-sm text-white">Dark</span>
              </div>
              {currentTheme === 'dark' && (
                <CheckCircle2 className="w-5 h-5 text-[#10A37F]" />
              )}
            </button>

            <button
              onClick={() => onThemeChange('light')}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] hover:border-neutral-700 rounded-xl p-3.5 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5 text-neutral-300" />
                <span className="font-medium text-sm text-white">Light</span>
              </div>
              {currentTheme === 'light' && (
                <CheckCircle2 className="w-5 h-5 text-[#10A37F]" />
              )}
            </button>

            <button
              onClick={() => onThemeChange('system')}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] hover:border-neutral-700 rounded-xl p-3.5 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-neutral-300" />
                <span className="font-medium text-sm text-white">Use device setting</span>
              </div>
              {currentTheme === 'system' && (
                <CheckCircle2 className="w-5 h-5 text-[#10A37F]" />
              )}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1 mb-2.5">
            About this app
          </h3>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <button
              onClick={onNavigateAbout}
              className="w-full p-4 flex items-center justify-between hover:bg-[#222222] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-neutral-400" />
                <span className="font-medium text-sm text-white">About CBMU Assistant</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
