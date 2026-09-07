import React, { useState, useEffect, useRef } from "react";
import {
  Database,
  Download,
  Upload,
  Lock,
  Server,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Zap,
  Trash2,
  FileCode2,
  Flame,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { apiRequest, type SystemInfo, type OptimizationSettings } from "../lib/api";

export const DatabaseSettingsTab: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Global Optimizations state
  const [optimizations, setOptimizations] = useState<OptimizationSettings>({
    cacheEnabled: true,
    rtkCompression: false,
    cavemanMode: false,
    minifyPrompt: false,
    cacheTtlSeconds: 3600,
    httpsOnly: false,
    requestTimeoutSeconds: 0,
  });
  const [optSaving, setOptSaving] = useState(false);
  const [cacheClearStatus, setCacheClearStatus] = useState<string | null>(null);

  // Change PIN state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStatus, setPinStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [pinSubmitting, setPinSubmitting] = useState(false);

  // Import DB state
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadOptimizations = async () => {
    try {
      const data = await apiRequest<OptimizationSettings>("/api/admin/settings/optimizations");
      setOptimizations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const updateOpt = async (patch: Partial<OptimizationSettings>) => {
    const updated = { ...optimizations, ...patch };
    setOptimizations(updated);
    setOptSaving(true);
    try {
      await apiRequest("/api/admin/settings/optimizations", {
        method: "POST",
        body: JSON.stringify(patch),
      });
    } catch (e) {
      console.error("Failed to save optimization settings:", e);
    } finally {
      setOptSaving(false);
    }
  };

  const handleClearCache = async () => {
    try {
      const res = await apiRequest<{ cleared: number }>("/api/admin/cache/clear", {
        method: "POST",
      });
      setCacheClearStatus(`Purged ${res.cleared} cached responses`);
      setTimeout(() => setCacheClearStatus(null), 3000);
    } catch (e: any) {
      setCacheClearStatus(`Error clearing cache: ${e.message}`);
      setTimeout(() => setCacheClearStatus(null), 3000);
    }
  };

  const loadSystemInfo = async () => {
    setLoadingInfo(true);
    try {
      const data = await apiRequest<SystemInfo>("/api/admin/system");
      setSystemInfo(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInfo(false);
    }
  };

  useEffect(() => {
    loadSystemInfo();
    loadOptimizations();
  }, []);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinStatus(null);

    if (newPin.length !== 6) {
      setPinStatus({ success: false, message: "New PIN must be exactly 6 digits" });
      return;
    }
    if (newPin !== confirmPin) {
      setPinStatus({ success: false, message: "New PIN and confirmation do not match" });
      return;
    }

    setPinSubmitting(true);
    try {
      await apiRequest("/api/auth/change-pin", {
        method: "POST",
        body: JSON.stringify({ currentPin, newPin }),
      });
      setPinStatus({ success: true, message: "Master PIN successfully updated!" });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      setPinStatus({ success: false, message: err.message || "Failed to update PIN" });
    } finally {
      setPinSubmitting(false);
    }
  };

  const handleExportDb = () => {
    window.location.href = "/api/admin/db/export";
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Warning: Importing a database will replace all current keys and logs. Make sure you have exported a backup first. Proceed?")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImporting(true);
    setImportStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/db/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import database");
      }

      setImportStatus({
        success: true,
        message: "Database imported and verified successfully! Refreshing view...",
      });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: err.message || "Failed to import database",
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Global Router & System Settings
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Configure global prompt compression, token caching engines, database backups, and security credentials.
        </p>
      </div>

      {/* Global Prompt & Token Optimizers Card */}
      <div className="skeuo-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <span>Global Prompt & Token Optimizers</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Global Active
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Applied automatically to all inbound OpenAI and Anthropic proxy requests.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {optSaving && (
              <span className="inline-flex items-center text-[11px] text-zinc-500 dark:text-zinc-400 space-x-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {cacheClearStatus && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                {cacheClearStatus}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Exact Response Cache Engine */}
          <div className="skeuo-card-subtle p-4 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Response Cache Engine
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={optimizations.cacheEnabled}
                onClick={() => updateOpt({ cacheEnabled: !optimizations.cacheEnabled })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-zinc-700/50 transition-colors duration-200 ease-in-out focus:outline-none ${
                  optimizations.cacheEnabled ? "bg-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]" : "bg-zinc-300 dark:bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    optimizations.cacheEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Caches exact prompt completions in SQLite. Subsequent identical requests bypass upstream providers with instant 0ms TTFT.
            </p>
            {optimizations.cacheEnabled && (
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">TTL:</span>
                  <input
                    type="number"
                    min={60}
                    step={60}
                    value={optimizations.cacheTtlSeconds}
                    onChange={(e) =>
                      updateOpt({ cacheTtlSeconds: parseInt(e.target.value, 10) || 3600 })
                    }
                    className="w-20 px-2 py-1 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 text-[11px] font-mono focus:outline-none"
                  />
                  <span className="text-[11px] text-zinc-400">sec</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="skeuo-btn inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium rounded-md text-zinc-600 dark:text-zinc-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Purge Cache</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. RTK Compression */}
          <div className="skeuo-card-subtle p-4 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode2 className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  RTK Compression
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  De-duplicate
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={optimizations.rtkCompression}
                onClick={() => updateOpt({ rtkCompression: !optimizations.rtkCompression })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-zinc-700/50 transition-colors duration-200 ease-in-out focus:outline-none ${
                  optimizations.rtkCompression ? "bg-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]" : "bg-zinc-300 dark:bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    optimizations.rtkCompression ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Repeated Token Knowledge pruning: strips identical duplicate lines, redundant sentences, and repetitive chat history bloat before forwarding upstream.
            </p>
          </div>

          {/* 3. Caveman Mode */}
          <div className="skeuo-card-subtle p-4 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Caveman Mode
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Ultra-Dense
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={optimizations.cavemanMode}
                onClick={() => updateOpt({ cavemanMode: !optimizations.cavemanMode })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-zinc-700/50 transition-colors duration-200 ease-in-out focus:outline-none ${
                  optimizations.cavemanMode ? "bg-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]" : "bg-zinc-300 dark:bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    optimizations.cavemanMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Injects dense brevity instructions. Omit all pleasantries, greetings, apologies, and conversational fluff to slash output tokens.
            </p>
          </div>

          {/* 4. Whitespace & Prompt Minifier */}
          <div className="skeuo-card-subtle p-4 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-cyan-500" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Prompt Minifier
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  Trim Space
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={optimizations.minifyPrompt}
                onClick={() => updateOpt({ minifyPrompt: !optimizations.minifyPrompt })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-zinc-700/50 transition-colors duration-200 ease-in-out focus:outline-none ${
                  optimizations.minifyPrompt ? "bg-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]" : "bg-zinc-300 dark:bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    optimizations.minifyPrompt ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Minifies prompt payloads by trimming trailing whitespace and collapsing consecutive line breaks before hitting the model tokenizers.
            </p>
          </div>

          {/* 5. HTTPS-Only API Enforcement */}
          <div className="skeuo-card-subtle p-4 rounded-md space-y-3 col-span-1 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  HTTPS-Only API Enforcement
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  Strict TLS
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={optimizations.httpsOnly}
                onClick={() => updateOpt({ httpsOnly: !optimizations.httpsOnly })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-zinc-700/50 transition-colors duration-200 ease-in-out focus:outline-none ${
                  optimizations.httpsOnly ? "bg-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]" : "bg-zinc-300 dark:bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    optimizations.httpsOnly ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Rejects unencrypted HTTP requests to AI proxy endpoints (/v1/chat/completions, /v1/messages, /v1/models). Enforces TLS encryption via protocol check and X-Forwarded-Proto inspection.
            </p>
          </div>

          {/* 6. Request Timeout (API Duration Limit) */}
          <div className="skeuo-card-subtle p-4 rounded-md space-y-3 col-span-1 md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Request Timeout (API Duration Limit)
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  {(optimizations.requestTimeoutSeconds ?? 0) === 0
                    ? "Unlimited (0s)"
                    : `${optimizations.requestTimeoutSeconds}s Limit`}
                </span>
              </div>

              {/* Number input and preset buttons */}
              <div className="flex items-center space-x-2">
                <div className="relative w-28">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={optimizations.requestTimeoutSeconds ?? 0}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value || "0", 10));
                      updateOpt({ requestTimeoutSeconds: val });
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 pr-6 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-mono pointer-events-none">
                    s
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  {[0, 30, 60, 120, 300].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateOpt({ requestTimeoutSeconds: preset })}
                      className={`px-2 py-1 text-[10px] font-mono font-medium rounded transition-colors ${
                        (optimizations.requestTimeoutSeconds ?? 0) === preset
                          ? "bg-orange-500 text-white font-bold"
                          : "skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-orange-500"
                      }`}
                    >
                      {preset === 0 ? "Unlimited" : `${preset}s`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Sets the maximum duration (in seconds) allowed for AI proxy requests before timing out with HTTP 504. Default is <code className="font-mono text-orange-500 font-semibold">0</code> (unlimited duration).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Management Card */}
        <div className="skeuo-card p-6 space-y-5">
          <div className="flex items-center space-x-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <Database className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Database Persistence & WAL
            </h3>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Neko-Router runs on native <code className="font-mono text-zinc-800 dark:text-zinc-200">bun:sqlite</code> with Write-Ahead Logging (<code className="font-mono text-zinc-800 dark:text-zinc-200">PRAGMA journal_mode = WAL</code>) for high concurrent throughput.
          </p>

          {importStatus && (
            <div
              className={`p-3 rounded-md text-xs flex items-center space-x-2 ${
                importStatus.success
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Export Button */}
            <button
              onClick={handleExportDb}
              className="skeuo-card-subtle p-4 rounded-md text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Export Database
                </span>
                <Download className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Checkpoints WAL and downloads a full <code className="font-mono">.sqlite</code> binary snapshot.
              </p>
            </button>

            {/* Import Button */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".sqlite,.db"
                onChange={handleImportFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full h-full skeuo-card-subtle p-4 rounded-md text-left transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {importing ? "Validating DB..." : "Import Database"}
                  </span>
                  <Upload className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Upload an existing database with schema and integrity verification.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Change PIN Security Card */}
        <div className="skeuo-card p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <Lock className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Master Authentication PIN
            </h3>
          </div>

          {pinStatus && (
            <div
              className={`p-3 rounded-md text-xs flex items-center space-x-2 ${
                pinStatus.success
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
              }`}
            >
              {pinStatus.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{pinStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleChangePin} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Current PIN (6 digits)
              </label>
              <input
                type="password"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter current 6-digit PIN"
                className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  New Master PIN (6 digits)
                </label>
                <input
                  type="password"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Confirm New PIN (6 digits)
                </label>
                <input
                  type="password"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pinSubmitting}
              className="mt-2 px-4 py-2 rounded-md skeuo-btn-primary font-semibold disabled:opacity-50"
            >
              {pinSubmitting ? "Updating..." : "Update Master PIN"}
            </button>
          </form>
        </div>

        {/* System Telemetry Info */}
        <div className="lg:col-span-2 skeuo-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Runtime Diagnostics & Engine
              </h3>
            </div>
            <button
              onClick={loadSystemInfo}
              disabled={loadingInfo}
              className="skeuo-btn p-1.5 rounded-md"
              title="Refresh diagnostics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingInfo ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="skeuo-card-subtle p-3 rounded-md">
              <span className="text-zinc-400 block text-[10px]">Bun Runtime</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                v{systemInfo?.bunVersion || "..."}
              </span>
            </div>

            <div className="skeuo-card-subtle p-3 rounded-md">
              <span className="text-zinc-400 block text-[10px]">Memory (RSS)</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {systemInfo?.memory?.rssMb || 0} MB
              </span>
            </div>

            <div className="skeuo-card-subtle p-3 rounded-md">
              <span className="text-zinc-400 block text-[10px]">Database Size</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {systemInfo ? Math.round((systemInfo.dbSizeBytes / 1024) * 10) / 10 : 0} KB
              </span>
            </div>

            <div className="skeuo-card-subtle p-3 rounded-md">
              <span className="text-zinc-400 block text-[10px]">Uptime</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {systemInfo ? `${Math.floor(systemInfo.uptimeSeconds / 60)}m ${systemInfo.uptimeSeconds % 60}s` : "..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
