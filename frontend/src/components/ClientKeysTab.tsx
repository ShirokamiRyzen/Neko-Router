import React, { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Gauge,
  RotateCcw,
  AlertTriangle,
  Zap,
  Layers,
  Sliders,
  RotateCw,
  Shield,
  Terminal,
  Shuffle,
} from "lucide-react";
import {
  apiRequest,
  type ClientKeyItem,
  type ApiKeyItem,
  type UpstreamKeyItem,
} from "../lib/api";

export const ClientKeysTab: React.FC = () => {
  // Subtab navigation: "secret-keys" (AI Proxy) vs "router-keys" (Integration API)
  const [activeSubTab, setActiveSubTabState] = useState<"secret-keys" | "router-keys">(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("subtab");
      if (param === "secret-keys" || param === "router-keys") return param;
      const saved = localStorage.getItem("neko_client_keys_subtab");
      if (saved === "secret-keys" || saved === "router-keys") return saved;
    }
    return "secret-keys";
  });

  const setActiveSubTab = (tab: "secret-keys" | "router-keys") => {
    setActiveSubTabState(tab);
    try {
      localStorage.setItem("neko_client_keys_subtab", tab);
    } catch {}
  };

  // Data state
  const [secretKeys, setSecretKeys] = useState<ClientKeyItem[]>([]);
  const [routerApiKeys, setRouterApiKeys] = useState<ApiKeyItem[]>([]);
  const [upstreams, setUpstreams] = useState<UpstreamKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State: Create Secret Key (AI Proxy)
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>("");
  const [newSecretName, setNewSecretName] = useState("");
  const [newCustomSecretKey, setNewCustomSecretKey] = useState("");
  const [newTokenLimit, setNewTokenLimit] = useState<number | undefined>(undefined);
  const [newRateLimit, setNewRateLimit] = useState<number | undefined>(undefined);
  // Default: OFF ALL PROVIDERS (empty array)
  const [newAllowedProviders, setNewAllowedProviders] = useState<string[]>([]);
  const [newRoundRobinProviders, setNewRoundRobinProviders] = useState(true);
  const [creatingSecret, setCreatingSecret] = useState(false);
  const [secretError, setSecretError] = useState("");

  // Modal State: Create Router API Key (Management API)
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [newApiKeyDesc, setNewApiKeyDesc] = useState("");
  const [newCustomApiKey, setNewCustomApiKey] = useState("");
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");

  // Modal State: Provider Permissions Manager for a Secret Key
  const [activePermKey, setActivePermKey] = useState<ClientKeyItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [keysRes, routerKeysRes, upstreamsRes] = await Promise.all([
        apiRequest<{ keys: ClientKeyItem[] }>("/api/keys"),
        apiRequest<{ keys: ApiKeyItem[] }>("/api/router-keys"),
        apiRequest<{ upstreams: UpstreamKeyItem[] }>("/api/upstreams"),
      ]);
      setSecretKeys(keysRes.keys);
      setRouterApiKeys(routerKeysRes.keys);
      setUpstreams(upstreamsRes.upstreams);

      // Sync active permission key if modal is open
      if (activePermKey) {
        const found = keysRes.keys.find((k) => k.id === activePermKey.id);
        if (found) setActivePermKey(found);
      }
    } catch (e: any) {
      console.error("Failed to load keys data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateRandomSecretKey = () => {
    const random = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map((b) => b.toString(36))
      .join("")
      .slice(0, 28);
    return `sk-neko-${random}`;
  };

  const generateRandomApiKey = () => {
    const random = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map((b) => b.toString(36))
      .join("")
      .slice(0, 24);
    return `nr-api-${random}`;
  };

  // --- Handlers: Secret Keys (AI Proxy) ---
  const openCreateSecretModal = () => {
    setNewSecretName("");
    setNewCustomSecretKey("");
    setNewTokenLimit(undefined);
    setNewRateLimit(undefined);
    setNewAllowedProviders([]);
    setNewRoundRobinProviders(true);
    setSecretError("");
    // Default to the first router API key if available
    setSelectedApiKeyId(routerApiKeys.length > 0 ? routerApiKeys[0].id : "");
    setIsSecretModalOpen(true);
  };

  const handleCreateSecretKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecretError("");
    setCreatingSecret(true);

    try {
      await apiRequest("/api/keys", {
        method: "POST",
        body: JSON.stringify({
          name: newSecretName,
          apiKeyId: selectedApiKeyId || undefined,
          customKey: newCustomSecretKey || undefined,
          tokenLimit: newTokenLimit || undefined,
          rateLimit: newRateLimit || undefined,
          allowedProviders: newAllowedProviders,
          roundRobinProviders: newRoundRobinProviders,
        }),
      });
      setIsSecretModalOpen(false);
      await loadData();
    } catch (err: any) {
      setSecretError(err.message || "Failed to create secret key");
    } finally {
      setCreatingSecret(false);
    }
  };

  const handleToggleSecretKey = async (key: ClientKeyItem) => {
    try {
      await apiRequest(`/api/keys/${key.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !key.isActive }),
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetSecretQuota = async (id: string) => {
    if (!confirm("Reset used token counter to 0 for this secret key?")) return;
    try {
      await apiRequest(`/api/keys/${id}/reset-quota`, { method: "POST" });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSecretKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke and delete this secret key?")) return;
    try {
      await apiRequest(`/api/keys/${id}`, { method: "DELETE" });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- Handlers: Router API Keys (Integration / Admin) ---
  const openCreateApiKeyModal = () => {
    setNewApiKeyName("");
    setNewApiKeyDesc("");
    setNewCustomApiKey("");
    setApiKeyError("");
    setIsApiKeyModalOpen(true);
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiKeyError("");
    setCreatingApiKey(true);

    try {
      await apiRequest("/api/router-keys", {
        method: "POST",
        body: JSON.stringify({
          name: newApiKeyName,
          description: newApiKeyDesc || undefined,
          customKey: newCustomApiKey || undefined,
        }),
      });
      setIsApiKeyModalOpen(false);
      await loadData();
    } catch (err: any) {
      setApiKeyError(err.message || "Failed to create router API key");
    } finally {
      setCreatingApiKey(false);
    }
  };

  const handleToggleApiKey = async (apiKey: ApiKeyItem) => {
    try {
      await apiRequest(`/api/router-keys/${apiKey.id}/toggle`, {
        method: "PATCH",
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteApiKey = async (id: string, name: string) => {
    if (!confirm(`Revoke and delete Router API Key "${name}"? Owned secret keys will remain but will be unassigned.`)) {
      return;
    }
    try {
      await apiRequest(`/api/router-keys/${id}`, { method: "DELETE" });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- Handlers: Permissions for Secret Key ---
  const handleToggleProviderForActiveKey = async (providerId: string) => {
    if (!activePermKey) return;
    const current = activePermKey.allowedProviders || [];
    const willAllow = !current.includes(providerId);
    const updated = willAllow ? [...current, providerId] : current.filter((p) => p !== providerId);

    setActivePermKey({ ...activePermKey, allowedProviders: updated });

    try {
      await apiRequest(`/api/keys/${activePermKey.id}/toggle-provider`, {
        method: "POST",
        body: JSON.stringify({ providerId, allowed: willAllow }),
      });
      await loadData();
    } catch (e) {
      console.error(e);
      loadData();
    }
  };

  const handleToggleAllProvidersForActiveKey = async (allowAll: boolean) => {
    if (!activePermKey) return;
    const target = allowAll ? upstreams.map((u) => u.id) : [];

    setActivePermKey({ ...activePermKey, allowedProviders: target });

    try {
      await apiRequest(`/api/keys/${activePermKey.id}`, {
        method: "PATCH",
        body: JSON.stringify({ allowedProviders: target }),
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRoundRobinForActiveKey = async () => {
    if (!activePermKey) return;
    const nextVal = !(activePermKey.roundRobinProviders !== false);

    setActivePermKey({ ...activePermKey, roundRobinProviders: nextVal });

    try {
      await apiRequest(`/api/keys/${activePermKey.id}`, {
        method: "PATCH",
        body: JSON.stringify({ roundRobinProviders: nextVal }),
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Endpoint & Keys
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Manage Router Integration API Keys and AI Proxy Secret Keys independently with a 1-to-many relationship.
          </p>
        </div>

        {/* Sub-tab Pills */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center p-1 rounded-lg bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs">
            <button
              onClick={() => setActiveSubTab("secret-keys")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeSubTab === "secret-keys"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Secret Keys (AI Proxy)</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                {secretKeys.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("router-keys")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                activeSubTab === "router-keys"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>API Keys (Router Integration)</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                {routerApiKeys.length}
              </span>
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="skeuo-btn p-2 rounded-md cursor-pointer"
            title="Refresh keys"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Conceptual Separation Explainer Card */}
      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 text-xs text-zinc-600 dark:text-zinc-300">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-2.5">
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                Secret Keys (<code className="font-mono text-[11px]">sk-neko-...</code>)
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Used strictly by AI clients & SDKs (OpenAI, Anthropic, Cursor, Cline) to query <code className="font-mono">/v1/chat/completions</code>, <code className="font-mono">/v1/messages</code>, and <code className="font-mono">/v1/models</code>. Each secret key is strictly owned by one API Key.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                Router API Keys (<code className="font-mono text-[11px]">nr-api-...</code>)
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Used strictly to authenticate against Neko-Router's programmatic management API (<code className="font-mono">/api/...</code>). One Router API Key can own and manage multiple Secret Keys.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: Secret Keys (AI Proxy Access) */}
      {activeSubTab === "secret-keys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                AI Proxy Secret Keys
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Client keys for downstream AI tools. Controls provider access (default OFF), quotas, and round-robin routing.
              </p>
            </div>
            <button
              onClick={openCreateSecretModal}
              className="skeuo-btn-primary inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Secret Key</span>
            </button>
          </div>

          <div className="skeuo-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-medium">
                  <tr>
                    <th className="px-5 py-3">Label / Name</th>
                    <th className="px-5 py-3">Secret Key</th>
                    <th className="px-5 py-3">Parent API Key</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Permitted Providers & Routing</th>
                    <th className="px-5 py-3">Token Quota</th>
                    <th className="px-5 py-3">Rate Limit</th>
                    <th className="px-5 py-3">Requests</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                  {secretKeys.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-zinc-500 dark:text-zinc-400">
                        <Key className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-medium">No secret keys configured yet</p>
                        <p className="text-[11px] mt-1">
                          Generate a secret key to grant AI clients access to Neko-Router's proxy endpoints.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    secretKeys.map((k) => {
                      const isCopied = copiedId === k.id;
                      const hasTokenLimit = k.tokenLimit !== null && k.tokenLimit !== undefined && k.tokenLimit > 0;
                      const percentage = hasTokenLimit
                        ? Math.min(100, Math.round(((k.usedTokens || 0) / (k.tokenLimit || 1)) * 100))
                        : 0;
                      const isExceeded = hasTokenLimit && (k.usedTokens || 0) >= (k.tokenLimit || 1);

                      const allowedCount = k.allowedProviders ? k.allowedProviders.length : 0;
                      const isRoundRobin = k.roundRobinProviders !== false;

                      return (
                        <tr key={k.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                            {k.name}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-zinc-500 dark:text-zinc-400">
                            <div className="flex items-center space-x-2">
                              <span className="skeuo-card-subtle px-2 py-0.5 rounded text-[11px]">
                                {k.displayKey}
                              </span>
                              <button
                                onClick={() => copyToClipboard(k.key, k.id)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                title="Copy secret key"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Parent API Key Badge */}
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium font-mono">
                              <Shield className="w-3 h-3 text-emerald-500" />
                              <span>{k.apiKeyName || "Unassigned"}</span>
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => handleToggleSecretKey(k)}
                              className="flex items-center space-x-1.5 focus:outline-none cursor-pointer"
                            >
                              {k.isActive ? (
                                <>
                                  <ToggleRight className="w-5 h-5 text-emerald-500" />
                                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Active</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-5 h-5 text-zinc-400" />
                                  <span className="text-[11px] font-medium text-zinc-400">Disabled</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Permitted Providers & Round Robin */}
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => setActivePermKey(k)}
                              className="skeuo-card-subtle px-2.5 py-1 rounded inline-flex items-center space-x-2 text-[11px] hover:border-indigo-500/40 transition-colors cursor-pointer"
                              title="Configure permitted upstream providers and round-robin for this secret key"
                            >
                              <Layers className="w-3.5 h-3.5 text-indigo-500" />
                              {allowedCount > 0 ? (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {allowedCount} of {upstreams.length} Allowed
                                </span>
                              ) : (
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  0 Allowed (Blocked)
                                </span>
                              )}

                              {isRoundRobin ? (
                                <span
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30 flex items-center space-x-0.5"
                                  title="Round-robin enabled across allowed providers that support the same model"
                                >
                                  <RotateCw className="w-2.5 h-2.5 inline mr-0.5" />
                                  <span>RR</span>
                                </span>
                              ) : (
                                <span
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-500/10 text-zinc-400 font-medium border border-zinc-500/20"
                                  title="Primary provider only"
                                >
                                  Primary
                                </span>
                              )}
                            </button>
                          </td>

                          <td className="px-5 py-3.5 min-w-40">
                            {hasTokenLimit ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                                    {(k.usedTokens || 0).toLocaleString()}
                                  </span>
                                  <span className="text-zinc-400">
                                    / {k.tokenLimit?.toLocaleString()}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-sm bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-sm transition-all ${
                                      isExceeded
                                        ? "bg-red-500"
                                        : percentage > 80
                                        ? "bg-amber-500"
                                        : "bg-indigo-500"
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                {isExceeded && (
                                  <span className="inline-flex items-center text-[10px] font-bold text-red-600 dark:text-red-400">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Quota Exceeded
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center text-[11px] text-zinc-400">
                                <Zap className="w-3 h-3 mr-1 text-zinc-400" />
                                Unlimited
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-[11px]">
                            {k.rateLimit ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                                <Gauge className="w-3 h-3 mr-1 text-zinc-400" />
                                {k.rateLimit} req/m
                              </span>
                            ) : (
                              <span className="text-zinc-400">Unlimited</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 font-semibold text-zinc-800 dark:text-zinc-200">
                            {k.totalRequests.toLocaleString()}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                onClick={() => setActivePermKey(k)}
                                className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                                title="Manage allowed providers & routing for this key"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>

                              {hasTokenLimit && (
                                <button
                                  onClick={() => handleResetSecretQuota(k.id)}
                                  className="p-1.5 rounded-md text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                                  title="Reset used token quota back to 0"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteSecretKey(k.id)}
                                className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                title="Delete secret key"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Router Integration API Keys */}
      {activeSubTab === "router-keys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Router Integration API Keys
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Master keys used for programmatic management, router automation, and owning secret keys.
              </p>
            </div>
            <button
              onClick={openCreateApiKeyModal}
              className="skeuo-btn-primary inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Router API Key</span>
            </button>
          </div>

          <div className="skeuo-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-medium">
                  <tr>
                    <th className="px-5 py-3">Key Name</th>
                    <th className="px-5 py-3">Integration API Key</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Owned Secret Keys</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3">Last Used</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                  {routerApiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-zinc-500 dark:text-zinc-400">
                        <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-medium">No router integration API keys found</p>
                        <p className="text-[11px] mt-1">
                          Create an API key to integrate external services or manage downstream secret keys.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    routerApiKeys.map((ak) => {
                      const isCopied = copiedId === ak.id;
                      return (
                        <tr key={ak.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-zinc-900 dark:text-zinc-100">
                            {ak.name}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-zinc-500 dark:text-zinc-400">
                            <div className="flex items-center space-x-2">
                              <span className="skeuo-card-subtle px-2 py-0.5 rounded text-[11px]">
                                {ak.displayKey}
                              </span>
                              <button
                                onClick={() => copyToClipboard(ak.key, ak.id)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                title="Copy API key"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
                            {ak.description || "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px] font-bold">
                              <Key className="w-3 h-3" />
                              <span>{ak.secretKeysCount} Secret {ak.secretKeysCount === 1 ? "Key" : "Keys"}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => handleToggleApiKey(ak)}
                              className="flex items-center space-x-1.5 focus:outline-none cursor-pointer"
                            >
                              {ak.isActive ? (
                                <>
                                  <ToggleRight className="w-5 h-5 text-emerald-500" />
                                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Active</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-5 h-5 text-zinc-400" />
                                  <span className="text-[11px] font-medium text-zinc-400">Disabled</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
                            {new Date(ak.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
                            {ak.lastUsedAt ? new Date(ak.lastUsedAt).toLocaleDateString() : "Never"}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                onClick={() => copyToClipboard(ak.key, ak.id)}
                                className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 transition-colors cursor-pointer"
                                title="Copy API key string"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteApiKey(ak.id, ak.name)}
                                className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                title="Delete API key"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Create Secret Key (AI Proxy Access) */}
      {isSecretModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setIsSecretModalOpen(false)}
        >
          <div
            className="w-full max-w-lg skeuo-card p-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* macOS Dot Header: ONLY Red/Yellow/Green dots + title */}
            <div className="flex items-center space-x-3 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsSecretModalOpen(false)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Create AI Proxy Secret Key
              </h3>
            </div>

            {secretError && (
              <div className="mb-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {secretError}
              </div>
            )}

            <form onSubmit={handleCreateSecretKey} className="space-y-4 text-xs">
              {/* Parent Router API Key Selection */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Parent Router API Key (Owner) *
                </label>
                {routerApiKeys.length > 0 ? (
                  <select
                    value={selectedApiKeyId}
                    onChange={(e) => setSelectedApiKeyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  >
                    {routerApiKeys.map((ak) => (
                      <option key={ak.id} value={ak.id}>
                        {ak.name} ({ak.displayKey})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
                    No Router API Keys exist yet. A "Default API Key" will be created automatically to own this secret key.
                  </div>
                )}
                <p className="mt-1 text-[10px] text-zinc-400">
                  Each secret key is strictly owned by one Router API Key.
                </p>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Key Label / Application Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSecretName}
                  onChange={(e) => setNewSecretName(e.target.value)}
                  placeholder="e.g. Cursor IDE, Production Bot, Cline Extension"
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Custom Secret Key String (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewCustomSecretKey(generateRandomSecretKey())}
                    className="text-[11px] font-mono text-orange-500 hover:text-orange-400 flex items-center space-x-1 cursor-pointer transition-colors"
                    title="Generate random sk-neko- key"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Random sk-neko-</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={newCustomSecretKey}
                    onChange={(e) => setNewCustomSecretKey(e.target.value)}
                    placeholder="Leave blank to auto-generate sk-neko-..."
                    className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600 pr-9"
                  />
                  {newCustomSecretKey && (
                    <button
                      type="button"
                      onClick={() => setNewCustomSecretKey("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
                      title="Clear"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-zinc-400">
                  All Secret Keys are formatted with <code className="font-mono text-orange-500 font-semibold">sk-neko-</code> prefix automatically.
                </p>
              </div>

              {/* Provider Access Selection: DEFAULT OFF ALL PROVIDERS */}
              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      <span>Allowed Providers (Default: OFF All)</span>
                    </label>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Select which upstream AI providers this secret key can access.
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setNewAllowedProviders(upstreams.map((u) => u.id))}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded skeuo-btn text-indigo-600 dark:text-indigo-400 cursor-pointer"
                    >
                      Allow All
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAllowedProviders([])}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded skeuo-btn text-zinc-500 cursor-pointer"
                    >
                      Block All
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {upstreams.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 py-2 text-center">
                      No upstream providers configured yet.
                    </p>
                  ) : (
                    upstreams.map((u) => {
                      const isChecked = newAllowedProviders.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-emerald-500/10 border-emerald-500/30 text-zinc-900 dark:text-zinc-100"
                              : "bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setNewAllowedProviders(newAllowedProviders.filter((id) => id !== u.id));
                                } else {
                                  setNewAllowedProviders([...newAllowedProviders, u.id]);
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-semibold truncate">{u.name}</span>
                            <span className="text-[10px] uppercase font-bold text-zinc-400">
                              ({u.provider})
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">
                            {u.baseUrl || "Official API"}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Round Robin across providers with same model */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                      Round Robin Providers (Same Model)
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      When multiple allowed providers have the requested model, rotate requests evenly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewRoundRobinProviders(!newRoundRobinProviders)}
                    className="p-1 cursor-pointer"
                  >
                    {newRoundRobinProviders ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Limits & Quotas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Token Quota Limit (optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newTokenLimit ?? ""}
                    onChange={(e) =>
                      setNewTokenLimit(e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="e.g. 500000"
                    className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                  <p className="mt-1 text-[10px] text-zinc-400">
                    Max tokens allowed before 429 error.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Rate Limit (req/min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newRateLimit ?? ""}
                    onChange={(e) =>
                      setNewRateLimit(e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="e.g. 60"
                    className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                  <p className="mt-1 text-[10px] text-zinc-400">
                    Sliding window rate limit in req/min.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsSecretModalOpen(false)}
                  className="skeuo-btn px-3.5 py-2 rounded-md text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSecret}
                  className="skeuo-btn-primary px-4 py-2 rounded-md text-xs font-semibold cursor-pointer"
                >
                  {creatingSecret ? "Generating..." : "Generate Secret Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Router Integration API Key */}
      {isApiKeyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setIsApiKeyModalOpen(false)}
        >
          <div
            className="w-full max-w-lg skeuo-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* macOS Dot Header */}
            <div className="flex items-center space-x-3 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Create Router Integration API Key
              </h3>
            </div>

            {apiKeyError && (
              <div className="mb-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {apiKeyError}
              </div>
            )}

            <form onSubmit={handleCreateApiKey} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  API Key Name / Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  placeholder="e.g. Master Backend, CI/CD Pipeline, Admin Integration"
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Description / Note (optional)
                </label>
                <textarea
                  rows={2}
                  value={newApiKeyDesc}
                  onChange={(e) => setNewApiKeyDesc(e.target.value)}
                  placeholder="e.g. Key for external management script that creates and monitors client keys"
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Custom Key String (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewCustomApiKey(generateRandomApiKey())}
                    className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 cursor-pointer transition-colors"
                    title="Generate random nr-api- key"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Random nr-api-</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={newCustomApiKey}
                    onChange={(e) => setNewCustomApiKey(e.target.value)}
                    placeholder="Leave blank to auto-generate nr-api-..."
                    className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600 pr-9"
                  />
                  {newCustomApiKey && (
                    <button
                      type="button"
                      onClick={() => setNewCustomApiKey("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
                      title="Clear"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-zinc-400">
                  Custom key will be formatted with <code className="font-mono font-semibold">nr-api-</code> prefix automatically.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="skeuo-btn px-3.5 py-2 rounded-md text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingApiKey}
                  className="skeuo-btn-primary px-4 py-2 rounded-md text-xs font-semibold cursor-pointer"
                >
                  {creatingApiKey ? "Creating..." : "Create API Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Manage Provider Permissions & Round-Robin for Existing Secret Key */}
      {activePermKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setActivePermKey(null)}
        >
          <div
            className="w-full max-w-lg skeuo-card p-6 max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* macOS Dot Header */}
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setActivePermKey(null)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Provider Access: {activePermKey.name}
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Owned by: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{activePermKey.apiKeyName || "Unassigned"}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions & Round Robin Toggle */}
            <div className="p-3 my-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Quick Access Controls
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleAllProvidersForActiveKey(true)}
                    className="skeuo-btn px-2.5 py-1 rounded text-[11px] font-medium text-emerald-600 dark:text-emerald-400 cursor-pointer"
                  >
                    Allow All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAllProvidersForActiveKey(false)}
                    className="skeuo-btn px-2.5 py-1 rounded text-[11px] font-medium text-red-500 cursor-pointer"
                  >
                    Block All (Default)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs flex items-center space-x-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Round Robin Providers (Same Model)</span>
                  </span>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    When multiple allowed providers have the requested model, rotate requests evenly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleRoundRobinForActiveKey}
                  className="p-1 cursor-pointer"
                  title="Toggle round-robin routing across providers with same model"
                >
                  {activePermKey.roundRobinProviders !== false ? (
                    <ToggleRight className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-zinc-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Providers List with Toggles */}
            <div className="flex-1 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 space-y-2 max-h-72">
              {upstreams.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No upstream providers configured in Neko-Router.
                </div>
              ) : (
                upstreams.map((u) => {
                  const allowedList = activePermKey.allowedProviders || [];
                  const isAllowed = allowedList.includes(u.id);

                  return (
                    <div
                      key={u.id}
                      className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                        isAllowed
                          ? "skeuo-card-subtle border-emerald-500/30"
                          : "bg-zinc-100/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                            {u.name}
                          </span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.provider === "openai"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {u.provider}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                          {u.baseUrl || "Official API"}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isAllowed
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {isAllowed ? "ALLOWED" : "OFF"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleProviderForActiveKey(u.id)}
                          className="p-1 cursor-pointer"
                        >
                          {isAllowed ? (
                            <ToggleRight className="w-6 h-6 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-zinc-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400 text-[11px]">
                {(activePermKey.allowedProviders || []).length} of {upstreams.length} providers allowed
              </span>
              <button
                type="button"
                onClick={() => setActivePermKey(null)}
                className="skeuo-btn-primary px-4 py-1.5 rounded-md font-semibold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientKeysTab;
