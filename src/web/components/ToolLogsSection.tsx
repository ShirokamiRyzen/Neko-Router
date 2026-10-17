import React, { useEffect, useState } from "react";
import {
 Search,
 Globe,
 Loader2,
 Copy,
 Check,
 X,
 Activity,
} from "lucide-react";
import { apiRequest, type ToolLogItem } from "../lib/api";

function formatCount(value: number): string {
 if (!value) return "0";
 if (value < 1000) return value.toLocaleString();
 return `${(value / 1000).toFixed(1)}k`;
}

export const ToolLogsSection: React.FC<{ refreshKey?: number }> = ({
 refreshKey = 0,
}) => {
 const [logs, setLogs] = useState<ToolLogItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedLog, setSelectedLog] = useState<ToolLogItem | null>(null);
 const [copiedId, setCopiedId] = useState(false);

 const loadLogs = async () => {
 setLoading(true);
 try {
 const data = await apiRequest<{ logs: ToolLogItem[] }>(
 "/api/telemetry/tool-logs?limit=50"
 );
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
 }, [refreshKey]);

 const handleCopyLogId = (id: string) => {
 navigator.clipboard.writeText(id);
 setCopiedId(true);
 setTimeout(() => setCopiedId(false), 2000);
 };

 return (
 <div className="space-y-4">
 <div className="skeuo-card overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-medium">
 <tr>
 <th className="px-4 py-3">Timestamp</th>
 <th className="px-4 py-3">Client Key</th>
 <th className="px-4 py-3">Type</th>
 <th className="px-4 py-3">Engine / Target</th>
 <th className="px-4 py-3">Query / URL</th>
 <th className="px-4 py-3">Result</th>
 <th className="px-4 py-3">Latency</th>
 <th className="px-4 py-3 text-right">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
 {loading && logs.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
 <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin opacity-60" />
 <p className="text-[11px]">Loading tool logs...</p>
 </td>
 </tr>
 ) : logs.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400">
 <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
 <p className="font-medium">No search or fetch logs yet</p>
 <p className="text-[11px] mt-1">
 Call <code className="font-mono text-zinc-700 dark:text-zinc-300">/v1/tools/search</code> or{" "}
 <code className="font-mono text-zinc-700 dark:text-zinc-300">/v1/tools/fetch</code> to see activity here.
 </p>
 </td>
 </tr>
 ) : (
 logs.map((log) => {
 const isOk = log.statusCode >= 200 && log.statusCode < 300;
 const isWarning = log.statusCode >= 400 && log.statusCode < 500;
 const isSearch = log.toolType === "search";
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
 <span
 className={`inline-flex items-center text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
 isSearch
 ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
 : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
 }`}
 >
 {isSearch ? (
 <Search className="w-3 h-3 mr-1" />
 ) : (
 <Globe className="w-3 h-3 mr-1" />
 )}
 {log.toolType}
 </span>
 </td>
 <td className="px-4 py-3">
 <span className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
 {log.provider || (isSearch ? "search" : "fetch")}
 </span>
 </td>
 <td className="px-4 py-3 max-w-[280px]">
 <span
 className="block truncate font-mono text-[11px] text-zinc-600 dark:text-zinc-400"
 title={log.query || log.url || ""}
 >
 {log.query || log.url || "-"}
 </span>
 </td>
 <td className="px-4 py-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
 {isSearch
 ? `${log.resultCount.toLocaleString()} results`
 : `${formatCount(log.contentLength)} chars`}
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

 {selectedLog && (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
 onClick={() => setSelectedLog(null)}
 >
 <div
 className="w-full max-w-lg skeuo-card p-5 sm:p-6 text-xs max-h-[90vh] overflow-y-auto"
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
 Search & Fetch Log Detail
 </h3>
 <button
 type="button"
 onClick={() => setSelectedLog(null)}
 className="ml-auto text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
 title="Close"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>

 <div className="space-y-3">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md skeuo-card-subtle">
 <div className="min-w-0">
 <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">Log ID</span>
 <div className="flex items-center space-x-1.5 mt-0.5">
 <span className="font-mono text-zinc-900 dark:text-zinc-100 break-all select-all text-xs font-semibold">
 {selectedLog.id}
 </span>
 <button
 type="button"
 onClick={() => handleCopyLogId(selectedLog.id)}
 className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
 title="Copy Log ID"
 >
 {copiedId ? (
 <Check className="w-3 h-3 text-emerald-500" />
 ) : (
 <Copy className="w-3 h-3" />
 )}
 </button>
 </div>
 </div>
 <div className="min-w-0 sm:text-right">
 <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">Timestamp</span>
 <span className="text-zinc-900 dark:text-zinc-100 text-xs font-mono block mt-0.5">
 {new Date(selectedLog.createdAt).toLocaleString()}
 </span>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-md skeuo-card-subtle">
 <div className="min-w-0">
 <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">Type</span>
 <span className="font-mono text-zinc-900 dark:text-zinc-100 block mt-0.5 font-medium capitalize">
 {selectedLog.toolType}
 </span>
 </div>
 <div className="min-w-0">
 <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">Engine / Target</span>
 <span className="font-mono text-zinc-900 dark:text-zinc-100 block mt-0.5">
 {selectedLog.provider || (selectedLog.toolType === "search" ? "search" : "fetch")}
 </span>
 </div>
 </div>

 <div className="p-3 rounded-md skeuo-card-subtle">
 <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">
 {selectedLog.toolType === "search" ? "Query" : "URL"}
 </span>
 <span className="font-mono text-zinc-900 dark:text-zinc-100 break-all block mt-0.5">
 {selectedLog.query || selectedLog.url || "-"}
 </span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-md skeuo-card-subtle text-center">
 <div className="min-w-0">
 <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">Status</span>
 <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
 {selectedLog.statusCode}
 </span>
 </div>
 <div className="min-w-0">
 <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">Latency</span>
 <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
 {selectedLog.durationMs}ms
 </span>
 </div>
 <div className="min-w-0">
 <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">
 {selectedLog.toolType === "search" ? "Results" : "Chars"}
 </span>
 <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
 {selectedLog.toolType === "search"
 ? selectedLog.resultCount.toLocaleString()
 : selectedLog.contentLength.toLocaleString()}
 </span>
 </div>
 <div className="min-w-0">
 <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">Client Key</span>
 <span className="text-zinc-900 dark:text-zinc-100 font-medium block mt-0.5 truncate">
 {selectedLog.clientKeyName || "Anonymous"}
 </span>
 </div>
 </div>

 {selectedLog.errorMessage && (
 <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
 <span className="font-semibold block mb-1">Error:</span>
 <pre className="text-[11px] whitespace-pre-wrap break-all font-mono max-h-48 overflow-y-auto">
 {selectedLog.errorMessage}
 </pre>
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
