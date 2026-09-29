import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, KeyRound, Loader2 } from 'lucide-react';
import { storage } from '../../services/storage';

interface AdminLoginScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onSuccess, onBack }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // First try live backend login
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const res = await fetch("https://cbmu-backend.onrender.com/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: password.trim() }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          storage.setAdminToken(data.token || "admin_session_token");
          onSuccess();
          return;
        }
      } catch {
        // remote server offline or waking up; check local password
      }

      // Local fallback: default password is "cbmuadmin" or "admin123" or "admin"
      if (
        password.trim() === "cbmuadmin" ||
        password.trim() === "admin123" ||
        password.trim() === "admin"
      ) {
        storage.setAdminToken("local_admin_token_" + Date.now());
        onSuccess();
        return;
      }

      setError("Invalid password. Please enter the valid admin password.");
    } catch {
      setError("Login error. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <h2 className="font-semibold text-base">Admin Login</h2>
      </div>

      {/* Login Box */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-sm mx-auto w-full">
        <div className="w-16 h-16 rounded-2xl bg-[#10A37F]/15 flex items-center justify-center mb-4">
          <ShieldCheck className="w-9 h-9 text-[#10A37F]" />
        </div>

        <h3 className="text-xl font-bold text-white text-center">
          Staff / Admin Access
        </h3>
        <p className="text-xs text-neutral-400 text-center mt-1 mb-6">
          Log in to update department, office, fee, or notice information.
        </p>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin Password"
                className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#10A37F] transition-colors"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-2 px-1">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3.5 px-4 bg-[#10A37F] hover:bg-[#1A7F64] disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-[#10A37F]/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Log In</span>
            )}
          </button>

          <p className="text-[11px] text-center text-neutral-500 pt-2">
            Default credentials for demonstration: <span className="font-mono text-neutral-300">cbmuadmin</span>
          </p>
        </form>
      </div>
    </div>
  );
};
