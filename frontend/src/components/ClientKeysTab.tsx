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
  Edit3,
  CheckCircle2,
  AlertCircle,
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

  // Modal State: Edit Secret Key (Limits, Name, Owner, Quota)
  const [editingSecretKey, setEditingSecretKey] = useState<ClientKeyItem | null>(null);
  const [editSecretName, setEditSecretName] = useState("");
  const [editSecretApiKeyId, setEditSecretApiKeyId] = useState("");
  const [editSecretRateLimitType, setEditSecretRateLimitType] = useState<"unlimited" | "custom">("unlimited");
  const [editSecretRateLimit, setEditSecretRateLimit] = useState<number | "">(60);
  const [editSecretTokenLimitType, setEditSecretTokenLimitType] = useState<"unlimited" | "custom">("unlimited");
  const [editSecretTokenLimit, setEditSecretTokenLimit] = useState<number | "">(1000000);
  const [editSecretUsedTokens, setEditSecretUsedTokens] = useState<number>(0);
  const [editSecretIsActive, setEditSecretIsActive] = useState<boolean>(true);
  const [savingSecretEdit, setSavingSecretEdit] = useState(false);
  const [secretEditError, setSecretEditError] = useState("");

  // Modal State: Rotate / Regenerate Secret Key
  const [rotatingSecretKey, setRotatingSecretKey] = useState<ClientKeyItem | null>(null);
  const [customRotateSecretKey, setCustomRotateSecretKey] = useState("");
  const [rotatingSecretLoading, setRotatingSecretLoading] = useState(false);
  const [rotatedSecretResult, setRotatedSecretResult] = useState<{ key: string; displayKey: string } | null>(null);
  const [rotateSecretError, setRotateSecretError] = useState("");

  // Modal State: Edit Router API Key
  const [editingApiKey, setEditingApiKey] = useState<ApiKeyItem | null>(null);
  const [editApiKeyName, setEditApiKeyName] = useState("");
  const [editApiKeyDesc, setEditApiKeyDesc] = useState("");
  const [savingApiKeyEdit, setSavingApiKeyEdit] = useState(false);
  const [apiKeyEditError, setApiKeyEditError] = useState("");

  // Modal State: Rotate Router API Key
  const [rotatingApiKey, setRotatingApiKey] = useState<ApiKeyItem | null>(null);
  const [customRotateApiKey, setCustomRotateApiKey] = useState("");
  const [rotatingApiKeyLoading, setRotatingApiKeyLoading] = useState(false);
  const [rotatedApiKeyResult, setRotatedApiKeyResult] = useState<{ key: string; displayKey: string } | null>(null);
  const [rotateApiKeyError, setRotateApiKeyError] = useState("");

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

  // --- Handlers: Edit Secret Key (Limits, Quota, Name, Owner) ---
  const openEditSecretModal = (k: ClientKeyItem) => {
    setEditingSecretKey(k);
    setEditSecretName(k.name);
    setEditSecretApiKeyId(k.apiKeyId || (routerApiKeys.length > 0 ? routerApiKeys[0].id : ""));
    const hasRate = k.rateLimit !== null && k.rateLimit !== undefined && k.rateLimit > 0;
    setEditSecretRateLimitType(hasRate ? "custom" : "unlimited");
    setEditSecretRateLimit(hasRate ? k.rateLimit! : 60);

    const hasToken = k.tokenLimit !== null && k.tokenLimit !== undefined && k.tokenLimit > 0;
    setEditSecretTokenLimitType(hasToken ? "custom" : "unlimited");
    setEditSecretTokenLimit(hasToken ? k.tokenLimit! : 1000000);

    setEditSecretUsedTokens(k.usedTokens || 0);
    setEditSecretIsActive(!!k.isActive);
    setSecretEditError("");
  };

  const handleSaveSecretEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSecretKey) return;
    setSavingSecretEdit(true);
    setSecretEditError("");

    try {
      const finalRateLimit =
        editSecretRateLimitType === "custom" && Number(editSecretRateLimit) > 0
          ? Number(editSecretRateLimit)
          : null;
      const finalTokenLimit =
        editSecretTokenLimitType === "custom" && Number(editSecretTokenLimit) > 0
          ? Number(editSecretTokenLimit)
          : null;

      await apiRequest(`/api/keys/${editingSecretKey.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editSecretName.trim(),
          apiKeyId: editSecretApiKeyId || null,
          rateLimit: finalRateLimit,
          tokenLimit: finalTokenLimit,
          usedTokens: Math.max(0, Number(editSecretUsedTokens) || 0),
          isActive: editSecretIsActive,
        }),
      });

      setEditingSecretKey(null);
      await loadData();
    } catch (err: any) {
      setSecretEditError(err.message || "Failed to update secret key");
    } finally {
      setSavingSecretEdit(false);
    }
  };

  const adjustEditTokenLimit = (delta: number) => {
    if (editSecretTokenLimitType === "unlimited") {
      setEditSecretTokenLimitType("custom");
      setEditSecretTokenLimit(Math.max(1000, 1000000 + delta));
    } else {
      const current = Number(editSecretTokenLimit) || 0;
      setEditSecretTokenLimit(Math.max(1000, current + delta));
    }
  };

  const setRateLimitPreset = (val: number | "unlimited") => {
    if (val === "unlimited") {
      setEditSecretRateLimitType("unlimited");
    } else {
      setEditSecretRateLimitType("custom");
      setEditSecretRateLimit(val);
    }
  };

  // --- Handlers: Rotate Secret Key ---
  const openRotateSecretModal = (k: ClientKeyItem) => {
    setRotatingSecretKey(k);
    setCustomRotateSecretKey("");
    setRotatedSecretResult(null);
    setRotateSecretError("");
  };

  const handleRotateSecretKey = async () => {
    if (!rotatingSecretKey) return;
    setRotatingSecretLoading(true);
    setRotateSecretError("");

    try {
      const res = await apiRequest<{ success: boolean; key: string; displayKey: string }>(
        `/api/keys/${rotatingSecretKey.id}/rotate`,
        {
          method: "POST",
          body: JSON.stringify({
            customKey: customRotateSecretKey.trim() || undefined,
          }),
        }
      );
      setRotatedSecretResult({ key: res.key, displayKey: res.displayKey });
      await loadData();
    } catch (err: any) {
      setRotateSecretError(err.message || "Failed to rotate secret key");
    } finally {
      setRotatingSecretLoading(false);
    }
  };

  // --- Handlers: Edit Router API Key ---
  const openEditApiKeyModal = (ak: ApiKeyItem) => {
    setEditingApiKey(ak);
    setEditApiKeyName(ak.name);
    setEditApiKeyDesc(ak.description || "");
    setApiKeyEditError("");
  };

  const handleSaveApiKeyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApiKey) return;
    setSavingApiKeyEdit(true);
    setApiKeyEditError("");

    try {
      await apiRequest(`/api/router-keys/${editingApiKey.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editApiKeyName.trim(),
          description: editApiKeyDesc.trim() || null,
        }),
      });
      setEditingApiKey(null);
      await loadData();
    } catch (err: any) {
      setApiKeyEditError(err.message || "Failed to update router API key");
    } finally {
      setSavingApiKeyEdit(false);
    }
  };

  // --- Handlers: Rotate Router API Key ---
  const openRotateApiKeyModal = (ak: ApiKeyItem) => {
    setRotatingApiKey(ak);
    setCustomRotateApiKey("");
    setRotatedApiKeyResult(null);
    setRotateApiKeyError("");
  };

  const handleRotateApiKey = async () => {
    if (!rotatingApiKey) return;
    setRotatingApiKeyLoading(true);
    setRotateApiKeyError("");

    try {
      const res = await apiRequest<{ success: boolean; key: string; displayKey: string }>(
        `/api/router-keys/${rotatingApiKey.id}/rotate`,
        {
          method: "POST",
          body: JSON.stringify({
            customKey: customRotateApiKey.trim() || undefined,
          }),
        }
      );
      setRotatedApiKeyResult({ key: res.key, displayKey: res.displayKey });
      await loadData();
    } catch (err: any) {
      setRotateApiKeyError(err.message || "Failed to rotate Router API key");
    } finally {
      setRotatingApiKeyLoading(false);
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

                          <td
                            className="px-5 py-3.5 min-w-40 cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 rounded transition-colors group"
                            onClick={() => openEditSecretModal(k)}
                            title="Click to edit token quota"
                          >
                            {hasTokenLimit ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                                    {(k.usedTokens || 0).toLocaleString()}
                                  </span>
                                  <span className="text-zinc-400 group-hover:text-indigo-500 transition-colors">
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
                              <span className="inline-flex items-center text-[11px] text-zinc-400 group-hover:text-indigo-500 transition-colors">
                                <Zap className="w-3 h-3 mr-1 text-zinc-400" />
                                Unlimited
                              </span>
                            )}
                          </td>

                          <td
                            className="px-5 py-3.5 text-[11px] cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 rounded transition-colors group"
                            onClick={() => openEditSecretModal(k)}
                            title="Click to edit rate limit"
                          >
                            {k.rateLimit ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium group-hover:border group-hover:border-indigo-500/40">
                                <Gauge className="w-3 h-3 mr-1 text-zinc-400" />
                                {k.rateLimit} req/m
                              </span>
                            ) : (
                              <span className="text-zinc-400 group-hover:text-indigo-500 transition-colors">Unlimited</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 font-semibold text-zinc-800 dark:text-zinc-200">
                            {k.totalRequests.toLocaleString()}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                onClick={() => openEditSecretModal(k)}
                                className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                                title="Edit key limits, quotas & name"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => openRotateSecretModal(k)}
                                className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-amber-500 dark:hover:text-amber-400 cursor-pointer transition-colors"
                                title="Rotate / Regenerate secret key string (sk-neko-...)"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>

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
                                onClick={() => openEditApiKeyModal(ak)}
                                className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 transition-colors cursor-pointer"
                                title="Edit Router API key details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openRotateApiKeyModal(ak)}
                                className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors cursor-pointer"
                                title="Rotate / Regenerate Router API key string (nr-api-...)"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
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

      {/* MODAL 4: Edit Secret Key Limits & Properties */}
      {editingSecretKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setEditingSecretKey(null)}
        >
          <div
            className="w-full max-w-lg skeuo-card p-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* macOS Dot Header */}
            <div className="flex items-center space-x-3 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setEditingSecretKey(null)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <div className="flex items-center justify-between flex-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-500" />
                  <span>Edit Key Limits: {editingSecretKey.name}</span>
                </h3>
                <span className="font-mono text-[11px] text-zinc-400">
                  {editingSecretKey.displayKey}
                </span>
              </div>
            </div>

            {secretEditError && (
              <div className="mb-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {secretEditError}
              </div>
            )}

            <form onSubmit={handleSaveSecretEdit} className="space-y-4 text-xs">
              {/* Key Label & Active Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Label / Application Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editSecretName}
                    onChange={(e) => setEditSecretName(e.target.value)}
                    className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditSecretIsActive(!editSecretIsActive)}
                    className={`w-full px-3 py-2 rounded-md border flex items-center justify-between font-semibold transition-colors cursor-pointer ${
                      editSecretIsActive
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400"
                    }`}
                  >
                    <span>{editSecretIsActive ? "Active" : "Disabled"}</span>
                    {editSecretIsActive ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Owner Router API Key */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Parent Router API Key (Owner)
                </label>
                <select
                  value={editSecretApiKeyId}
                  onChange={(e) => setEditSecretApiKeyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                  <option value="">Unassigned</option>
                  {routerApiKeys.map((ak) => (
                    <option key={ak.id} value={ak.id}>
                      {ak.name} ({ak.displayKey})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-zinc-400">
                  Select which router management key owns and administers this AI client key.
                </p>
              </div>

              {/* SECTION: Token Quota Limiter */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center space-x-1.5">
                      <Zap className="w-4 h-4 text-indigo-500" />
                      <span>Token Quota Limit</span>
                    </label>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Enforces maximum cumulative token consumption across all models.
                    </p>
                  </div>

                  {/* Mode Selector Pill */}
                  <div className="flex items-center p-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEditSecretTokenLimitType("unlimited")}
                      className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        editSecretTokenLimitType === "unlimited"
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      Unlimited
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSecretTokenLimitType("custom")}
                      className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        editSecretTokenLimitType === "custom"
                          ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      Custom Limit
                    </button>
                  </div>
                </div>

                {editSecretTokenLimitType === "custom" && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Allocated Token Limit:
                        </span>
                        {typeof editSecretTokenLimit === "number" && (
                          <span className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            {editSecretTokenLimit.toLocaleString()} tokens
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min={1}
                        required
                        value={editSecretTokenLimit}
                        onChange={(e) =>
                          setEditSecretTokenLimit(e.target.value ? Number(e.target.value) : "")
                        }
                        placeholder="e.g. 1000000"
                        className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                      />
                    </div>

                    {/* Quick Delta Buttons to Add/Subtract Quota */}
                    <div>
                      <span className="text-[10px] text-zinc-400 block mb-1">
                        Quick Adjust Token Quota (Add / Subtract):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustEditTokenLimit(100000)}
                          className="skeuo-btn px-2 py-0.5 rounded text-[10px] font-mono text-emerald-600 dark:text-emerald-400 cursor-pointer"
                        >
                          +100K
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustEditTokenLimit(500000)}
                          className="skeuo-btn px-2 py-0.5 rounded text-[10px] font-mono text-emerald-600 dark:text-emerald-400 cursor-pointer"
                        >
                          +500K
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustEditTokenLimit(1000000)}
                          className="skeuo-btn px-2 py-0.5 rounded text-[10px] font-mono text-emerald-600 dark:text-emerald-400 cursor-pointer font-bold"
                        >
                          +1M
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustEditTokenLimit(5000000)}
                          className="skeuo-btn px-2 py-0.5 rounded text-[10px] font-mono text-emerald-600 dark:text-emerald-400 cursor-pointer font-bold"
                        >
                          +5M
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustEditTokenLimit(-100000)}
                          className="skeuo-btn px-2 py-0.5 rounded text-[10px] font-mono text-red-500 cursor-pointer"
                        >
                          -100K
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustEditTokenLimit(-500000)}
                          className="skeuo-btn px-2 py-0.5 rounded text-[10px] font-mono text-red-500 cursor-pointer"
                        >
                          -500K
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Token Usage & Reset Used Tokens Control */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Consumed Usage:
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {editSecretUsedTokens.toLocaleString()} tokens
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditSecretUsedTokens(0)}
                        className="text-[10px] px-2 py-0.5 rounded skeuo-btn text-indigo-600 dark:text-indigo-400 cursor-pointer flex items-center space-x-1"
                        title="Reset consumed tokens counter back to 0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset to 0</span>
                      </button>
                    </div>
                  </div>
                  {editSecretTokenLimitType === "custom" && Number(editSecretTokenLimit) > 0 && (
                    <div className="w-full h-1.5 rounded-sm bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-sm transition-all ${
                          editSecretUsedTokens >= Number(editSecretTokenLimit)
                            ? "bg-red-500"
                            : (editSecretUsedTokens / Number(editSecretTokenLimit)) * 100 > 80
                            ? "bg-amber-500"
                            : "bg-indigo-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (editSecretUsedTokens / Number(editSecretTokenLimit || 1)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: Rate Limit (req/min) */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center space-x-1.5">
                      <Gauge className="w-4 h-4 text-emerald-500" />
                      <span>Rate Limit (req/min)</span>
                    </label>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Sliding 60-second window maximum request frequency limit.
                    </p>
                  </div>

                  {/* Mode Selector Pill */}
                  <div className="flex items-center p-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRateLimitPreset("unlimited")}
                      className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        editSecretRateLimitType === "unlimited"
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      Unlimited
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditSecretRateLimitType("custom");
                        if (!editSecretRateLimit) setEditSecretRateLimit(60);
                      }}
                      className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        editSecretRateLimitType === "custom"
                          ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      Custom Limit
                    </button>
                  </div>
                </div>

                {editSecretRateLimitType === "custom" && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="number"
                      min={1}
                      required
                      value={editSecretRateLimit}
                      onChange={(e) =>
                        setEditSecretRateLimit(e.target.value ? Number(e.target.value) : "")
                      }
                      placeholder="e.g. 60"
                      className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    />

                    {/* Presets */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-zinc-400">Presets:</span>
                      {[15, 30, 60, 120, 300].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRateLimitPreset(preset)}
                          className={`skeuo-btn px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                            editSecretRateLimit === preset
                              ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold"
                              : "text-zinc-500"
                          }`}
                        >
                          {preset}/m
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingSecretKey(null)}
                  className="skeuo-btn px-3.5 py-2 rounded-md text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSecretEdit}
                  className="skeuo-btn-primary px-4 py-2 rounded-md text-xs font-semibold cursor-pointer flex items-center space-x-1.5"
                >
                  {savingSecretEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Rotate / Regenerate Secret Key */}
      {rotatingSecretKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => {
            if (!rotatingSecretLoading) setRotatingSecretKey(null);
          }}
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
                  onClick={() => setRotatingSecretKey(null)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                <RotateCw className="w-4 h-4 text-amber-500" />
                <span>Rotate Secret Key: {rotatingSecretKey.name}</span>
              </h3>
            </div>

            {rotateSecretError && (
              <div className="mb-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {rotateSecretError}
              </div>
            )}

            {!rotatedSecretResult ? (
              <div className="space-y-4 text-xs">
                {/* Security Warning Notice */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 space-y-1.5">
                  <div className="flex items-center space-x-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Immediate Invalidation Warning</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-300/90">
                    Regenerating this key will immediately revoke the current key (
                    <code className="font-mono">{rotatingSecretKey.displayKey}</code>).
                    Any downstream applications, AI SDKs, or IDE extensions (Cursor, Cline, OpenAI
                    SDK) actively using it will immediately receive 401 Unauthorized errors until updated with the new key.
                  </p>
                </div>

                {/* Optional Custom Key string */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Custom New Key (optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomRotateSecretKey(generateRandomSecretKey())}
                      className="text-[11px] font-mono text-orange-500 hover:text-orange-400 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Random sk-neko-</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={customRotateSecretKey}
                      onChange={(e) => setCustomRotateSecretKey(e.target.value)}
                      placeholder="Leave blank to auto-generate a secure random sk-neko-..."
                      className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600 pr-9"
                    />
                    {customRotateSecretKey && (
                      <button
                        type="button"
                        onClick={() => setCustomRotateSecretKey("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
                        title="Clear"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    If left blank, a cryptographically secure 28-character key will be generated.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setRotatingSecretKey(null)}
                    disabled={rotatingSecretLoading}
                    className="skeuo-btn px-3.5 py-2 rounded-md text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRotateSecretKey}
                    disabled={rotatingSecretLoading}
                    className="skeuo-btn px-4 py-2 rounded-md text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 border border-amber-700 cursor-pointer flex items-center space-x-1.5"
                  >
                    {rotatingSecretLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Rotating...</span>
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Confirm & Rotate Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Success State after Rotation */
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Secret Key Rotated Successfully!</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-300/90">
                    The old key has been permanently invalidated. Copy the new key below and update your application.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    New Secret Key:
                  </label>
                  <div className="flex items-center space-x-2 p-2.5 rounded-lg skeuo-inset bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs text-zinc-900 dark:text-zinc-100 break-all">
                    <span className="flex-1 select-all">{rotatedSecretResult.key}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(rotatedSecretResult.key, "rotated-sk")}
                      className="skeuo-btn px-3 py-1.5 rounded-md font-semibold text-xs text-indigo-600 dark:text-indigo-400 flex items-center space-x-1 shrink-0 cursor-pointer"
                    >
                      {copiedId === "rotated-sk" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setRotatingSecretKey(null)}
                    className="skeuo-btn-primary px-4 py-2 rounded-md text-xs font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 6: Edit Router API Key */}
      {editingApiKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setEditingApiKey(null)}
        >
          <div
            className="w-full max-w-lg skeuo-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setEditingApiKey(null)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                <Edit3 className="w-4 h-4 text-emerald-500" />
                <span>Edit Router API Key: {editingApiKey.name}</span>
              </h3>
            </div>

            {apiKeyEditError && (
              <div className="mb-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {apiKeyEditError}
              </div>
            )}

            <form onSubmit={handleSaveApiKeyEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  API Key Name / Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={editApiKeyName}
                  onChange={(e) => setEditApiKeyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Description / Note
                </label>
                <textarea
                  rows={2}
                  value={editApiKeyDesc}
                  onChange={(e) => setEditApiKeyDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingApiKey(null)}
                  className="skeuo-btn px-3.5 py-2 rounded-md text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingApiKeyEdit}
                  className="skeuo-btn-primary px-4 py-2 rounded-md text-xs font-semibold cursor-pointer"
                >
                  {savingApiKeyEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: Rotate Router API Key */}
      {rotatingApiKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => {
            if (!rotatingApiKeyLoading) setRotatingApiKey(null);
          }}
        >
          <div
            className="w-full max-w-lg skeuo-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setRotatingApiKey(null)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                <RotateCw className="w-4 h-4 text-amber-500" />
                <span>Rotate Router API Key: {rotatingApiKey.name}</span>
              </h3>
            </div>

            {rotateApiKeyError && (
              <div className="mb-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {rotateApiKeyError}
              </div>
            )}

            {!rotatedApiKeyResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 space-y-1.5">
                  <div className="flex items-center space-x-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Invalidation Warning</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-300/90">
                    Regenerating this Router API Key will immediately revoke <code className="font-mono">{rotatingApiKey.displayKey}</code>. External scripts or automations using this key to access management APIs will fail until updated.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                      Custom New Key (optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomRotateApiKey(generateRandomApiKey())}
                      className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Random nr-api-</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customRotateApiKey}
                    onChange={(e) => setCustomRotateApiKey(e.target.value)}
                    placeholder="Leave blank to auto-generate nr-api-..."
                    className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setRotatingApiKey(null)}
                    disabled={rotatingApiKeyLoading}
                    className="skeuo-btn px-3.5 py-2 rounded-md text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRotateApiKey}
                    disabled={rotatingApiKeyLoading}
                    className="skeuo-btn px-4 py-2 rounded-md text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 border border-amber-700 cursor-pointer flex items-center space-x-1.5"
                  >
                    {rotatingApiKeyLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Rotating...</span>
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Confirm & Rotate Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Router API Key Rotated Successfully!</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-300/90">
                    The previous key has been revoked. Copy your new integration key below.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    New Integration API Key:
                  </label>
                  <div className="flex items-center space-x-2 p-2.5 rounded-lg skeuo-inset bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs text-zinc-900 dark:text-zinc-100 break-all">
                    <span className="flex-1 select-all">{rotatedApiKeyResult.key}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(rotatedApiKeyResult.key, "rotated-ak")}
                      className="skeuo-btn px-3 py-1.5 rounded-md font-semibold text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 shrink-0 cursor-pointer"
                    >
                      {copiedId === "rotated-ak" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setRotatingApiKey(null)}
                    className="skeuo-btn-primary px-4 py-2 rounded-md text-xs font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientKeysTab;
