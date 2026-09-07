import React, { useState } from "react";
import { Cat, Lock, ArrowRight, KeyRound } from "lucide-react";
import { apiRequest } from "../lib/api";

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Invalid PIN. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm skeuo-card p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] text-zinc-100 mb-3">
            <Cat className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Neko-Router Gateway
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Enter your Master PIN to unlock the router control dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Master PIN
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-3 py-2.5 pl-9 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-1 focus:ring-zinc-600"
                placeholder="••••••"
              />
              <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full mt-4 py-2.5 px-4 rounded-md skeuo-btn-primary font-medium text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? "Verifying..." : "Unlock Dashboard"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500 flex items-center justify-center space-x-1">
          <Lock className="w-3 h-3" />
          <span>Protected by Bun.password bcrypt auth</span>
        </div>
      </div>
    </div>
  );
};
