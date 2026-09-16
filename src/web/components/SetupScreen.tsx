import React, { useState } from "react";
import { ShieldAlert, KeyRound, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { apiRequest } from "../lib/api";

interface SetupScreenProps {
  onSetupSuccess: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupSuccess }) => {
  const [currentPin, setCurrentPin] = useState("123456");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPin.length !== 6) {
      setError("New PIN must be exactly 6 digits");
      return;
    }

    if (newPin === "123456") {
      setError("New PIN cannot be the default PIN (123456)");
      return;
    }

    if (newPin !== confirmPin) {
      setError("New PIN and confirmation PIN do not match");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/api/auth/change-pin", {
        method: "POST",
        body: JSON.stringify({ currentPin, newPin }),
      });
      onSetupSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update PIN. Please verify your current PIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md skeuo-card p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-amber-500/10 text-amber-500 mb-4 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            First Setup Required
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your Neko-Router is currently using the factory default PIN (<code className="font-mono text-zinc-900 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">123456</code>).
            For security, please set a new personalized 6-digit master PIN.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Current Default PIN (6 digits)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-3 py-2 pl-9 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 text-sm font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-zinc-600"
                placeholder="123456"
              />
              <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              New Master PIN (6 digits)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-3 py-2 pl-9 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 text-sm font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-zinc-600"
                placeholder="••••••"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Confirm New PIN (6 digits)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-3 py-2 pl-9 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 text-sm font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-zinc-600"
                placeholder="••••••"
              />
              <CheckCircle2 className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 px-4 rounded-md skeuo-btn-primary font-medium text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? "Securing Router..." : "Save PIN & Launch Gateway"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          This PIN will be securely hashed with bcrypt on the local Bun runtime.
        </div>
      </div>
    </div>
  );
};
