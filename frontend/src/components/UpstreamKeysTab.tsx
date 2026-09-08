import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Wifi,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit3,
  Cpu,
  Search,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  RotateCw,
  Loader2,
  Bot,
  Table,
  LayoutGrid,
  UploadCloud,
} from "lucide-react";
import {
  apiRequest,
  type UpstreamKeyItem,
  type UpstreamModelItem,
  type UpstreamKeyEntryItem,
} from "../lib/api";

interface FormKeyEntry {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  showSecret?: boolean;
  testing?: boolean;
  testResult?: { success: boolean; latencyMs?: number; error?: string } | null;
}

interface ProviderPreset {
  id: string;
  name: string;
  provider: "openai" | "anthropic";
  baseUrl: string;
  iconBg: string;
  category: "api_key" | "free_tier";
  domainMatch?: string;
  badge?: string;
}

const PRESET_PROVIDERS: ProviderPreset[] = [
  // API Key Providers
  {
    id: "openai",
    name: "OpenAI",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    iconBg: "bg-emerald-600",
    category: "api_key",
    domainMatch: "openai.com",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    iconBg: "bg-amber-600",
    category: "api_key",
    domainMatch: "anthropic.com",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    provider: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    iconBg: "bg-blue-600",
    category: "api_key",
    domainMatch: "deepseek.com",
  },
  {
    id: "groq",
    name: "Groq",
    provider: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    iconBg: "bg-orange-600",
    category: "api_key",
    domainMatch: "groq.com",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    provider: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    iconBg: "bg-purple-600",
    category: "api_key",
    domainMatch: "openrouter.ai",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    provider: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    iconBg: "bg-blue-500",
    category: "api_key",
    domainMatch: "googleapis.com",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    provider: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    iconBg: "bg-rose-600",
    category: "api_key",
    domainMatch: "cerebras.ai",
  },
  {
    id: "cohere",
    name: "Cohere",
    provider: "openai",
    baseUrl: "https://api.cohere.com/v2",
    iconBg: "bg-teal-600",
    category: "api_key",
    domainMatch: "cohere.com",
  },
  {
    id: "together",
    name: "Together AI",
    provider: "openai",
    baseUrl: "https://api.together.xyz/v1",
    iconBg: "bg-cyan-600",
    category: "api_key",
    domainMatch: "together.xyz",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    provider: "openai",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    iconBg: "bg-red-600",
    category: "api_key",
    domainMatch: "fireworks.ai",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    provider: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    iconBg: "bg-yellow-600",
    category: "api_key",
    domainMatch: "mistral.ai",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    provider: "openai",
    baseUrl: "https://api.perplexity.ai",
    iconBg: "bg-indigo-600",
    category: "api_key",
    domainMatch: "perplexity.ai",
  },
  {
    id: "alibaba",
    name: "Alibaba (Qwen)",
    provider: "openai",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    iconBg: "bg-orange-500",
    category: "api_key",
    domainMatch: "aliyuncs.com",
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    provider: "openai",
    baseUrl: "https://your-resource.openai.azure.com/openai/deployments",
    iconBg: "bg-sky-600",
    category: "api_key",
    domainMatch: "azure.com",
  },

  // Free Tier / Local Providers
  {
    id: "ollama",
    name: "Ollama Local",
    provider: "openai",
    baseUrl: "http://localhost:11434/v1",
    iconBg: "bg-zinc-700",
    category: "free_tier",
    domainMatch: "localhost:11434",
  },
  {
    id: "vllm",
    name: "vLLM Server",
    provider: "openai",
    baseUrl: "http://localhost:8000/v1",
    iconBg: "bg-violet-700",
    category: "free_tier",
    domainMatch: "localhost:8000",
  },
  {
    id: "cloudflare",
    name: "Cloudflare AI",
    provider: "openai",
    baseUrl: "https://gateway.ai.cloudflare.com/v1",
    iconBg: "bg-amber-600",
    category: "free_tier",
    domainMatch: "cloudflare.com",
  },
  {
    id: "opencode",
    name: "OpenCode Free",
    provider: "openai",
    baseUrl: "https://api.opencode.ai/v1",
    iconBg: "bg-emerald-700",
    category: "free_tier",
    domainMatch: "opencode.ai",
  },
];

