import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { storage } from '../../services/storage';
import { getApiUrl } from '../../services/apiConfig';

interface AdminLoginScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onSuccess, onBack }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = password.trim();

    if (!clean) {
      setError('Please enter admin password');
      return;
    }

    setLoading(true);
    setError(null);

    // 1. Check local validated passwords
    if (storage.validateAdminPassword(clean)) {
      storage.setAdminToken('admin_token_' + Date.now());
      // Sync login with backend
      fetch(getApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clean }),
      }).catch(() => {});

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 300);
      return;
    }

    // 2. Check backend login
    try {
      const res = await fetch(getApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clean }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        storage.setAdminToken(data.token || 'admin_token_' + Date.now());
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 300);
        return;
      }
    } catch {
      // Backend error or offline
    } finally {
      setLoading(false);
    }

    setError('Incorrect password. Please try again.');
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent text-neutral-900 dark:text-white select-none transition-colors">
      {/* Top Header */}
      <div className="h-14 px-4 bg-white/70 dark:bg-[#1A1A1A]/70 backdrop-blur-md border-b border-neutral-200 dark:border-[#2A2A2A] flex items-center justify-between transition-colors">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#2A2A2A] transition-colors cursor-pointer text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Chat</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-[#1A1A1A] border border-neutral-200 dark:border-[#2A2A2A] rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6 transition-colors">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Login successful! Opening dashboard...</span>
              </div>
            )}

            {/* Password Field with Show/Hide toggle */}
            <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus
                  disabled={loading || success}
                  placeholder="Enter admin password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-neutral-50 dark:bg-black/50 border border-neutral-300 dark:border-[#2A2A2A] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 transition-colors disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging In...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
