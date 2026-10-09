import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ChevronRight, 
  Info, 
  Moon, 
  Sun, 
  Monitor, 
  Server, 
  Zap, 
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { ThemeMode, BackgroundTheme } from '../../types';
import { storage } from '../../services/storage';
import { aiService, ProviderStatus } from '../../services/aiService';
import { getApiBaseUrl, setBackendUrl, getApiUrl, CBMU_BACKEND_RENDER_URL } from '../../services/apiConfig';

interface SettingsScreenProps {
  currentTheme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onNavigateAbout: () => void;
  onNavigateAdmin?: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentTheme,
  onThemeChange,
  onNavigateAbout,
  onNavigateAdmin,
  onBack,
}) => {
  const [bgTheme, setBgTheme] = useState<BackgroundTheme>(() => storage.getSettings().backgroundTheme);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [backendUrlInput, setBackendUrlInput] = useState<string>(() => getApiBaseUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Admin access settings
  const [adminPasswordInput, setAdminPasswordInput] = useState(() => storage.getAdminPassword());
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [passwordSavedNotice, setPasswordSavedNotice] = useState(false);

  // Groq API Key settings
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [isSavingGroqKey, setIsSavingGroqKey] = useState(false);
  const [groqKeySaveResult, setGroqKeySaveResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setBgTheme(storage.getSettings().backgroundTheme);
    };
    window.addEventListener('cbmu_data_updated', handleUpdate);
    return () => window.removeEventListener('cbmu_data_updated', handleUpdate);
  }, []);

  useEffect(() => {
    loadProviderStatus();
  }, []);

  const loadProviderStatus = async () => {
    try {
      const status = await aiService.getProviderStatus();
      setProviderStatus(status);
    } catch {
      // fallback
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const healthRes = await fetch(getApiUrl('/api/health'));
      if (healthRes.ok) {
        const data = await healthRes.json();
        
        // If Groq is configured, test the actual Groq API key live
        if (data.groqConfigured) {
          const groqTest = await aiService.testGroqConnection();
          if (groqTest.success) {
            setTestResult({
              success: true,
              message: `✅ Groq Server Connected & Verified! LLaMA 3.3 70B is active. (Port: ${data.port || 3000})`,
            });
          } else {
            setTestResult({
              success: false,
              message: `⚠️ Server is online, but Groq API key was rejected (HTTP 401): ${groqTest.message}. Please generate a new key at console.groq.com/keys and update your .env or Render Environment Variables. Campus knowledge engine is active.`,
            });
          }
        } else {
          setTestResult({
            success: true,
            message: `✅ Backend Connected (Ready for GROQ_API_KEY). Campus Knowledge Engine active on port ${data.port || 3000}.`,
          });
        }
      } else {
        setTestResult({
          success: false,
          message: `Server returned status ${healthRes.status}. Check backend deployment.`,
        });
      }
      await loadProviderStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Could not reach server. Verify URL or network status.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveBackendUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setBackendUrl(backendUrlInput);
    setSavedSuccess(true);
    setTestResult(null);
    setTimeout(() => setSavedSuccess(false), 2500);
    handleTestConnection();
  };

  const handleResetBackendUrl = () => {
    setBackendUrl('');
    setBackendUrlInput('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    handleTestConnection();
  };

  const handleSaveGroqKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = groqKeyInput.trim();
    if (!clean) return;
    setIsSavingGroqKey(true);
    setGroqKeySaveResult(null);
    try {
      const res = await aiService.saveGroqKey(clean);
      setGroqKeySaveResult(res);
      if (res.success) {
        setGroqKeyInput('');
        await loadProviderStatus();
        await handleTestConnection();
      }
    } catch (err: any) {
      setGroqKeySaveResult({ success: false, message: err?.message || 'Failed to save Groq key' });
    } finally {
      setIsSavingGroqKey(false);
    }
  };

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

        {/* Backend Server & AI Engine Status (Render & Groq) */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Backend Server & AI Engine
            </h3>
            <span className="text-[10px] text-emerald-400 uppercase font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {providerStatus?.activeProvider === 'groq' ? 'Groq Active' : 'Online'}
            </span>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 space-y-4">
            {/* Active AI Status Pill */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-[#2A2A2A]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Active AI Engine</div>
                  <div className="text-[11px] text-neutral-400">
                    {providerStatus?.modelName || 'Detecting engine...'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {providerStatus?.groqKeyStatus === 'invalid' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    Groq Key Invalid (401)
                  </span>
                ) : providerStatus?.groqConfigured ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Groq LLaMA 3.3
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Campus Engine
                  </span>
                )}
              </div>
            </div>

            {/* Backend Server URL Configuration */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Backend Server URL <span className="text-neutral-500 font-normal">({!backendUrlInput ? 'Integrated Server' : 'Custom / Render'})</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetBackendUrl}
                    className={`text-[11px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      !backendUrlInput
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                    title="Use fast integrated server with full admin login & instant chat"
                  >
                    ⚡ Integrated
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBackendUrlInput(CBMU_BACKEND_RENDER_URL);
                      setBackendUrl(CBMU_BACKEND_RENDER_URL);
                      setSavedSuccess(true);
                      setTimeout(() => setSavedSuccess(false), 2500);
                      handleTestConnection();
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 font-mono ${
                      backendUrlInput === CBMU_BACKEND_RENDER_URL
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                    title="Connect directly to https://cbmu-backend.onrender.com"
                  >
                    <Server className="w-3 h-3" /> Render
                  </button>
                </div>
              </div>
              <form onSubmit={handleSaveBackendUrl} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={backendUrlInput}
                    onChange={(e) => setBackendUrlInput(e.target.value)}
                    placeholder="Same-Origin Integrated Server (default)"
                    className="flex-1 bg-black/50 border border-[#2A2A2A] focus:border-emerald-500 focus:outline-hidden rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                  {backendUrlInput && (
                    <button
                      type="button"
                      onClick={handleResetBackendUrl}
                      className="px-2.5 py-2 bg-[#2A2A2A] hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      title="Reset to default integrated server"
                    >
                      Reset
                    </button>
                  )}
                </div>
                {savedSuccess && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {!backendUrlInput ? 'Switched to Integrated Server!' : 'Backend URL updated successfully!'}
                  </p>
                )}
              </form>
            </div>

            {/* Groq API Key Configuration */}
            <div className="pt-2 border-t border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Groq API Key <span className="text-neutral-500 font-normal">(for LLaMA 3.3 70B AI)</span>
                </label>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition-colors"
                >
                  <KeyRound className="w-3 h-3" /> Get Free Groq Key
                </a>
              </div>
              <form onSubmit={handleSaveGroqKey} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showGroqKey ? 'text' : 'password'}
                      value={groqKeyInput}
                      onChange={(e) => setGroqKeyInput(e.target.value)}
                      placeholder="Paste new key (e.g. gsk_...)"
                      className="w-full bg-black/50 border border-[#2A2A2A] focus:border-emerald-500 focus:outline-hidden rounded-lg px-3 py-2 pr-9 text-xs text-white placeholder-neutral-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqKey(!showGroqKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                      title={showGroqKey ? 'Hide key' : 'Show key'}
                    >
                      {showGroqKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingGroqKey || !groqKeyInput.trim()}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {isSavingGroqKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save & Test
                  </button>
                </div>
                {groqKeySaveResult && (
                  <p className={`text-[11px] flex items-center gap-1 ${groqKeySaveResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {groqKeySaveResult.success ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
                    {groqKeySaveResult.message}
                  </p>
                )}
              </form>
            </div>

            {/* Test Connection Button */}
            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full py-2.5 px-3 bg-[#242424] hover:bg-[#2d2d2d] border border-[#333] rounded-lg text-xs font-medium text-neutral-200 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-400' : ''}`} />
                {isTesting ? 'Testing Server Connection...' : 'Test Backend & AI Connection'}
              </button>

              {testResult && (
                <div className={`p-2.5 rounded-lg text-xs border ${
                  testResult.success 
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-950/30 border-red-500/30 text-red-300'
                }`}>
                  {testResult.message}
                </div>
              )}
            </div>

            {/* Render Deployment Tips */}
            <div className="p-3 bg-black/30 rounded-lg border border-[#222] text-[11px] text-neutral-400 space-y-1.5">
              <div className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                Render Configuration: cbmu-backend
              </div>
              <p>
                • <strong>Active Service:</strong> Your live backend is <strong className="text-emerald-400">cbmu-backend</strong> (Python 3, Singapore) hosted on <code className="text-white">https://cbmu-backend.onrender.com</code>.
              </p>
              <p>
                • <strong>Unused Service:</strong> You can safely delete or suspend <code className="text-neutral-500">cbmu-campus-assistant</code> in Render dashboard as all chat, fees, departments, and notices are served directly by <strong className="text-white">cbmu-backend</strong>.
              </p>
              <p>
                • <strong>Groq AI Engine:</strong> LLaMA 3.3 70B is active on your Singapore server with live campus database fallback.
              </p>
            </div>
          </div>
        </div>

        {/* Admin & Staff Portal */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1 mb-2.5 flex items-center justify-between">
            <span>Staff / Administrator Portal</span>
            <span className="text-[10px] text-neutral-400 font-normal">
              {storage.isAdminLoggedIn() ? 'Active Session' : 'Password Protected'}
            </span>
          </h3>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 space-y-4">
            {onNavigateAdmin && (
              <button
                type="button"
                onClick={onNavigateAdmin}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{storage.isAdminLoggedIn() ? 'Open Admin Dashboard' : 'Staff Portal Login'}</span>
              </button>
            )}

            {/* Configure Custom Admin Password */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Admin Password <span className="text-neutral-500 font-normal">(Default: cbmuadmin)</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Enter admin password (e.g. cbmuadmin)"
                    className="w-full pl-9 pr-14 py-2 bg-[#121212] border border-[#2E2E2E] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#10A37F] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                    title={showAdminPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 cursor-pointer flex items-center gap-1"
                  >
                    {showAdminPassword ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-emerald-400" />}
                    <span>{showAdminPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    storage.setAdminPassword(adminPasswordInput.trim());
                    setPasswordSavedNotice(true);
                    setTimeout(() => setPasswordSavedNotice(false), 2000);
                  }}
                  className="px-3 py-2 bg-[#252525] hover:bg-[#303030] border border-[#3A3A3A] text-white text-xs font-medium rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminPasswordInput('cbmuadmin');
                    storage.setAdminPassword('cbmuadmin');
                    setPasswordSavedNotice(true);
                    setTimeout(() => setPasswordSavedNotice(false), 2000);
                  }}
                  className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Reset to default password"
                >
                  Reset
                </button>
              </div>

              {passwordSavedNotice && (
                <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Admin password saved and synced!</span>
                </p>
              )}
            </div>
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