export const UpstreamKeysTab: React.FC = () => {
  const [upstreams, setUpstreams] = useState<UpstreamKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [testingId, setTestingId] = useState<string | null>(null);

  // Add / Edit Modal State (9Router style)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUpstream, setEditingUpstream] = useState<UpstreamKeyItem | null>(null);
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [alias, setAlias] = useState("");
  const [prefix, setPrefix] = useState("");
  const [apiType, setApiType] = useState("Chat Completions");
  const [formKeys, setFormKeys] = useState<FormKeyEntry[]>([
    { id: "k_1", name: "Prod Key", key: "", isActive: true, showSecret: false },
  ]);
  const [baseUrl, setBaseUrl] = useState("");
  const [weight, setWeight] = useState(1);
  const [roundRobin, setRoundRobin] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [checkStatus, setCheckStatus] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);
  const [modalError, setModalError] = useState("");

  // Models Manager Modal State
  const [activeModelsUpstream, setActiveModelsUpstream] = useState<UpstreamKeyItem | null>(null);
  const [modelsList, setModelsList] = useState<UpstreamModelItem[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelsSearch, setModelsSearch] = useState("");
  const [modelsError, setModelsError] = useState("");
  const [togglingModelId, setTogglingModelId] = useState<string | null>(null);

  // Dedicated Connections Manager Modal State (9Router style)
  const [activeConnectionsUpstream, setActiveConnectionsUpstream] = useState<UpstreamKeyItem | null>(null);
  const [connectionsList, setConnectionsList] = useState<UpstreamKeyEntryItem[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [testingOneByOne, setTestingOneByOne] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<
    Record<string, { testing?: boolean; success?: boolean; latencyMs?: number; error?: string }>
  >({});
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [newConnName, setNewConnName] = useState("");
  const [newConnKey, setNewConnKey] = useState("");
  const [newConnActive, setNewConnActive] = useState(true);
  const [addingConnError, setAddingConnError] = useState("");

  // Dedicated Mass Import in Connections Modal
  const [isMassImportOpen, setIsMassImportOpen] = useState(false);
  const [massImportText, setMassImportText] = useState("");
  const [massImportPrefix, setMassImportPrefix] = useState("API Key");
  const [massImportActive, setMassImportActive] = useState(true);
  const [massImportSkipDuplicates, setMassImportSkipDuplicates] = useState(true);
  const [massImportLoading, setMassImportLoading] = useState(false);
  const [massImportError, setMassImportError] = useState("");
  const [massImportSuccess, setMassImportSuccess] = useState("");

  // Quick Bulk Paste in Create/Edit Provider Modal
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");

  const loadUpstreams = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ upstreams: UpstreamKeyItem[] }>("/api/upstreams");
      setUpstreams(data.upstreams);

      if (activeModelsUpstream) {
        const found = data.upstreams.find((u) => u.id === activeModelsUpstream.id);
        if (found) {
          setActiveModelsUpstream(found);
          setModelsList(found.models || []);
        }
      }

      if (activeConnectionsUpstream) {
        const found = data.upstreams.find((u) => u.id === activeConnectionsUpstream.id);
        if (found) {
          setActiveConnectionsUpstream(found);
          setConnectionsList(found.keyEntries || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpstreams();
  }, []);

  const handleGenerateAlias = async () => {
    try {
      const data = await apiRequest<{ alias: string }>("/api/upstreams/generate-alias");
      setAlias(data.alias);
      setPrefix(data.alias.slice(0, 8).toLowerCase());
    } catch (e) {
      const rand = `node-${Math.floor(100 + Math.random() * 900)}`;
      setAlias(rand);
      setPrefix(rand);
    }
  };

  const openCreateModal = (preset?: Partial<ProviderPreset> | "openai" | "anthropic") => {
    setEditingUpstream(null);
    setCheckStatus(null);
    setModalError("");

    if (preset === "anthropic") {
      setProvider("anthropic");
      setAlias("Anthropic Claude");
      setPrefix("claude");
      setBaseUrl("https://api.anthropic.com");
    } else if (preset === "openai" || !preset) {
      setProvider("openai");
      setAlias("");
      setPrefix("");
      setBaseUrl("https://api.openai.com/v1");
      handleGenerateAlias();
    } else {
      setProvider(preset.provider || "openai");
      setAlias(preset.name || "");
      setPrefix((preset.id || preset.name || "node").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8));
      setBaseUrl(preset.baseUrl || "");
    }

    setApiType("Chat Completions");
    setWeight(1);
    setRoundRobin(true);
    setFormKeys([
      { id: `k_${Date.now()}`, name: "Prod Key", key: "", isActive: true, showSecret: false },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = async (item: UpstreamKeyItem) => {
    setEditingUpstream(item);
    setProvider(item.provider);
    setAlias(item.name);
    setPrefix(item.prefix || "");
    setBaseUrl(item.baseUrl || "");
    setWeight(item.weight || 1);
    setRoundRobin(item.roundRobin !== false);
    setCheckStatus(null);
    setModalError("");
    setIsModalOpen(true);

    try {
      const res = await apiRequest<{ upstream: UpstreamKeyItem }>(`/api/upstreams/${item.id}`);
      if (res.upstream?.keyEntries && res.upstream.keyEntries.length > 0) {
        setFormKeys(
          res.upstream.keyEntries.map((e, idx) => ({
            id: e.id || `k_${idx + 1}`,
            name: e.name || `API Key #${idx + 1}`,
            key: e.key || "",
            isActive: e.isActive !== false,
            showSecret: false,
          }))
        );
      } else {
        const fallback = res.upstream?.apiKey || item.apiKey || "";
        setFormKeys([
          { id: "k_1", name: "Prod Key", key: fallback, isActive: true, showSecret: false },
        ]);
      }
    } catch (e) {
      setFormKeys([
        { id: "k_1", name: "Prod Key", key: item.apiKey || "", isActive: true, showSecret: false },
      ]);
    }
  };

  const handleKeyNameChange = (index: number, val: string) => {
    const updated = [...formKeys];
    updated[index] = { ...updated[index], name: val };
    setFormKeys(updated);
  };

  const handleKeyValChange = (index: number, val: string) => {
    if (val.includes("\n") || val.includes(",")) {
      const splitKeys = val
        .split(/[\n,]+/)
        .map((k) => k.trim())
        .filter(Boolean);
      if (splitKeys.length > 1) {
        const updated = [...formKeys];
        const currentItem = updated[index];
        const newItems: FormKeyEntry[] = splitKeys.map((k, i) => ({
          id: `k_${Date.now()}_${i}`,
          name: i === 0 && currentItem?.name ? currentItem.name : `API Key #${updated.length + i}`,
          key: k,
          isActive: true,
          showSecret: false,
        }));
        updated.splice(index, 1, ...newItems);
        setFormKeys(updated);
        return;
      }
    }

    const updated = [...formKeys];
    updated[index] = { ...updated[index], key: val, testResult: null };
    setFormKeys(updated);
  };

  const handleToggleKeyActive = (index: number) => {
    const updated = [...formKeys];
    updated[index] = { ...updated[index], isActive: !updated[index].isActive };
    setFormKeys(updated);
  };

  const handleToggleShowSecret = (index: number) => {
    const updated = [...formKeys];
    updated[index] = { ...updated[index], showSecret: !updated[index].showSecret };
    setFormKeys(updated);
  };

  const handleAddKey = () => {
    setFormKeys([
      ...formKeys,
      {
        id: `k_${Date.now()}`,
        name: `API Key #${formKeys.length + 1}`,
        key: "",
        isActive: true,
        showSecret: false,
      },
    ]);
  };

  const handleRemoveKey = (index: number) => {
    if (formKeys.length <= 1) {
      setFormKeys([
        { id: `k_${Date.now()}`, name: "Primary Key", key: "", isActive: true, showSecret: false },
      ]);
      return;
    }
    setFormKeys(formKeys.filter((_, i) => i !== index));
  };

  // Check connection button inside Modal (9Router style)
  const handleCheckConnectionInModal = async () => {
    const firstKey = formKeys.find((k) => k.key.trim().length > 0);
    if (!firstKey) {
      setModalError("Please enter an API key to check connection");
      return;
    }

    setCheckingConnection(true);
    setCheckStatus(null);
    setModalError("");

    try {
      const res = await apiRequest<{
        success: boolean;
        latencyMs?: number;
        error?: string;
      }>("/api/upstreams/test-key", {
        method: "POST",
        body: JSON.stringify({
          provider,
          baseUrl: baseUrl || null,
          apiKey: firstKey.key.trim(),
        }),
      });

      setCheckStatus(res);
    } catch (e: any) {
      setCheckStatus({ success: false, error: e.message || "Connection check failed" });
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleSaveUpstream = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    const cleanKeys = formKeys
      .filter((k) => k.key.trim().length > 0)
      .map((k, idx) => ({
        id: k.id || `key_${Date.now()}_${idx}`,
        name: k.name.trim() || `API Key #${idx + 1}`,
        key: k.key.trim(),
        isActive: k.isActive,
      }));

    if (cleanKeys.length === 0) {
      setModalError("Please provide at least one valid API Key");
      return;
    }

    setSaving(true);
    try {
      if (editingUpstream) {
        await apiRequest(`/api/upstreams/${editingUpstream.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            provider,
            name: alias,
            prefix: prefix ? prefix.trim() : null,
            keyEntries: cleanKeys,
            baseUrl: baseUrl || null,
            weight,
            roundRobin,
          }),
        });
      } else {
        await apiRequest("/api/upstreams", {
          method: "POST",
          body: JSON.stringify({
            provider,
            name: alias,
            prefix: prefix ? prefix.trim() : null,
            keyEntries: cleanKeys,
            baseUrl: baseUrl || undefined,
            weight,
            roundRobin,
          }),
        });
      }
      setIsModalOpen(false);
      await loadUpstreams();
    } catch (err: any) {
      setModalError(err.message || "Failed to save upstream provider");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: UpstreamKeyItem) => {
    try {
      await apiRequest(`/api/upstreams/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      await loadUpstreams();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this upstream provider?")) return;
    try {
      await apiRequest(`/api/upstreams/${id}`, { method: "DELETE" });
      await loadUpstreams();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      await apiRequest(`/api/upstreams/${id}/test`, { method: "POST" });
      await loadUpstreams();
    } catch (e) {
      console.error(e);
    } finally {
      setTestingId(null);
    }
  };

  // --- Dedicated Connections Management Modal (9Router style) ---
  const openConnectionsModal = async (item: UpstreamKeyItem) => {
    setActiveConnectionsUpstream(item);
    setConnectionsList(item.keyEntries || []);
    setKeyTestStatus({});
    setIsAddingConnection(false);
    setIsMassImportOpen(false);
    setMassImportText("");
    setMassImportError("");
    setMassImportSuccess("");
    setNewConnName("");
    setNewConnKey("");
    setNewConnActive(true);
    setAddingConnError("");
    setLoadingConnections(true);

    try {
      const res = await apiRequest<{ upstream: UpstreamKeyItem }>(`/api/upstreams/${item.id}`);
      if (res.upstream) {
        setActiveConnectionsUpstream(res.upstream);
        setConnectionsList(res.upstream.keyEntries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleToggleConnectionKey = async (keyId: string, currentActive: boolean) => {
    if (!activeConnectionsUpstream) return;

    setConnectionsList((prev) =>
      prev.map((k) => (k.id === keyId ? { ...k, isActive: !currentActive } : k))
    );

    try {
      await apiRequest(`/api/upstreams/${activeConnectionsUpstream.id}/keys/toggle`, {
        method: "POST",
        body: JSON.stringify({ keyId, isActive: !currentActive }),
      });
      await loadUpstreams();
    } catch (e) {
      console.error(e);
      setConnectionsList(connectionsList);
    }
  };

  const handleToggleRoundRobinInConnections = async () => {
    if (!activeConnectionsUpstream) return;
    const nextVal = !activeConnectionsUpstream.roundRobin;

    setActiveConnectionsUpstream({
      ...activeConnectionsUpstream,
      roundRobin: nextVal,
    });

    try {
      await apiRequest(`/api/upstreams/${activeConnectionsUpstream.id}`, {
        method: "PATCH",
        body: JSON.stringify({ roundRobin: nextVal }),
      });
      await loadUpstreams();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestKeyInConnections = async (keyId: string) => {
    if (!activeConnectionsUpstream) return;

    setKeyTestStatus((prev) => ({
      ...prev,
      [keyId]: { testing: true },
    }));

    try {
      const res = await apiRequest<{
        success: boolean;
        latencyMs?: number;
        error?: string;
      }>(`/api/upstreams/${activeConnectionsUpstream.id}/keys/${keyId}/test`, {
        method: "POST",
      });

      setKeyTestStatus((prev) => ({
        ...prev,
        [keyId]: { testing: false, ...res },
      }));
    } catch (e: any) {
      setKeyTestStatus((prev) => ({
        ...prev,
        [keyId]: { testing: false, success: false, error: e.message || "Test failed" },
      }));
    }
  };

  const handleTestOneByOne = async () => {
    if (!activeConnectionsUpstream) return;
    setTestingOneByOne(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        results: Array<{
          id: string;
          name: string;
          success: boolean;
          latencyMs?: number;
          error?: string;
        }>;
      }>(`/api/upstreams/${activeConnectionsUpstream.id}/test-all`, {
        method: "POST",
      });

      const nextStatus: Record<string, { testing?: boolean; success?: boolean; latencyMs?: number; error?: string }> = {};
      for (const r of res.results) {
        nextStatus[r.id] = {
          testing: false,
          success: r.success,
          latencyMs: r.latencyMs,
          error: r.error,
        };
      }
      setKeyTestStatus(nextStatus);
    } catch (e: any) {
      console.error(e);
    } finally {
      setTestingOneByOne(false);
    }
  };

  const handleSaveNewConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConnectionsUpstream) return;
    setAddingConnError("");

    const trimmedKey = newConnKey.trim();
    if (!trimmedKey) {
      setAddingConnError("API key cannot be empty");
      return;
    }

    try {
      const res = await apiRequest<{
        success: boolean;
        addedCount: number;
        totalKeysCount: number;
        activeKeysCount: number;
        keyEntries: UpstreamKeyEntryItem[];
      }>(`/api/upstreams/${activeConnectionsUpstream.id}/keys`, {
        method: "POST",
        body: JSON.stringify({
          name: newConnName.trim() || undefined,
          key: trimmedKey,
          isActive: newConnActive,
        }),
      });

      if (res.keyEntries) {
        setConnectionsList(res.keyEntries);
      }
      setIsAddingConnection(false);
      setNewConnName("");
      setNewConnKey("");
      setNewConnActive(true);
      await loadUpstreams();
    } catch (err: any) {
      setAddingConnError(err.message || "Failed to add API key");
    }
  };

  const handleDeleteConnectionKey = async (keyId: string) => {
    if (!activeConnectionsUpstream) return;
    if (connectionsList.length <= 1) {
      alert("Provider must keep at least one API key configured.");
      return;
    }

    if (!confirm("Are you sure you want to remove this connection key?")) return;

    try {
      const res = await apiRequest<{
        success: boolean;
        keyEntries: UpstreamKeyEntryItem[];
      }>(`/api/upstreams/${activeConnectionsUpstream.id}/keys/${keyId}`, {
        method: "DELETE",
      });

      if (res.keyEntries) {
        setConnectionsList(res.keyEntries);
      }
      await loadUpstreams();
    } catch (e: any) {
      alert(e.message || "Failed to delete connection key");
      await loadUpstreams();
    }
  };

  const detectedKeysCount = useMemo(() => {
    if (!massImportText || !massImportText.trim()) return 0;
    const lines = massImportText.split(/\r?\n/);
    let count = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.includes(",") && !trimmed.includes(":")) {
        const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
        count += parts.length;
      } else {
        count += 1;
      }
    }
    return count;
  }, [massImportText]);

  const handleMassImportKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConnectionsUpstream) return;
    setMassImportError("");
    setMassImportSuccess("");

    if (detectedKeysCount === 0) {
      setMassImportError("Please paste at least one valid API key");
      return;
    }

    setMassImportLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        importedCount: number;
        duplicatesSkipped: number;
        message: string;
        keyEntries: UpstreamKeyEntryItem[];
      }>(`/api/upstreams/${activeConnectionsUpstream.id}/keys/import`, {
        method: "POST",
        body: JSON.stringify({
          rawKeys: massImportText,
          namePrefix: massImportPrefix.trim() || "API Key",
          defaultActive: massImportActive,
          skipDuplicates: massImportSkipDuplicates,
        }),
      });

      if (res.keyEntries) {
        setConnectionsList(res.keyEntries);
      }
      setMassImportSuccess(res.message || `Successfully imported ${res.importedCount} keys`);
      setMassImportText("");
      await loadUpstreams();
    } catch (err: any) {
      setMassImportError(err.message || "Failed to import keys");
    } finally {
      setMassImportLoading(false);
    }
  };

  const handleBulkPasteIntoForm = () => {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText.split(/\r?\n/);
    const newItems: FormKeyEntry[] = [];
    let count = formKeys.length;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.includes(",") && !trimmed.includes(":")) {
        const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
        for (const p of parts) {
          count++;
          newItems.push({
            id: `k_${Date.now()}_${count}`,
            name: `API Key #${count}`,
            key: p.replace(/^["']|["']$/g, "").trim(),
            isActive: true,
            showSecret: false,
          });
        }
      } else {
        const match = trimmed.match(/^([^:=]+)[:=]\s*(.+)$/);
        if (match) {
          newItems.push({
            id: `k_${Date.now()}_${++count}`,
            name: match[1]!.trim(),
            key: match[2]!.trim().replace(/^[,"';]+|[,"';]+$/g, ""),
            isActive: true,
            showSecret: false,
          });
        } else {
          newItems.push({
            id: `k_${Date.now()}_${++count}`,
            name: `API Key #${count}`,
            key: trimmed.replace(/^[,"';]+|[,"';]+$/g, ""),
            isActive: true,
            showSecret: false,
          });
        }
      }
    }

    if (newItems.length > 0) {
      const existing = formKeys.filter((k) => k.key.trim().length > 0);
      setFormKeys([...existing, ...newItems]);
      setBulkPasteText("");
      setIsBulkPasteOpen(false);
    }
  };

  // --- Models Management Modal ---
  const openModelsModal = (item: UpstreamKeyItem) => {
    setActiveModelsUpstream(item);
    setModelsList(item.models || []);
    setModelsSearch("");
    setModelsError("");
  };

  const handleFetchModels = async () => {
    if (!activeModelsUpstream) return;
    setFetchingModels(true);
    setModelsError("");

    try {
      const res = await apiRequest<{
        success: boolean;
        models: UpstreamModelItem[];
        count: number;
        enabledCount: number;
        error?: string;
      }>(`/api/upstreams/${activeModelsUpstream.id}/fetch-models`, {
        method: "POST",
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to fetch models");
      }

      setModelsList(res.models);
      await loadUpstreams();
    } catch (err: any) {
      setModelsError(err.message || "Failed to fetch models from provider");
    } finally {
      setFetchingModels(false);
    }
  };

  const handleToggleModel = async (modelId: string, currentEnabled: boolean) => {
    if (!activeModelsUpstream) return;
    setTogglingModelId(modelId);

    const updated = modelsList.map((m) =>
      m.id === modelId ? { ...m, enabled: !currentEnabled } : m
    );
    setModelsList(updated);

    try {
      await apiRequest(`/api/upstreams/${activeModelsUpstream.id}/models/toggle`, {
        method: "POST",
        body: JSON.stringify({ modelId, enabled: !currentEnabled }),
      });
      await loadUpstreams();
    } catch (err) {
      console.error(err);
      setModelsList(modelsList);
    } finally {
      setTogglingModelId(null);
    }
  };

  const handleToggleAllModels = async (enableAll: boolean) => {
    if (!activeModelsUpstream) return;
    const updated = modelsList.map((m) => ({ ...m, enabled: enableAll }));
    setModelsList(updated);

    try {
      await apiRequest(`/api/upstreams/${activeModelsUpstream.id}/models/toggle`, {
        method: "POST",
        body: JSON.stringify(enableAll ? { enableAll: true } : { disableAll: true }),
      });
      await loadUpstreams();
    } catch (err) {
      console.error(err);
      setModelsList(modelsList);
    }
  };

  const filteredModels = modelsList.filter((m) =>
    m.id.toLowerCase().includes(modelsSearch.toLowerCase().trim())
  );

  const totalEnabledInModal = modelsList.filter((m) => m.enabled).length;

  // Filtered Upstreams & Presets based on Search Query
  const query = searchQuery.toLowerCase().trim();

  // Matched Custom Upstreams
  const filteredCustomUpstreams = useMemo(() => {
    return upstreams.filter((u) => {
      if (!query) return true;
      return (
        u.name.toLowerCase().includes(query) ||
        u.provider.toLowerCase().includes(query) ||
        (u.baseUrl && u.baseUrl.toLowerCase().includes(query))
      );
    });
  }, [upstreams, query]);

  // Preset lookup helper
  const findUpstreamForPreset = (preset: ProviderPreset) => {
    return upstreams.find((u) => {
      if (preset.domainMatch && u.baseUrl && u.baseUrl.toLowerCase().includes(preset.domainMatch)) {
        return true;
      }
      return u.name.toLowerCase().includes(preset.id);
    });
  };

  // Test All Upstreams Helper
  const handleTestAllUpstreams = async () => {
    for (const u of upstreams) {
      await handleTestConnection(u.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching 9Router style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Providers
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage your AI provider connections, multi-key pools, custom OpenAI/Anthropic proxies, and round-robin routing.
          </p>
        </div>

        {/* Action Controls: Search, View Toggle, Add Anthropic, Add OpenAI */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search providers..."
              className="pl-8 pr-3 py-1.5 rounded-md skeuo-inset text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600 w-40 sm:w-48"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-md border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-100 dark:bg-zinc-900">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded text-xs cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              }`}
              title="Card Grid View (9Router style)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded text-xs cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              }`}
              title="Table View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={loadUpstreams}
            disabled={loading}
            className="skeuo-btn p-2 rounded-md cursor-pointer"
            title="Refresh providers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* 9Router prominent action buttons */}
          <button
            onClick={() => openCreateModal("anthropic")}
            className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-semibold text-amber-600 dark:text-amber-400 hover:border-amber-500/40 inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Anthropic Compatible</span>
          </button>

          <button
            onClick={() => openCreateModal("openai")}
            className="skeuo-btn-primary px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add OpenAI Compatible</span>
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="space-y-8">
          {/* SECTION 1: Custom Providers (OpenAI / Anthropic Compatible) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                  <span>Custom Providers (OpenAI/Anthropic Compatible)</span>
                  <span className="text-xs font-normal text-zinc-400">
                    ({filteredCustomUpstreams.length})
                  </span>
                </h3>
              </div>
            </div>

            {filteredCustomUpstreams.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
                <Layers className="w-8 h-8 mx-auto mb-2 text-zinc-400 opacity-40" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  No custom providers configured
                </p>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-md mx-auto">
                  Click <strong>"+ Add OpenAI Compatible"</strong> or <strong>"+ Add Anthropic Compatible"</strong> to connect your custom proxy, Ryzumi AI, BandelBanget, or local endpoints.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCustomUpstreams.map((item) => {
                  const totalKeys = item.totalKeysCount || item.keyEntries?.length || (item.apiKeys?.length || (item.apiKey ? 1 : 0));
                  const activeKeys = item.activeKeysCount ?? (item.keyEntries ? item.keyEntries.filter((k) => k.isActive).length : totalKeys);
                  const isRoundRobin = item.roundRobin !== false;
                  const modelsCount = item.totalModelsCount || 0;
                  const enabledCount = item.enabledModelsCount || 0;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl skeuo-card hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between group"
                    >
                      {/* Top: Avatar/Icon, Name, Status, Badges */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div
                              onClick={() => openConnectionsModal(item)}
                              className="w-10 h-10 rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700/80 flex items-center justify-center shrink-0 cursor-pointer shadow-sm group-hover:scale-105 transition-transform"
                            >
                              <Bot className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                              <h4
                                onClick={() => openConnectionsModal(item)}
                                className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                              >
                                {item.name}
                              </h4>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>{activeKeys} Connected</span>
                                </span>
                                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                                <span className="text-[10px] uppercase font-bold text-zinc-400">
                                  {item.provider}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action controls */}
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => openConnectionsModal(item)}
                              className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 cursor-pointer"
                              title="Manage Keys & Connections (like 9Router)"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 cursor-pointer"
                              title="Edit Provider Settings"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                              title="Delete Provider"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Base URL Subtitle */}
                        <div className="mt-2.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate bg-zinc-100/70 dark:bg-zinc-900/60 px-2 py-1 rounded">
                          {item.baseUrl || (item.provider === "openai" ? "https://api.openai.com/v1" : "https://api.anthropic.com")}
                        </div>
                      </div>

                      {/* Bottom Footer Details */}
                      <div className="mt-4 pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                        {/* Models pill */}
                        <button
                          onClick={() => openModelsModal(item)}
                          className="skeuo-btn px-2 py-0.5 rounded text-[10px] font-medium flex items-center space-x-1 cursor-pointer"
                        >
                          <Cpu className="w-3 h-3 text-indigo-400" />
                          <span>Models</span>
                          {modelsCount > 0 ? (
                            <span className="font-bold text-emerald-500">
                              {enabledCount}/{modelsCount}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">Off</span>
                          )}
                        </button>

                        {/* Round Robin pill */}
                        <div className="flex items-center space-x-2">
                          {isRoundRobin ? (
                            <span
                              className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30 flex items-center space-x-1"
                              title="Round-robin rotation across active keys"
                            >
                              <RotateCw className="w-2.5 h-2.5 mr-0.5" />
                              <span>RR</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-500/10 text-zinc-400 font-medium">
                              Primary
                            </span>
                          )}

                          {/* Test connection */}
                          <button
                            onClick={() => handleTestConnection(item.id)}
                            disabled={testingId === item.id}
                            className="skeuo-btn px-2 py-0.5 rounded text-[10px] font-medium flex items-center space-x-1 cursor-pointer"
                          >
                            <Wifi className={`w-3 h-3 ${testingId === item.id ? "animate-pulse text-emerald-400" : ""}`} />
                            <span>{testingId === item.id ? "..." : "Test"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 2: API Key Providers (Popular standard providers catalog matching 9Router) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                  <span>API Key Providers</span>
                  <span className="text-xs font-normal text-zinc-400">
                    ({PRESET_PROVIDERS.filter((p) => p.category === "api_key").length})
                  </span>
                </h3>
              </div>
              <button
                onClick={handleTestAllUpstreams}
                className="skeuo-btn px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1.5 text-zinc-600 dark:text-zinc-300 cursor-pointer"
              >
                <Wifi className="w-3 h-3 text-zinc-400" />
                <span>Test All</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {PRESET_PROVIDERS.filter((p) => p.category === "api_key")
                .filter((p) => !query || p.name.toLowerCase().includes(query) || p.id.includes(query))
                .map((preset) => {
                  const connected = findUpstreamForPreset(preset);
                  const isConnected = Boolean(connected);
                  const activeKeysCount = connected?.activeKeysCount ?? (connected?.keyEntries?.filter((k) => k.isActive).length ?? 0);

                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        if (connected) {
                          openConnectionsModal(connected);
                        } else {
                          openCreateModal(preset);
                        }
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                        isConnected
                          ? "skeuo-card border-indigo-500/30 hover:border-indigo-500/60"
                          : "bg-zinc-50/60 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-md ${preset.iconBg} text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform`}
                        >
                          {preset.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                            {preset.name}
                          </h4>
                          <div className="flex items-center space-x-1 text-[10px] mt-0.5">
                            {isConnected ? (
                              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                                {activeKeysCount > 0 ? `${activeKeysCount} Connected` : "Connected"}
                              </span>
                            ) : (
                              <span className="text-zinc-400">No connections</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="uppercase font-bold tracking-wider">{preset.provider}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline">
                          {isConnected ? "Manage" : "+ Setup"}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* SECTION 3: Free Tier & Local Providers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                  <span>Free Tier & Local Providers</span>
                  <span className="text-xs font-normal text-zinc-400">
                    ({PRESET_PROVIDERS.filter((p) => p.category === "free_tier").length})
                  </span>
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {PRESET_PROVIDERS.filter((p) => p.category === "free_tier")
                .filter((p) => !query || p.name.toLowerCase().includes(query) || p.id.includes(query))
                .map((preset) => {
                  const connected = findUpstreamForPreset(preset);
                  const isConnected = Boolean(connected);
                  const activeKeysCount = connected?.activeKeysCount ?? (connected?.keyEntries?.filter((k) => k.isActive).length ?? 0);

                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        if (connected) {
                          openConnectionsModal(connected);
                        } else {
                          openCreateModal(preset);
                        }
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                        isConnected
                          ? "skeuo-card border-indigo-500/30 hover:border-indigo-500/60"
                          : "bg-zinc-50/60 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-md ${preset.iconBg} text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform`}
                        >
                          {preset.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                            {preset.name}
                          </h4>
                          <div className="flex items-center space-x-1 text-[10px] mt-0.5">
                            {isConnected ? (
                              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                                {activeKeysCount > 0 ? `${activeKeysCount} Connected` : "Connected"}
                              </span>
                            ) : (
                              <span className="text-zinc-400">No connections</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="truncate max-w-[100px]">{preset.baseUrl}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline">
                          {isConnected ? "Manage" : "+ Setup"}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="skeuo-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-medium">
                <tr>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3">Alias / Name</th>
                  <th className="px-5 py-3">Key Pool & Connections</th>
                  <th className="px-5 py-3">Base URL</th>
                  <th className="px-5 py-3">Weight</th>
                  <th className="px-5 py-3">Model Routing</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Verification & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                {upstreams.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-zinc-500 dark:text-zinc-400">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-medium">No upstream providers configured</p>
                      <p className="text-[11px] mt-1">
                        Add at least one OpenAI or Anthropic API key pool to allow Neko-Router to serve proxy requests.
                      </p>
                    </td>
                  </tr>
                ) : (
                  upstreams.map((item) => {
                    const totalKeys = item.totalKeysCount || item.keyEntries?.length || (item.apiKeys?.length || (item.apiKey ? 1 : 0));
                    const activeKeys = item.activeKeysCount ?? (item.keyEntries ? item.keyEntries.filter((k) => k.isActive).length : totalKeys);
                    const isRoundRobin = item.roundRobin !== false;
                    const modelsCount = item.totalModelsCount || 0;
                    const enabledCount = item.enabledModelsCount || 0;

                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.provider === "openai"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {item.provider}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => openConnectionsModal(item)}
                            className="skeuo-card-subtle px-2.5 py-1 rounded inline-flex items-center space-x-2 text-[11px] hover:border-indigo-500/40 transition-colors cursor-pointer"
                            title="Manage connection pool, toggle individual keys, and test connections"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {activeKeys}/{totalKeys} Active
                            </span>
                            {isRoundRobin ? (
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30 flex items-center space-x-1"
                                title="Round-robin rotation enabled for active keys"
                              >
                                <RotateCw className="w-2.5 h-2.5 inline mr-0.5" />
                                <span>RR</span>
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-500/10 text-zinc-400 font-medium border border-zinc-500/20">
                                Primary
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">
                          {item.baseUrl ? (
                            <span className="font-mono text-[11px] truncate max-w-[150px] inline-block" title={item.baseUrl}>
                              {item.baseUrl}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400 italic">Default</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-zinc-800 dark:text-zinc-200">
                          {item.weight}x
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => openModelsModal(item)}
                            className="skeuo-btn px-2.5 py-1 rounded-md inline-flex items-center space-x-1.5 text-[11px] font-medium cursor-pointer"
                          >
                            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Models</span>
                            {modelsCount > 0 ? (
                              <span className="ml-1 text-[10px] font-bold text-emerald-500">
                                {enabledCount}/{modelsCount}
                              </span>
                            ) : (
                              <span className="ml-1 text-[10px] text-zinc-400 italic">Off</span>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className="flex items-center space-x-1.5 focus:outline-none cursor-pointer"
                          >
                            {item.isActive ? (
                              <>
                                <ToggleRight className="w-5 h-5 text-emerald-500" />
                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                  Active
                                </span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-5 h-5 text-zinc-400" />
                                <span className="text-[11px] font-medium text-zinc-400">
                                  Disabled
                                </span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleTestConnection(item.id)}
                              disabled={testingId === item.id}
                              className="skeuo-btn px-2.5 py-1 rounded-md text-zinc-700 dark:text-zinc-300 flex items-center space-x-1 text-[11px] cursor-pointer"
                            >
                              <Wifi className={`w-3 h-3 ${testingId === item.id ? "animate-pulse text-emerald-400" : ""}`} />
                              <span>{testingId === item.id ? "Testing..." : "Test"}</span>
                            </button>
                            <button
                              onClick={() => openConnectionsModal(item)}
                              className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 cursor-pointer"
                              title="Connections"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                              title="Delete"
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
      )}

      {/* Modal 1: Add OpenAI/Anthropic Compatible (Matching 9Router screenshot 3) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg skeuo-card p-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Window Top Controls style matching 9Router */}
            <div className="flex items-center space-x-3 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingUpstream
                  ? `Edit ${provider === "openai" ? "OpenAI" : "Anthropic"} Compatible`
                  : `Add ${provider === "openai" ? "OpenAI" : "Anthropic"} Compatible`}
              </h3>
            </div>

            {modalError && (
              <div className="mb-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveUpstream} className="space-y-3.5 text-xs">
              {/* Name */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder={provider === "openai" ? "OpenAI Compatible (Prod)" : "Anthropic Compatible"}
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  Required. A friendly label for this node.
                </p>
              </div>

              {/* Prefix */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Prefix (optional)
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. oc-prod"
                  className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  Optional. Used as the provider prefix for model IDs.
                </p>
              </div>

              {/* API Type */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  API Type
                </label>
                <select
                  value={apiType}
                  onChange={(e) => setApiType(e.target.value)}
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600 cursor-pointer"
                >
                  <option value="Chat Completions">Chat Completions</option>
                  <option value="Anthropic Messages">Messages API</option>
                  <option value="Completions">Completions</option>
                </select>
              </div>

              {/* Base URL */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Base URL *
                </label>
                <input
                  type="url"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={provider === "openai" ? "https://api.openai.com/v1" : "https://api.anthropic.com"}
                  className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  Use the base URL (ending in /v1 for OpenAI compatible).
                </p>
              </div>

              {/* Multi-Key Pool & Round Robin (9Router style) */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                      <span>API Key Pool ({formKeys.length} keys) *</span>
                    </label>
                    <p className="text-[10px] text-zinc-400">
                      Configure keys. Toggle on/off individually.
                    </p>
                  </div>

                  {/* Round Robin toggle */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      Round Robin
                    </span>
                    <button
                      type="button"
                      onClick={() => setRoundRobin(!roundRobin)}
                      className="p-1 cursor-pointer"
                      title="Rotate requests across active keys in this pool"
                    >
                      {roundRobin ? (
                        <ToggleRight className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-zinc-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {formKeys.map((k, idx) => (
                    <div
                      key={k.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        k.isActive
                          ? "skeuo-card-subtle border-zinc-200 dark:border-zinc-800"
                          : "bg-zinc-100/60 dark:bg-zinc-900/30 border-dashed border-zinc-300 dark:border-zinc-800 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <input
                          type="text"
                          value={k.name}
                          onChange={(e) => handleKeyNameChange(idx, e.target.value)}
                          placeholder={`Key #${idx + 1}`}
                          className="text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 w-28"
                        />

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleToggleKeyActive(idx)}
                            className="p-0.5 cursor-pointer"
                            title={k.isActive ? "Disable key" : "Enable key"}
                          >
                            {k.isActive ? (
                              <ToggleRight className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-zinc-400" />
                            )}
                          </button>
                          {formKeys.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveKey(idx)}
                              className="p-1 text-zinc-400 hover:text-red-500 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type={k.showSecret ? "text" : "password"}
                          required
                          value={k.key}
                          onChange={(e) => handleKeyValChange(idx, e.target.value)}
                          placeholder={provider === "openai" ? "sk-proj-... (or paste multiple keys)" : "sk-ant-..."}
                          className="w-full px-3 py-1.5 pr-8 pl-7 rounded-md skeuo-inset font-mono text-xs text-zinc-900 dark:text-zinc-100"
                        />
                        <KeyRound className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2" />
                        <button
                          type="button"
                          onClick={() => handleToggleShowSecret(idx)}
                          className="absolute right-2 top-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                        >
                          {k.showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleAddKey}
                      className="inline-flex items-center space-x-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Key Row</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkPasteOpen(!isBulkPasteOpen)}
                      className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <UploadCloud className="w-3 h-3" />
                      <span>Bulk Paste Keys</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-400 italic">
                    Paste multiple keys to auto-split
                  </span>
                </div>

                {isBulkPasteOpen && (
                  <div className="mt-2.5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      <span className="flex items-center space-x-1">
                        <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Paste Multiple Keys</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsBulkPasteOpen(false)}
                        className="text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      placeholder="Paste keys here (one per line, comma separated, or Label: Key)..."
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-900 dark:text-zinc-100"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleBulkPasteIntoForm}
                        className="skeuo-btn-primary px-3 py-1 rounded text-xs font-medium cursor-pointer"
                      >
                        Append to Form
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Check button & result (matching 9Router screenshot 3) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCheckConnectionInModal}
                  disabled={checkingConnection}
                  className="skeuo-btn px-4 py-1.5 rounded-md text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {checkingConnection ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span>{checkingConnection ? "Checking..." : "Check"}</span>
                </button>

                {checkStatus && (
                  <div
                    className={`mt-2 p-2 rounded-md text-xs flex items-center space-x-2 ${
                      checkStatus.success
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                        : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25"
                    }`}
                  >
                    {checkStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 text-red-500" />
                    )}
                    <span className="truncate">
                      {checkStatus.success
                        ? `Connection verified successfully (${checkStatus.latencyMs}ms)`
                        : checkStatus.error || "Connection check failed"}
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="skeuo-btn px-4 py-2 rounded-md text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="skeuo-btn-primary px-5 py-2 rounded-md text-xs font-semibold cursor-pointer"
                >
                  {saving
                    ? "Saving..."
                    : editingUpstream
                    ? "Save Changes"
                    : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Dedicated Connections Manager (9Router style) */}
      {activeConnectionsUpstream && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setActiveConnectionsUpstream(null)}
        >
          <div
            className="w-full max-w-2xl skeuo-card p-6 flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setActiveConnectionsUpstream(null)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Connections: {activeConnectionsUpstream.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      activeConnectionsUpstream.provider === "openai"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {activeConnectionsUpstream.provider}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {connectionsList.filter((k) => k.isActive).length} of {connectionsList.length} connections active
                  {activeConnectionsUpstream.baseUrl ? ` · ${activeConnectionsUpstream.baseUrl}` : " · Official Endpoint"}
                </p>
              </div>
            </div>

            {/* Action Bar (9Router style): Test Connection One-by-One, Round Robin switch, + Add Key */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 my-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleTestOneByOne}
                  disabled={testingOneByOne || connectionsList.length === 0}
                  className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  title="Sequentially ping and verify every key in this pool"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingOneByOne ? "animate-spin text-indigo-500" : ""}`} />
                  <span>{testingOneByOne ? "Testing Keys..." : "Test Connection One-by-One"}</span>
                </button>

                {/* Round Robin Switch */}
                <button
                  type="button"
                  onClick={handleToggleRoundRobinInConnections}
                  className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-2 cursor-pointer"
                  title="Toggle round-robin rotation between active keys"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">Round Robin</span>
                  {activeConnectionsUpstream.roundRobin !== false ? (
                    <ToggleRight className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-zinc-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMassImportOpen(!isMassImportOpen);
                    setIsAddingConnection(false);
                    setMassImportError("");
                    setMassImportSuccess("");
                  }}
                  className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer text-indigo-600 dark:text-indigo-400 hover:border-indigo-500/50"
                  title="Import hundreds of API keys in bulk"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Mass Import Keys</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddingConnection(!isAddingConnection);
                    setIsMassImportOpen(false);
                  }}
                  className="skeuo-btn-primary px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add API Key</span>
                </button>
              </div>
            </div>

            {/* Mass Import Keys Box */}
            {isMassImportOpen && (
              <form
                onSubmit={handleMassImportKeys}
                className="mb-3 p-3.5 rounded-lg border border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UploadCloud className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Mass Import API Keys</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      ⚡ {detectedKeysCount} keys detected
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMassImportOpen(false)}
                    className="text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {massImportError && (
                  <div className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded">
                    {massImportError}
                  </div>
                )}

                {massImportSuccess && (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{massImportSuccess}</span>
                  </div>
                )}

                <div>
                  <textarea
                    rows={5}
                    required
                    value={massImportText}
                    onChange={(e) => {
                      setMassImportText(e.target.value);
                      setMassImportError("");
                      setMassImportSuccess("");
                    }}
                    placeholder="Paste hundreds of keys here (one key per line, or comma-separated, or Label: Key)&#10;sk-proj-abc123456789...&#10;sk-proj-def987654321...&#10;Backup Key 3: sk-proj-111..."
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Supports raw keys (<code>sk-...</code>), comma-separated tokens, or custom labels (<code>Label: Key</code>).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Prefix / Default Label</label>
                    <input
                      type="text"
                      value={massImportPrefix}
                      onChange={(e) => setMassImportPrefix(e.target.value)}
                      placeholder="e.g. API Key or Node"
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-2 sm:pt-4">
                    <label className="flex items-center space-x-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={massImportActive}
                        onChange={(e) => setMassImportActive(e.target.checked)}
                        className="rounded"
                      />
                      <span>Active immediately</span>
                    </label>
                    <label className="flex items-center space-x-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={massImportSkipDuplicates}
                        onChange={(e) => setMassImportSkipDuplicates(e.target.checked)}
                        className="rounded"
                      />
                      <span>Skip duplicates</span>
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={massImportLoading || detectedKeysCount === 0}
                      className="skeuo-btn-primary px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {massImportLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Import {detectedKeysCount} Keys</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Inline Add Key Box */}
            {isAddingConnection && (
              <form onSubmit={handleSaveNewConnection} className="mb-3 p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 space-y-2">
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                  <span>Add New Connection Key</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingConnection(false)}
                    className="text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {addingConnError && (
                  <div className="text-[11px] text-red-500 bg-red-500/10 p-1.5 rounded">
                    {addingConnError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Key Label (e.g. Backup Key)"
                    value={newConnName}
                    onChange={(e) => setNewConnName(e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                  <input
                    type="password"
                    required
                    placeholder="API Key (sk-...)"
                    value={newConnKey}
                    onChange={(e) => setNewConnKey(e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newConnActive}
                      onChange={(e) => setNewConnActive(e.target.checked)}
                      className="rounded"
                    />
                    <span>Active immediately</span>
                  </label>
                  <button
                    type="submit"
                    className="skeuo-btn-primary px-3 py-1 rounded text-xs font-medium cursor-pointer"
                  >
                    Save Key
                  </button>
                </div>
              </form>
            )}

            {/* Connections Cards List */}
            <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[380px] border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 space-y-2">
              {loadingConnections ? (
                <div className="py-12 text-center text-xs text-zinc-400 flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>Loading connections...</span>
                </div>
              ) : connectionsList.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-400">
                  <KeyRound className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p>No connections configured yet.</p>
                </div>
              ) : (
                connectionsList.map((conn, idx) => {
                  const testInfo = keyTestStatus[conn.id];

                  return (
                    <div
                      key={conn.id}
                      className={`p-3 rounded-lg border transition-all ${
                        conn.isActive
                          ? "skeuo-card-subtle border-zinc-200/90 dark:border-zinc-800"
                          : "bg-zinc-100/60 dark:bg-zinc-900/30 border-dashed border-zinc-300 dark:border-zinc-800/80 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                              conn.isActive
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                            }`}
                          >
                            <KeyRound className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                                {conn.name || `API Key #${idx + 1}`}
                              </span>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                  conn.isActive
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 border border-zinc-500/30"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                    conn.isActive ? "bg-emerald-500" : "bg-zinc-400"
                                  }`}
                                />
                                {conn.isActive ? "active" : "disabled"}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                              <span>API Key #{idx + 1}</span>
                              <span>·</span>
                              <span>{conn.maskedKey || "******"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {testInfo && !testInfo.testing && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center space-x-1 ${
                                testInfo.success
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                              }`}
                              title={testInfo.error}
                            >
                              {testInfo.success ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span>{testInfo.latencyMs}ms</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-red-500" />
                                  <span>Failed</span>
                                </>
                              )}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleTestKeyInConnections(conn.id)}
                            disabled={testInfo?.testing}
                            className="skeuo-btn px-2 py-1 rounded text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
                            title="Test this single connection"
                          >
                            <Wifi className={`w-3 h-3 ${testInfo?.testing ? "animate-pulse text-indigo-500" : ""}`} />
                            <span>{testInfo?.testing ? "Testing..." : "Test"}</span>
                          </button>

                          {connectionsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteConnectionKey(conn.id)}
                              className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                              title="Delete this connection key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            role="switch"
                            aria-checked={conn.isActive}
                            onClick={() => handleToggleConnectionKey(conn.id, conn.isActive)}
                            className="p-1 cursor-pointer"
                            title={conn.isActive ? "Disable this key" : "Enable this key"}
                          >
                            {conn.isActive ? (
                              <ToggleRight className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-zinc-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400 text-[11px]">
                {connectionsList.filter((k) => k.isActive).length} active connections participating in routing
              </span>
              <button
                type="button"
                onClick={() => setActiveConnectionsUpstream(null)}
                className="skeuo-btn-primary px-4 py-1.5 rounded-md font-semibold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Manage & Toggle Models for Upstream */}
      {activeModelsUpstream && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setActiveModelsUpstream(null)}
        >
          <div
            className="w-full max-w-xl skeuo-card p-6 flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setActiveModelsUpstream(null)}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                  title="Close"
                />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Model Routing Catalog: {activeModelsUpstream.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Provider: <span className="uppercase font-semibold">{activeModelsUpstream.provider}</span> · {totalEnabledInModal} of {modelsList.length} models active
                </p>
              </div>
            </div>

            <div className="my-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold">Security & Cost Policy:</span> All fetched models are set to <strong>OFF by default</strong>. Explicitly toggle ON only the models you want clients to be able to route through this upstream provider.
              </div>
            </div>

            {modelsError && (
              <div className="mb-3 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {modelsError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={modelsSearch}
                  onChange={(e) => setModelsSearch(e.target.value)}
                  placeholder="Filter models (e.g. 4o, sonnet)..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-md skeuo-inset text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={fetchingModels}
                  className="skeuo-btn-primary px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchingModels ? "animate-spin" : ""}`} />
                  <span>{fetchingModels ? "Fetching..." : "Fetch Models from Provider"}</span>
                </button>

                {modelsList.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleToggleAllModels(true)}
                      className="skeuo-btn px-2 py-1.5 rounded-md text-[11px] font-medium cursor-pointer"
                      title="Turn ON all models"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllModels(false)}
                      className="skeuo-btn px-2 py-1.5 rounded-md text-[11px] font-medium text-red-500 cursor-pointer"
                      title="Turn OFF all models"
                    >
                      Disable All
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[360px] border border-zinc-200 dark:border-zinc-800 rounded-md p-1 divide-y divide-zinc-200/40 dark:divide-zinc-800/40">
              {modelsList.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  <Cpu className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">No models discovered yet</p>
                  <p className="mt-1 text-[11px]">
                    Click <strong>"Fetch Models from Provider"</strong> above to auto-discover all models supported by this upstream.
                  </p>
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No models matching "{modelsSearch}"
                </div>
              ) : (
                filteredModels.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 rounded-md transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          m.enabled ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-zinc-500/40"
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                          {m.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          m.enabled
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {m.enabled ? "ENABLED" : "OFF"}
                      </span>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={m.enabled}
                        disabled={togglingModelId === m.id}
                        onClick={() => handleToggleModel(m.id, m.enabled)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-zinc-700/50 transition-colors duration-150 ease-in-out focus:outline-none ${
                          m.enabled
                            ? "bg-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                            : "bg-zinc-300 dark:bg-zinc-800"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-150 ease-in-out ${
                            m.enabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400 text-[11px]">
                Showing {filteredModels.length} of {modelsList.length} models
              </span>
              <button
                type="button"
                onClick={() => setActiveModelsUpstream(null)}
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

export default UpstreamKeysTab;
