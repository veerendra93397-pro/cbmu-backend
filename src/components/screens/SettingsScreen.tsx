import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Info, Moon, Sun, Monitor } from 'lucide-react';
import { ThemeMode, BackgroundTheme } from '../../types';
import { storage } from '../../services/storage';

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
  const [bgTheme, setBgTheme] = useState<BackgroundTheme>(() => storage.getSettings().backgroundTheme);

  useEffect(() => {
    const handleUpdate = () => {
      setBgTheme(storage.getSettings().backgroundTheme);
    };
    window.addEventListener('cbmu_data_updated', handleUpdate);
    return () => window.removeEventListener('cbmu_data_updated', handleUpdate);
  }, []);

  const handleSelectBg = (themeKey: BackgroundTheme) => {
    setBgTheme(themeKey);
    storage.saveSettings({ backgroundTheme: themeKey });
  };

  const bgOptions: Array<{ key: BackgroundTheme; name: string; preview: string }> = [
    { key: 'default', name: 'Default Onyx', preview: 'bg-black border-neutral-700' },
    { key: 'emerald', name: 'Mangalore Emerald', preview: 'bg-gradient-to-br from-[#041a12] to-[#010906] border-emerald-500/50' },
    { key: 'navy', name: 'Midnight Navy', preview: 'bg-gradient-to-br from-[#061226] to-[#02070e] border-blue-500/50' },
    { key: 'slate', name: 'Graphite Slate', preview: 'bg-gradient-to-br from-[#0f1722] to-[#070a0e] border-slate-500/50' },
    { key: 'mesh', name: 'Campus Aura Mesh', preview: 'bg-[#080d0b] border-emerald-400/50' },
  ];

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
            Appearance & Mode
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => onThemeChange('dark')}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] hover:border-neutral-700 rounded-xl p-3.5 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-neutral-300" />
                <span className="font-medium text-sm text-white">Dark Mode</span>
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
                <span className="font-medium text-sm text-white">Light Mode</span>
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

        {/* Background Atmosphere & Wallpaper */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              App Background Atmosphere
            </h3>
            <span className="text-[10px] text-emerald-400 uppercase font-mono">{bgTheme}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {bgOptions.map((opt) => {
              const isSelected = bgTheme === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectBg(opt.key)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50'
                      : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`w-5 h-5 rounded-md border ${opt.preview}`} />
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <span className="text-xs font-semibold text-white block">{opt.name}</span>
                </button>
              );
            })}
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
