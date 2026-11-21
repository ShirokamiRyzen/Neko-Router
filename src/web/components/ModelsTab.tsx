import React, { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Copy,
  Check,
  RefreshCw,
  Search,
  Loader2,
  KeyRound,
  Activity,
  Gauge,
  Zap,
  Hash,
  ChevronDown,
  ChevronUp,
  Layers,
  Eye,
  Brain,
  Wrench,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Shuffle,
} from "lucide-react";
import {
  apiRequest,
  type ClientKeyItem,
  type RouterModelItem,
  type RouterModelsResponse,
} from "../lib/api";

function formatCompact(value: number | undefined | null): string {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 2 : 1)}K`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return `${(n / 1_000_000_000).toFixed(2)}B`;
}

function formatContext(value: number | undefined | null): string {
  const n = Number(value || 0);
  if (!n) return "—";
  if (n >= 1_000_000) return `${parseFloat((n / 1_000_000).toFixed(1))}M`;
  if (n >= 1_000) return `${parseFloat((n / 1_000).toFixed(1))}K`;
  return String(n);
}

function formatTimeAgo(timestamp: number | null | undefined): string {
  if (!timestamp) return "never";
  const diff = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_STYLES: Record<string, string> = {
  operational: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  degraded: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  offline: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
  idle: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20",
};

const STATUS_DOT: Record<string, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  offline: "bg-red-500",
  idle: "bg-zinc-400",
};

function CapabilityBadges({ model }: { model: RouterModelItem }) {
  const caps = model.capabilities || {};
  const badges: { label: string; icon: React.ReactNode; className: string }[] = [];

  if (caps.vision) {
    badges.push({
      label: "vision",
      icon: <Eye className="w-3 h-3" />,
      className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    });
  }
  if (caps.reasoning) {
    badges.push({
      label: "reasoning",
      icon: <Brain className="w-3 h-3" />,
      className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    });
  }
  if (caps.tools || caps.function_calling) {
    badges.push({
      label: "tools",
      icon: <Wrench className="w-3 h-3" />,
      className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    });
  }
  if (caps.embeddings) {
    badges.push({
      label: "embeddings",
      icon: <Layers className="w-3 h-3" />,
      className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    });
  }

  if (badges.length === 0) {
    return <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{model.type || "chat"}</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${badge.className}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </span>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="skeuo-card p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
          {label}
        </span>
        <span className={`p-1.5 rounded-md ${accent}`}>{icon}</span>
      </div>
      <div className="mt-1.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{hint}</div>
    </div>
  );
}

export const ModelsTab: React.FC = () => {
  const [keys, setKeys] = useState<ClientKeyItem[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("neko_models_key_filter") || "";
    }
    return "";
  });
  const [data, setData] = useState<RouterModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const persistKeyFilter = (keyId: string) => {
    setSelectedKeyId(keyId);
    try {
      if (keyId) localStorage.setItem("neko_models_key_filter", keyId);
      else localStorage.removeItem("neko_models_key_filter");
    } catch {
      // ignore
    }
  };

  const loadKeys = async () => {
    try {
      const res = await apiRequest<{ keys: ClientKeyItem[] }>("/api/keys");
      setKeys(res.keys || []);
    } catch (e) {
      console.error("Failed to load client keys:", e);
    }
  };

  const loadModels = async (keyId: string, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setData(null);
    }
    setError("");
    try {
      const res = await apiRequest<RouterModelsResponse>(
        `/api/models${keyId ? `?keyId=${encodeURIComponent(keyId)}` : ""}`
      );
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load model catalog");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  useEffect(() => {
    loadModels(selectedKeyId);
    setExpandedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeyId]);

  const selectedKey = useMemo(
    () => keys.find((k) => k.id === selectedKeyId) || null,
    [keys, selectedKeyId]
  );

  const providers = useMemo(() => {
    const set = new Set<string>();
    (data?.models || []).forEach((m) => {
      if (m.provider) set.add(m.provider);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredModels = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.models || []).filter((m) => {
      if (providerFilter !== "all" && m.provider !== providerFilter) return false;
      if (!query) return true;
      return (
        m.id.toLowerCase().includes(query) ||
        (m.name || "").toLowerCase().includes(query) ||
        (m.root || "").toLowerCase().includes(query) ||
        (m.provider || "").toLowerCase().includes(query)
      );
    });
  }, [data, search, providerFilter]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const copyAll = () => {
    if (filteredModels.length === 0) return;
    copyText(filteredModels.map((m) => m.id).join("\n"), "__all__");
  };

  const hasNoProviders =
    Boolean(data?.key) && (data?.key?.allowedProviders?.length || 0) === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Boxes className="w-4 h-4 text-indigo-500" />
            <span>Router Model Catalog</span>
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Model IDs resolved exactly like <code className="font-mono">/v1/models</code> — copy them straight into
            your AI client. Filter by client key to see only the models that key can actually use.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={copyAll}
            disabled={filteredModels.length === 0}
            className="skeuo-btn inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copy all visible model IDs"
          >
            {copiedId === "__all__" ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedId === "__all__" ? "Copied!" : `Copy IDs (${filteredModels.length})`}</span>
          </button>
          <button
            onClick={() => loadModels(selectedKeyId, true)}
            disabled={refreshing || loading}
            className="skeuo-btn p-2 rounded-md cursor-pointer"
            title="Refresh model catalog"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="skeuo-card p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5">
            <label className="block text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 mb-1.5">
              Filter by Client Key
            </label>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedKeyId}
                onChange={(e) => persistKeyFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
              >
                <option value="">All Models — no key filter</option>
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} — {k.displayKey}
                    {k.isActive ? "" : " (inactive)"}
                    {k.isFollowUpstream ? " · pass-through" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-4">
            <label className="block text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 mb-1.5">
              Search Model
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search id, name, provider..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 mb-1.5">
              Provider
            </label>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
            >
              <option value="all">All providers ({providers.length})</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected key summary */}
        {selectedKey ? (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 text-[11px]">
            <span className="inline-flex items-center space-x-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  selectedKey.isActive ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
              <span>{selectedKey.name}</span>
            </span>
            <code className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {selectedKey.displayKey}
            </code>
            <span className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
              {(selectedKey.allowedProviders || []).length} provider
              {(selectedKey.allowedProviders || []).length === 1 ? "" : "s"} enabled
            </span>
            {selectedKey.isFollowUpstream && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Shuffle className="w-3 h-3" />
                <span>pass-through</span>
              </span>
            )}
            {!selectedKey.isFollowUpstream && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                <ShieldCheck className="w-3 h-3" />
                <span>{selectedKey.roundRobinProviders ? "round-robin" : "primary only"}</span>
              </span>
            )}
            {selectedKey.tokenLimit ? (
              <span className="text-zinc-500 dark:text-zinc-400">
                quota {formatCompact(selectedKey.usedTokens)} / {formatCompact(selectedKey.tokenLimit)} tokens
              </span>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 text-[11px] text-zinc-500 dark:text-zinc-400">
            <Activity className="w-3.5 h-3.5" />
            <span>
              Showing every model available across all active upstream providers (no key scoping).
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <StatCard
            label="Models"
            value={String(data.stats.total_models)}
            hint={`${data.stats.operational_models} operational · ${data.stats.idle_models} idle`}
            icon={<Boxes className="w-3.5 h-3.5" />}
            accent="bg-indigo-500/10 text-indigo-500"
          />
          <StatCard
            label="Requests 24h"
            value={formatCompact(data.stats.requests_24h)}
            hint={
              data.stats.requests_24h > 0
                ? `${data.stats.success_rate_24h.toFixed(1)}% success rate`
                : "no traffic yet"
            }
            icon={<Activity className="w-3.5 h-3.5" />}
            accent="bg-emerald-500/10 text-emerald-500"
          />
          <StatCard
            label="Tokens 24h"
            value={formatCompact(data.stats.total_tokens_24h)}
            hint="prompt + completion"
            icon={<Hash className="w-3.5 h-3.5" />}
            accent="bg-sky-500/10 text-sky-500"
          />
          <StatCard
            label="Avg Latency"
            value={data.stats.avg_latency_ms > 0 ? `${data.stats.avg_latency_ms.toLocaleString()} ms` : "—"}
            hint="weighted by requests"
            icon={<Gauge className="w-3.5 h-3.5" />}
            accent="bg-amber-500/10 text-amber-500"
          />
          <StatCard
            label="Avg TPS"
            value={data.stats.avg_tps > 0 ? data.stats.avg_tps.toFixed(1) : "—"}
            hint="tokens per second"
            icon={<Zap className="w-3.5 h-3.5" />}
            accent="bg-violet-500/10 text-violet-500"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start space-x-2 p-3 rounded-xl border border-red-500/25 bg-red-500/10 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Could not load the model catalog</p>
            <p className="text-[11px] mt-0.5 opacity-90">{error}</p>
          </div>
          <button
            onClick={() => loadModels(selectedKeyId)}
            className="skeuo-btn px-2 py-1 rounded text-[11px] font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-20 text-zinc-500 dark:text-zinc-400">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
      ) : (
        <div className="skeuo-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[980px]">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-medium">
                <tr>
                  <th className="px-4 py-3">Model ID</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Capabilities</th>
                  <th className="px-4 py-3">Context</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Req 24h</th>
                  <th className="px-4 py-3 text-right">Success</th>
                  <th className="px-4 py-3 text-right">Latency</th>
                  <th className="px-4 py-3 text-right">TPS</th>
                  <th className="px-4 py-3 text-right">Tokens 24h</th>
                  <th className="px-4 py-3">Last used</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                {filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-5 py-14 text-center">
                      <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-medium text-zinc-600 dark:text-zinc-300">
                        {hasNoProviders
                          ? "No providers enabled for this key"
                          : "No models found"}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                        {hasNoProviders
                          ? "This client key has no upstream providers enabled, so it cannot access any model. Open Client Access Keys → provider permissions to enable at least one provider."
                          : data && data.models.length === 0
                          ? "No enabled models were found on the active upstream providers. Enable models in Upstream Providers first."
                          : "Try clearing the search query or switching the provider filter."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredModels.map((model) => {
                    const isCopied = copiedId === model.id;
                    const isExpanded = expandedId === model.id;
                    const stats = model.summary_24h;
                    return (
                      <React.Fragment key={model.id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : model.id)}
                          className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-start space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyText(model.id, model.id);
                                }}
                                className={`mt-0.5 p-1 rounded border transition-colors cursor-pointer ${
                                  isCopied
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                                    : "border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                }`}
                                title="Copy model ID"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <code className="block font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 break-all">
                                  {model.id}
                                </code>
                                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 break-all">
                                  {model.name}
                                  {model.root && model.root !== model.id ? ` · root: ${model.root}` : ""}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                              {model.provider}
                            </span>
                            <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                              {model.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <CapabilityBadges model={model} />
                          </td>
                          <td className="px-4 py-3 align-top font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                            {formatContext(model.context_window)}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span
                              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold capitalize ${
                                STATUS_STYLES[model.status] || STATUS_STYLES.idle
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  STATUS_DOT[model.status] || STATUS_DOT.idle
                                }`}
                              />
                              <span>{model.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono text-[11px]">
                            {formatCompact(stats.total_requests)}
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono text-[11px]">
                            {stats.total_requests > 0 ? `${stats.success_rate.toFixed(1)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono text-[11px]">
                            {stats.avg_latency_ms > 0 ? `${stats.avg_latency_ms} ms` : "—"}
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono text-[11px]">
                            {stats.avg_tps > 0 ? stats.avg_tps.toFixed(1) : "—"}
                          </td>
                          <td className="px-4 py-3 align-top text-right font-mono text-[11px]">
                            {formatCompact(stats.total_tokens)}
                          </td>
                          <td className="px-4 py-3 align-top text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimeAgo(stats.last_request_at)}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            <div className="inline-flex items-center space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyText(model.id, `row-${model.id}`);
                                }}
                                className="px-2 py-1 rounded skeuo-btn text-[10px] font-semibold cursor-pointer"
                                title="Copy model ID"
                              >
                                {copiedId === `row-${model.id}` ? "Copied" : "Copy ID"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedId(isExpanded ? null : model.id);
                                }}
                                className="p-1 rounded skeuo-btn cursor-pointer"
                                title={isExpanded ? "Hide details" : "Show details"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-zinc-50/70 dark:bg-zinc-900/40">
                            <td colSpan={12} className="px-5 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
                                <div className="space-y-1.5">
                                  <div className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                                    Model Information
                                  </div>
                                  <p className="text-zinc-600 dark:text-zinc-300">
                                    {model.description || "No description available."}
                                  </p>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                                    <span className="text-zinc-400 dark:text-zinc-500">Router ID</span>
                                    <code className="font-mono text-zinc-700 dark:text-zinc-200 break-all">
                                      {model.id}
                                    </code>
                                    <span className="text-zinc-400 dark:text-zinc-500">Root ID</span>
                                    <code className="font-mono text-zinc-700 dark:text-zinc-200 break-all">
                                      {model.root}
                                    </code>
                                    <span className="text-zinc-400 dark:text-zinc-500">Provider</span>
                                    <span>{model.provider}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Type</span>
                                    <span>{model.type}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Context window</span>
                                    <span>{formatContext(model.context_window)} tokens</span>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                                    Last 24 Hours
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                    <span className="text-zinc-400 dark:text-zinc-500">Requests</span>
                                    <span className="font-mono">{formatCompact(stats.total_requests)}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Errors</span>
                                    <span className="font-mono">{formatCompact(stats.error_requests)}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Latency</span>
                                    <span className="font-mono">
                                      {stats.avg_latency_ms} ms avg / {stats.min_latency_ms}–{stats.max_latency_ms} ms
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-500">TPS</span>
                                    <span className="font-mono">
                                      {stats.avg_tps.toFixed(1)} avg / {stats.min_tps.toFixed(1)}–
                                      {stats.max_tps.toFixed(1)}
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Prompt tokens</span>
                                    <span className="font-mono">{formatCompact(stats.prompt_tokens)}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Completion tokens</span>
                                    <span className="font-mono">{formatCompact(stats.completion_tokens)}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Cached tokens</span>
                                    <span className="font-mono">{formatCompact(stats.cached_tokens)}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Total tokens</span>
                                    <span className="font-mono">{formatCompact(stats.total_tokens)}</span>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                                    All-Time Usage
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                    <span className="text-zinc-400 dark:text-zinc-500">Requests</span>
                                    <span className="font-mono">{formatCompact(model.all_time.total_requests)}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Success rate</span>
                                    <span className="font-mono">
                                      {model.all_time.total_requests > 0
                                        ? `${model.all_time.success_rate.toFixed(1)}%`
                                        : "—"}
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Avg latency</span>
                                    <span className="font-mono">
                                      {model.all_time.avg_latency_ms > 0
                                        ? `${model.all_time.avg_latency_ms} ms`
                                        : "—"}
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Prompt tokens</span>
                                    <span className="font-mono">{formatCompact(model.all_time.prompt_tokens)}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Completion tokens</span>
                                    <span className="font-mono">
                                      {formatCompact(model.all_time.completion_tokens)}
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Cached tokens</span>
                                    <span className="font-mono">{formatCompact(model.all_time.cached_tokens)}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Total tokens</span>
                                    <span className="font-mono">{formatCompact(model.all_time.total_tokens)}</span>
                                    <span className="text-zinc-400 dark:text-zinc-500">Last request</span>
                                    <span>{formatTimeAgo(model.all_time.last_request_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredModels.length > 0 && (
            <div className="px-4 py-2.5 border-t border-zinc-200/70 dark:border-zinc-800/70 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              <span>
                Showing {filteredModels.length} of {data?.models.length || 0} model
                {(data?.models.length || 0) === 1 ? "" : "s"}
                {selectedKey ? ` accessible by “${selectedKey.name}”` : " across all providers"}
              </span>
              <span>
                Copy an ID and use it directly as the <code className="font-mono">model</code> parameter via the
                router.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
