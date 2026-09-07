import React, { useState, useEffect } from "react";
import {
  Activity,
  RefreshCw,
  Radio,
  Sparkles,
} from "lucide-react";
import { apiRequest, type TelemetryLogItem } from "../lib/api";

export const TelemetryTab: React.FC = () => {
  const [logs, setLogs] = useState<TelemetryLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<TelemetryLogItem | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ logs: TelemetryLogItem[] }>("/api/telemetry/logs?limit=50");
      setLogs(data.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Request Telemetry & Token Logs
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time inspection of captured prompt/completion tokens, cached savings, latency metrics, and stream events.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="skeuo-btn inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="skeuo-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-medium">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Client Key</th>
                <th className="px-4 py-3">Provider & Model</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Prompt</th>
                <th className="px-4 py-3">Cached</th>
                <th className="px-4 py-3">Completion</th>
                <th className="px-4 py-3">Total Tokens</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No request telemetry recorded yet</p>
                    <p className="text-[11px] mt-1">
                      Send a request to <code className="font-mono text-zinc-700 dark:text-zinc-300">/v1/chat/completions</code> or <code className="font-mono text-zinc-700 dark:text-zinc-300">/v1/messages</code> to see logs here.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isOk = log.statusCode >= 200 && log.statusCode < 300;
                  const isWarning = log.statusCode >= 400 && log.statusCode < 500;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {log.clientKeyName || (
                          <span className="text-zinc-400 italic">Anonymous</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                              log.provider === "openai"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {log.provider}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                            {log.model}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.isStreaming ? (
                          <span className="inline-flex items-center text-[10px] font-medium text-cyan-600 dark:text-cyan-400">
                            <Radio className="w-3 h-3 mr-1" />
                            Stream
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">JSON</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {log.promptTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {(log.cachedTokens || 0) > 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                            <Sparkles className="w-3 h-3 mr-1 shrink-0" />
                            {log.cachedTokens.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {log.completionTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {log.totalTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                        {log.durationMs}ms
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOk
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : isWarning
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          }`}
                        >
                          {log.statusCode}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Drawer / Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-lg skeuo-card p-6 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Request Telemetry Detail
              </h3>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-md skeuo-card-subtle">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Log ID</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Timestamp</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-md skeuo-card-subtle">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Endpoint</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">{selectedLog.endpoint}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Model & Provider</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{selectedLog.provider} / {selectedLog.model}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 p-3 rounded-md skeuo-card-subtle text-center">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Prompt</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{selectedLog.promptTokens}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Cached</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedLog.cachedTokens || 0}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Completion</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{selectedLog.completionTokens}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Total</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{selectedLog.totalTokens}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-md skeuo-card-subtle">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Client Key</span>
                  <span className="text-zinc-900 dark:text-zinc-100">{selectedLog.clientKeyName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Latency Duration</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">{selectedLog.durationMs} ms</span>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                  <span className="font-semibold block mb-1">Upstream Error:</span>
                  <pre className="text-[11px] whitespace-pre-wrap font-mono">{selectedLog.errorMessage}</pre>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="skeuo-btn-primary px-4 py-2 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
