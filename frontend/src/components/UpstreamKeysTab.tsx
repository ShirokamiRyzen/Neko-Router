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
  ChevronRight,
  Copy,
  ExternalLink,
  Check,
  Rocket,
} from "lucide-react";
import {
  apiRequest,
  type UpstreamKeyItem,
  type UpstreamModelItem,
  type UpstreamKeyEntryItem,
} from "../lib/api";

export const OpenAIIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.475 4.475 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4702 4.4702 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5991 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4041-.6669zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813v6.7227zm1.1458-1.785l2.5484-1.4725 2.5484 1.4725v2.9304l-2.5484 1.4725-2.5484-1.4725z" />
  </svg>
);

export const GithubIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export interface FormKeyEntry {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  showSecret?: boolean;
  testing?: boolean;
  testResult?: { success: boolean; latencyMs?: number; error?: string } | null;
  jwtInfo?: { email?: string; exp?: number; isExpired?: boolean } | null;
  refreshToken?: string;
  expiresAt?: number;
}

export interface ProviderPreset {
  id: string;
  name: string;
  provider: "openai" | "anthropic";
  baseUrl: string;
  iconBg: string;
  category: "oauth" | "account" | "api_key" | "free_tier";
  authType?: "oauth" | "account" | "api_key";
  domainMatch?: string;
  badge?: string;
  description?: string;
  defaultModels?: Array<{ id: string; name: string; enabled: boolean }>;
}

export function parseJwtInfo(token: string): { email?: string; exp?: number; isExpired?: boolean } | null {
  try {
    const parts = token.trim().split(".");
    if (parts.length === 3) {
      const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      const payload = JSON.parse(payloadStr);
      const email = payload?.email || payload?.["https://api.openai.com/profile"]?.email || payload?.sub;
      const exp = typeof payload?.exp === "number" ? payload.exp : undefined;
      const isExpired = exp ? Date.now() >= exp * 1000 : false;
      return { email, exp, isExpired };
    }
  } catch (e) { }
  return null;
}

const PRESET_PROVIDERS: ProviderPreset[] = [
  // OAuth Provider: Antigravity
  {
    id: "antigravity",
    name: "Antigravity",
    provider: "openai",
    baseUrl: "https://daily-cloudcode-pa.googleapis.com",
    iconBg: "bg-indigo-600 border border-indigo-500 text-white",
    category: "oauth",
    authType: "oauth",
    badge: "Google OAuth",
    description: "Connect via Google Account OAuth (Antigravity Cloud Code). Store multiple Google accounts with automatic Round-Robin load balancing.",
    domainMatch: "cloudcode-pa.googleapis.com",
    defaultModels: [
      { id: "gemini-3.8-flash-high", name: "Gemini 3.8 Flash High", enabled: true },
      { id: "gemini-3.8-flash-medium", name: "Gemini 3.8 Flash Medium", enabled: true },
      { id: "gemini-3.8-flash-low", name: "Gemini 3.8 Flash Low", enabled: true },
      { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", enabled: true },
      { id: "gemini-3.7-flash-high", name: "Gemini 3.7 Flash High", enabled: true },
      { id: "gemini-3.7-flash-medium", name: "Gemini 3.7 Flash Medium", enabled: true },
      { id: "gemini-3.7-flash-low", name: "Gemini 3.7 Flash Low", enabled: true },
      { id: "gemini-3.6-flash-high", name: "Gemini 3.6 Flash High", enabled: true },
      { id: "gemini-3.5-flash-high", name: "Gemini 3.5 Flash High", enabled: true },
      { id: "gemini-3.1-pro-low", name: "Gemini 3.1 Pro Low", enabled: true },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", enabled: true },
      { id: "claude-opus-4-6-thinking", name: "Claude Opus 4.6 Thinking", enabled: true },
      { id: "gpt-oss-120b-medium", name: "GPT OSS 120B Medium", enabled: true },
      { id: "gemini-3-flash", name: "Gemini 3 Flash", enabled: true },
      { id: "gemini-3.1-flash-image", name: "Gemini 3.1 Flash Image", enabled: true },
    ],
  },
  // OAuth Provider: GitHub Copilot
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    provider: "openai",
    baseUrl: "https://api.githubcopilot.com",
    iconBg: "bg-zinc-900 border border-zinc-700 text-white",
    category: "oauth",
    authType: "oauth",
    badge: "OAuth Device Flow",
    description: "Connect via GitHub (OAuth Device Code). Store multiple GitHub Copilot accounts with automatic Round-Robin load balancing.",
    domainMatch: "githubcopilot.com",
    defaultModels: [
      { id: "gpt-4o", name: "GPT-4o", enabled: true },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", enabled: true },
      { id: "gpt-4.1", name: "GPT-4.1", enabled: true },
      { id: "gpt-5.2", name: "GPT-5.2", enabled: true },
      { id: "gpt-5.4", name: "GPT-5.4", enabled: true },
      { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", enabled: true },
      { id: "claude-3.7-sonnet", name: "Claude 3.7 Sonnet", enabled: true },
      { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", enabled: true },
      { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", enabled: true },
      { id: "claude-opus-4.5", name: "Claude Opus 4.5", enabled: true },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", enabled: true },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", enabled: true },
      { id: "o1", name: "OpenAI o1", enabled: true },
      { id: "o1-mini", name: "OpenAI o1 Mini", enabled: true },
      { id: "o3-mini", name: "OpenAI o3 Mini", enabled: true },
    ],
  },
  // OAuth Provider: OpenAI Codex
  {
    id: "openai-codex",
    name: "OpenAI Codex",
    provider: "openai",
    baseUrl: "https://chatgpt.com/backend-api/codex/responses",
    iconBg: "bg-emerald-600 border border-emerald-500 text-white",
    category: "oauth",
    authType: "oauth",
    badge: "ChatGPT OAuth",
    description: "Connect via OpenAI OAuth PKCE Flow (ChatGPT Codex CLI). Store multiple ChatGPT accounts with automatic Round-Robin request routing.",
    domainMatch: "chatgpt.com/backend-api/codex",
    defaultModels: [
      { id: "gpt-5.4", name: "GPT 5.4", enabled: true },
      { id: "gpt-5.4-mini", name: "GPT 5.4 Mini", enabled: true },
      { id: "gpt-5.5", name: "GPT 5.5", enabled: true },
      { id: "gpt-5.6-sol", name: "GPT 5.6 Sol", enabled: true },
      { id: "gpt-5.6-terra", name: "GPT 5.6 Terra", enabled: true },
      { id: "gpt-5.6-luna", name: "GPT 5.6 Luna", enabled: true },
      { id: "gpt-6-astra", name: "GPT 6.0 Astra", enabled: true },
      { id: "gpt-5.3-codex-spark", name: "GPT 5.3 Codex Spark", enabled: true },
      { id: "o3-mini", name: "o3-mini", enabled: true },
      { id: "o1", name: "o1", enabled: true },
      { id: "gpt-4o", name: "GPT-4o", enabled: true },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", enabled: true },
    ],
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
  const [isAccountMode, setIsAccountMode] = useState(false);
  const [presetDefaultModels, setPresetDefaultModels] = useState<Array<{ id: string; name: string; enabled: boolean }>>([]);
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

  // GitHub Copilot Device Code Flow State
  const [copilotModalOpen, setCopilotModalOpen] = useState(false);
  const [copilotDeviceInfo, setCopilotDeviceInfo] = useState<{
    device_code: string;
    user_code: string;
    verification_uri: string;
    interval: number;
    expires_in: number;
  } | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotStatus, setCopilotStatus] = useState<"idle" | "polling" | "success" | "error">("idle");
  const [copilotStatusText, setCopilotStatusText] = useState("");
  const [copilotError, setCopilotError] = useState("");
  const [copilotCopied, setCopilotCopied] = useState(false);
  const [copilotTargetUpstream, setCopilotTargetUpstream] = useState<UpstreamKeyItem | null>(null);

  // Antigravity Google OAuth Flow State
  const [antigravityModalOpen, setAntigravityModalOpen] = useState(false);
  const [antigravityAuthUrl, setAntigravityAuthUrl] = useState("");
  const [antigravityCode, setAntigravityCode] = useState("");
  const [antigravityLoading, setAntigravityLoading] = useState(false);
  const [antigravityStatus, setAntigravityStatus] = useState<"idle" | "authorizing" | "exchanging" | "success" | "error">("idle");
  const [antigravityStatusText, setAntigravityStatusText] = useState("");
  const [antigravityError, setAntigravityError] = useState("");
  const [antigravityTargetUpstream, setAntigravityTargetUpstream] = useState<UpstreamKeyItem | null>(null);

  // OpenAI Codex OAuth Flow State
  const [codexModalOpen, setCodexModalOpen] = useState(false);
  const [codexAuthUrl, setCodexAuthUrl] = useState("");
  const [codexCodeVerifier, setCodexCodeVerifier] = useState("");
  const [codexCode, setCodexCode] = useState("");
  const [codexLoading, setCodexLoading] = useState(false);
  const [codexStatus, setCodexStatus] = useState<"idle" | "authorizing" | "polling" | "exchanging" | "success" | "error">("idle");
  const [codexStatusText, setCodexStatusText] = useState("");
  const [codexError, setCodexError] = useState("");
  const [codexTargetUpstream, setCodexTargetUpstream] = useState<UpstreamKeyItem | null>(null);
  const [codexLocalPort, setCodexLocalPort] = useState(1455);

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

  const startCopilotOAuth = async (targetUpstream?: UpstreamKeyItem | null) => {
    setCopilotTargetUpstream(targetUpstream || null);
    setCopilotLoading(true);
    setCopilotError("");
    setCopilotStatus("idle");
    setCopilotStatusText("Initializing GitHub Device Code...");
    setCopilotCopied(false);
    setCopilotModalOpen(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        device_code: string;
        user_code: string;
        verification_uri: string;
        interval: number;
        expires_in: number;
        error?: string;
      }>("/api/upstreams/copilot/device-code", { method: "POST" });

      if (!res.success || !res.device_code) {
        throw new Error(res.error || "Failed to retrieve authorization code from GitHub");
      }

      setCopilotDeviceInfo(res);
      setCopilotLoading(false);
      setCopilotStatus("polling");
      setCopilotStatusText("Waiting for authorization on GitHub...");

      // Auto-copy code
      try {
        await navigator.clipboard.writeText(res.user_code);
        setCopilotCopied(true);
      } catch (e) { }

      const intervalSec = Math.max(5, res.interval || 5);
      const pollTimer = setInterval(async () => {
        try {
          const pollRes = await apiRequest<{
            status: "pending" | "slow_down" | "expired" | "success" | "error";
            accessToken?: string;
            username?: string;
            avatarUrl?: string;
            copilotActive?: boolean;
            error?: string;
          }>("/api/upstreams/copilot/poll-token", {
            method: "POST",
            body: JSON.stringify({ deviceCode: res.device_code }),
          });

          if (pollRes.status === "success" && pollRes.accessToken) {
            clearInterval(pollTimer);
            setCopilotStatus("success");
            const accountLabel = `@${pollRes.username || "github-user"}`;
            setCopilotStatusText(`Successfully connected as ${accountLabel}!`);

            if (targetUpstream) {
              const newEntry = {
                name: accountLabel,
                key: pollRes.accessToken,
                isActive: true,
              };
              await apiRequest(`/api/upstreams/${targetUpstream.id}`, {
                method: "PUT",
                body: JSON.stringify({
                  keyEntries: [
                    ...(targetUpstream.keyEntries || []).map((k) => ({
                      id: k.id,
                      name: k.name,
                      key: k.key,
                      isActive: k.isActive,
                    })),
                    newEntry,
                  ],
                }),
              });
              await loadUpstreams();
            } else if (isModalOpen) {
              setFormKeys((prev) => {
                const filtered = prev.filter((k) => k.key.trim().length > 0);
                return [
                  ...filtered,
                  {
                    id: `k_${Date.now()}`,
                    name: accountLabel,
                    key: pollRes.accessToken!,
                    isActive: true,
                    showSecret: false,
                  },
                ];
              });
            } else {
              const existing = upstreams.find(
                (u) =>
                  u.baseUrl?.includes("githubcopilot.com") ||
                  u.name.toLowerCase().includes("copilot")
              );
              if (existing) {
                const newEntry = {
                  name: accountLabel,
                  key: pollRes.accessToken,
                  isActive: true,
                };
                await apiRequest(`/api/upstreams/${existing.id}`, {
                  method: "PUT",
                  body: JSON.stringify({
                    keyEntries: [
                      ...(existing.keyEntries || []).map((k) => ({
                        id: k.id,
                        name: k.name,
                        key: k.key,
                        isActive: k.isActive,
                      })),
                      newEntry,
                    ],
                  }),
                });
                await loadUpstreams();
              } else {
                const preset = PRESET_PROVIDERS.find((p) => p.id === "github-copilot");
                openCreateModal(preset);
                setFormKeys([
                  {
                    id: `k_${Date.now()}`,
                    name: accountLabel,
                    key: pollRes.accessToken,
                    isActive: true,
                    showSecret: false,
                  },
                ]);
              }
            }

            setTimeout(() => {
              setCopilotModalOpen(false);
            }, 2000);
          } else if (pollRes.status === "expired" || pollRes.status === "error") {
            clearInterval(pollTimer);
            setCopilotStatus("error");
            setCopilotError(pollRes.error || "Authorization expired or was denied.");
          }
        } catch (e: any) {
          // network retry
        }
      }, intervalSec * 1000);

      setTimeout(() => {
        clearInterval(pollTimer);
      }, 15 * 60 * 1000);
    } catch (err: any) {
      setCopilotLoading(false);
      setCopilotStatus("error");
      setCopilotError(err?.message || "Failed to connect to GitHub server");
    }
  };

  const startAntigravityOAuth = async (targetUpstream?: UpstreamKeyItem | null) => {
    setAntigravityTargetUpstream(targetUpstream || null);
    setAntigravityLoading(true);
    setAntigravityError("");
    setAntigravityCode("");
    setAntigravityStatus("idle");
    setAntigravityStatusText("Generating Google OAuth URL...");
    setAntigravityModalOpen(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        authUrl: string;
        redirectUri?: string;
        error?: string;
      }>("/api/upstreams/antigravity/auth-url", { method: "POST" });

      if (!res.success || !res.authUrl) {
        throw new Error(res.error || "Failed to generate Antigravity authorization URL");
      }

      setAntigravityAuthUrl(res.authUrl);
      setAntigravityLoading(false);
      setAntigravityStatus("authorizing");
      setAntigravityStatusText("Ready for Google Sign-In authorization.");
    } catch (err: any) {
      setAntigravityLoading(false);
      setAntigravityStatus("error");
      setAntigravityError(err?.message || "Failed to connect to Antigravity authorization service");
    }
  };

  const handleExchangeAntigravity = async () => {
    if (!antigravityCode.trim()) {
      setAntigravityError("Please paste the authorization code, redirected callback URL, or active ya29 token");
      return;
    }

    setAntigravityLoading(true);
    setAntigravityError("");
    setAntigravityStatus("exchanging");
    setAntigravityStatusText("Exchanging code for Google credentials...");

    try {
      const res = await apiRequest<{
        success: boolean;
        accessToken: string;
        refreshToken?: string;
        expiresIn?: number;
        email?: string;
        name?: string;
        projectId?: string;
        error?: string;
      }>("/api/upstreams/antigravity/exchange", {
        method: "POST",
        body: JSON.stringify({ code: antigravityCode.trim() }),
      });

      if (!res.success || !res.accessToken) {
        throw new Error(res.error || "Failed to exchange authorization code");
      }

      const accountLabel = res.email ? `@${res.email}` : res.name ? `@${res.name}` : "@antigravity-account";
      setAntigravityStatus("success");
      setAntigravityStatusText(`Successfully connected as ${accountLabel}!`);

      const newEntry = {
        name: accountLabel,
        key: res.accessToken,
        refreshToken: res.refreshToken,
        expiresAt: res.expiresIn ? Date.now() + res.expiresIn * 1000 : undefined,
        isActive: true,
      };

      if (antigravityTargetUpstream) {
        await apiRequest(`/api/upstreams/${antigravityTargetUpstream.id}`, {
          method: "PUT",
          body: JSON.stringify({
            keyEntries: [
              ...(antigravityTargetUpstream.keyEntries || []).map((k) => ({
                id: k.id,
                name: k.name,
                key: k.key,
                refreshToken: k.refreshToken,
                expiresAt: k.expiresAt,
                isActive: k.isActive,
              })),
              newEntry,
            ],
          }),
        });
        await loadUpstreams();
      } else if (isModalOpen) {
        setFormKeys((prev) => {
          const filtered = prev.filter((k) => k.key.trim().length > 0);
          return [
            ...filtered,
            {
              id: `k_${Date.now()}`,
              name: accountLabel,
              key: res.accessToken,
              refreshToken: res.refreshToken,
              expiresAt: res.expiresIn ? Date.now() + res.expiresIn * 1000 : undefined,
              isActive: true,
              showSecret: false,
            },
          ];
        });
      } else {
        const existing = upstreams.find(
          (u) =>
            u.baseUrl?.includes("cloudcode-pa.googleapis.com") ||
            u.name.toLowerCase().includes("antigravity")
        );
        if (existing) {
          await apiRequest(`/api/upstreams/${existing.id}`, {
            method: "PUT",
            body: JSON.stringify({
              keyEntries: [
                ...(existing.keyEntries || []).map((k) => ({
                  id: k.id,
                  name: k.name,
                  key: k.key,
                  refreshToken: k.refreshToken,
                  expiresAt: k.expiresAt,
                  isActive: k.isActive,
                })),
                newEntry,
              ],
            }),
          });
          await loadUpstreams();
        } else {
          const preset = PRESET_PROVIDERS.find((p) => p.id === "antigravity");
          openCreateModal(preset);
          setFormKeys([
            {
              id: `k_${Date.now()}`,
              name: accountLabel,
              key: res.accessToken,
              refreshToken: res.refreshToken,
              expiresAt: res.expiresIn ? Date.now() + res.expiresIn * 1000 : undefined,
              isActive: true,
              showSecret: false,
            },
          ]);
        }
      }

      setTimeout(() => {
        setAntigravityModalOpen(false);
      }, 1800);
    } catch (err: any) {
      setAntigravityStatus("error");
      setAntigravityError(err?.message || "Code exchange failed");
    } finally {
      setAntigravityLoading(false);
    }
  };

  const applyCodexAccount = async (newEntry: any, targetUpstream?: UpstreamKeyItem | null) => {
    if (targetUpstream) {
      await apiRequest(`/api/upstreams/${targetUpstream.id}`, {
        method: "PUT",
        body: JSON.stringify({
          keyEntries: [
            ...(targetUpstream.keyEntries || []).map((k) => ({
              id: k.id,
              name: k.name,
              key: k.key,
              refreshToken: k.refreshToken,
              expiresAt: k.expiresAt,
              isActive: k.isActive,
            })),
            newEntry,
          ],
        }),
      });
      await loadUpstreams();
    } else if (isModalOpen) {
      setFormKeys((prev) => {
        const filtered = prev.filter((k) => k.key.trim().length > 0);
        return [
          ...filtered,
          {
            id: `k_${Date.now()}`,
            name: newEntry.name,
            key: newEntry.key,
            refreshToken: newEntry.refreshToken,
            expiresAt: newEntry.expiresAt,
            isActive: true,
            showSecret: false,
          },
        ];
      });
    } else {
      const existing = upstreams.find(
        (u) =>
          u.baseUrl?.includes("chatgpt.com/backend-api/codex") ||
          u.name.toLowerCase().includes("codex")
      );
      if (existing) {
        await apiRequest(`/api/upstreams/${existing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            keyEntries: [
              ...(existing.keyEntries || []).map((k) => ({
                id: k.id,
                name: k.name,
                key: k.key,
                refreshToken: k.refreshToken,
                expiresAt: k.expiresAt,
                isActive: k.isActive,
              })),
              newEntry,
            ],
          }),
        });
        await loadUpstreams();
      } else {
        const preset = PRESET_PROVIDERS.find((p) => p.id === "openai-codex");
        openCreateModal(preset);
        setFormKeys([
          {
            id: `k_${Date.now()}`,
            name: newEntry.name,
            key: newEntry.key,
            refreshToken: newEntry.refreshToken,
            expiresAt: newEntry.expiresAt,
            isActive: true,
            showSecret: false,
          },
        ]);
      }
    }
  };

  const startCodexOAuth = async (targetUpstream?: UpstreamKeyItem | null) => {
    setCodexTargetUpstream(targetUpstream || null);
    setCodexLoading(true);
    setCodexError("");
    setCodexCode("");
    setCodexStatus("idle");
    setCodexStatusText("Starting local listener on port 1455...");
    setCodexModalOpen(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        authUrl: string;
        state: string;
        codeVerifier: string;
        localPort: number;
        serverRunning: boolean;
        error?: string;
      }>("/api/upstreams/codex/auth-url", { method: "POST" });

      if (!res.success || !res.authUrl) {
        throw new Error(res.error || "Failed to initialize OpenAI Codex authorization");
      }

      setCodexAuthUrl(res.authUrl);
      setCodexCodeVerifier(res.codeVerifier);
      setCodexLocalPort(res.localPort || 1455);
      setCodexLoading(false);
      setCodexStatus("authorizing");
      setCodexStatusText("Waiting for OpenAI authorization callback on http://localhost:1455...");

      // Start polling status for automatic local callback capture
      const pollTimer = setInterval(async () => {
        try {
          const statusRes = await apiRequest<{
            success: boolean;
            status: "pending" | "done" | "error" | "expired";
            result?: {
              accessToken: string;
              refreshToken?: string;
              expiresAt?: number;
              email?: string;
              name?: string;
            };
            error?: string;
          }>(`/api/upstreams/codex/status?state=${encodeURIComponent(res.state)}`);

          if (statusRes.status === "done" && statusRes.result) {
            clearInterval(pollTimer);
            const tokens = statusRes.result;
            const accountLabel = tokens.email ? `@${tokens.email}` : tokens.name ? `@${tokens.name}` : "@openai-codex";
            setCodexStatus("success");
            setCodexStatusText(`Successfully connected as ${accountLabel}!`);

            const newEntry = {
              name: accountLabel,
              key: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: tokens.expiresAt,
              isActive: true,
            };

            await applyCodexAccount(newEntry, targetUpstream);
            setTimeout(() => {
              setCodexModalOpen(false);
            }, 1800);
          } else if (statusRes.status === "error") {
            clearInterval(pollTimer);
            setCodexStatus("error");
            setCodexError(statusRes.error || "Authorization failed");
          }
        } catch {
          // Retry
        }
      }, 2000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer);
      }, 300_000);
    } catch (err: any) {
      setCodexLoading(false);
      setCodexStatus("error");
      setCodexError(err?.message || "Failed to connect to Codex authorization service");
    }
  };

  const handleExchangeCodex = async () => {
    if (!codexCode.trim()) {
      setCodexError("Please paste the authorization code, redirected callback URL, or active ChatGPT token");
      return;
    }

    setCodexLoading(true);
    setCodexError("");
    setCodexStatus("exchanging");
    setCodexStatusText("Verifying credentials...");

    try {
      const trimmed = codexCode.trim();
      let res: any;

      if (trimmed.startsWith("eyJ") && !trimmed.includes("http") && !trimmed.includes("code=")) {
        // Direct JWT Access token import
        res = await apiRequest<{
          success: boolean;
          accessToken: string;
          email?: string;
          name?: string;
          expiresAt?: number;
          error?: string;
        }>("/api/upstreams/codex/import-token", {
          method: "POST",
          body: JSON.stringify({ accessToken: trimmed }),
        });
      } else {
        // Exchange code with PKCE
        res = await apiRequest<{
          success: boolean;
          accessToken: string;
          refreshToken?: string;
          expiresAt?: number;
          email?: string;
          name?: string;
          error?: string;
        }>("/api/upstreams/codex/exchange", {
          method: "POST",
          body: JSON.stringify({
            code: trimmed,
            codeVerifier: codexCodeVerifier,
          }),
        });
      }

      if (!res.success || !res.accessToken) {
        throw new Error(res.error || "Failed to exchange or verify credentials");
      }

      const accountLabel = res.email ? `@${res.email}` : res.name ? `@${res.name}` : "@openai-codex";
      setCodexStatus("success");
      setCodexStatusText(`Successfully connected as ${accountLabel}!`);

      const newEntry = {
        name: accountLabel,
        key: res.accessToken,
        refreshToken: res.refreshToken,
        expiresAt: res.expiresAt,
        isActive: true,
      };

      await applyCodexAccount(newEntry, codexTargetUpstream);

      setTimeout(() => {
        setCodexModalOpen(false);
      }, 1800);
    } catch (err: any) {
      setCodexStatus("error");
      setCodexError(err?.message || "Verification failed");
    } finally {
      setCodexLoading(false);
    }
  };

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

    const isAntigravity = typeof preset === "object" && preset.id === "antigravity";
    const isCopilot = typeof preset === "object" && preset.id === "github-copilot";
    const isCodex = typeof preset === "object" && preset.id === "openai-codex";
    const isAccount =
      typeof preset === "object" &&
      (preset.authType === "oauth" ||
        preset.category === "oauth" ||
        isCopilot ||
        isAntigravity ||
        isCodex);
    setIsAccountMode(Boolean(isAccount));

    if (preset === "anthropic") {
      setProvider("anthropic");
      setAlias("Anthropic Claude");
      setPrefix("claude");
      setBaseUrl("https://api.anthropic.com");
      setPresetDefaultModels([]);
    } else if (preset === "openai" || !preset) {
      setProvider("openai");
      setAlias("");
      setPrefix("");
      setBaseUrl("https://api.openai.com/v1");
      setPresetDefaultModels([]);
      handleGenerateAlias();
    } else {
      setProvider(preset.provider || "openai");
      setAlias(preset.name ? (isAccount ? `${preset.name} Pool` : preset.name) : "");
      setPrefix(
        (preset.id === "github-copilot"
          ? "copilot"
          : preset.id === "antigravity"
            ? "antigravity"
            : preset.id === "openai-codex"
              ? "codex"
              : preset.id || preset.name || "node"
        )
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 12)
      );
      setBaseUrl(preset.baseUrl || "");
      setPresetDefaultModels(preset.defaultModels || []);
    }

    setApiType("Chat Completions");
    setWeight(1);
    setRoundRobin(true);
    setFormKeys([
      {
        id: `k_${Date.now()}`,
        name: isAntigravity ? "@google-account" : isCopilot ? "@github-account" : isCodex ? "@openai-account" : isAccount ? "@account" : "Prod Key",
        key: "",
        isActive: true,
        showSecret: false,
      },
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
    setPresetDefaultModels([]);
    const isAcc =
      item.name.toLowerCase().includes("copilot") ||
      item.name.toLowerCase().includes("antigravity") ||
      item.name.toLowerCase().includes("codex") ||
      Boolean(
        item.baseUrl &&
        (item.baseUrl.includes("githubcopilot.com") ||
          item.baseUrl.includes("cloudcode-pa.googleapis.com") ||
          item.baseUrl.includes("chatgpt.com/backend-api/codex"))
      );
    setIsAccountMode(Boolean(isAcc));
    setIsModalOpen(true);

    try {
      const res = await apiRequest<{ upstream: UpstreamKeyItem }>(`/api/upstreams/${item.id}`);
      if (res.upstream?.keyEntries && res.upstream.keyEntries.length > 0) {
        setFormKeys(
          res.upstream.keyEntries.map((e, idx) => ({
            id: e.id || `k_${idx + 1}`,
            name: e.name || (isAcc ? `Account #${idx + 1}` : `API Key #${idx + 1}`),
            key: e.key || "",
            isActive: e.isActive !== false,
            showSecret: false,
            jwtInfo: parseJwtInfo(e.key || ""),
          }))
        );
      } else {
        const fallback = res.upstream?.apiKey || item.apiKey || "";
        setFormKeys([
          {
            id: "k_1",
            name: isAcc ? "Account #1" : "Prod Key",
            key: fallback,
            isActive: true,
            showSecret: false,
            jwtInfo: parseJwtInfo(fallback),
          },
        ]);
      }
    } catch (e) {
      setFormKeys([
        {
          id: "k_1",
          name: isAcc ? "Account #1" : "Prod Key",
          key: item.apiKey || "",
          isActive: true,
          showSecret: false,
          jwtInfo: parseJwtInfo(item.apiKey || ""),
        },
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
        const newItems: FormKeyEntry[] = splitKeys.map((k, i) => {
          const jwt = parseJwtInfo(k);
          return {
            id: `k_${Date.now()}_${i}`,
            name:
              jwt?.email ||
              (i === 0 && currentItem?.name && !currentItem.name.includes("user@email.com")
                ? currentItem.name
                : isAccountMode
                  ? `Account #${updated.length + i}`
                  : `API Key #${updated.length + i}`),
            key: k,
            isActive: true,
            showSecret: false,
            jwtInfo: jwt,
          };
        });
        updated.splice(index, 1, ...newItems);
        setFormKeys(updated);
        return;
      }
    }

    const updated = [...formKeys];
    const jwt = parseJwtInfo(val);
    const prevName = updated[index]?.name || "";
    let newName = prevName;
    if (jwt?.email && (prevName.includes("Account #") || prevName.includes("user@email.com") || !prevName)) {
      newName = jwt.email;
    }

    updated[index] = {
      ...updated[index],
      name: newName,
      key: val,
      testResult: null,
      jwtInfo: jwt,
    };
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
    const nextNum = formKeys.length + 1;
    setFormKeys([
      ...formKeys,
      {
        id: `k_${Date.now()}`,
        name: isAccountMode ? `Account #${nextNum}` : `API Key #${nextNum}`,
        key: "",
        isActive: true,
        showSecret: false,
      },
    ]);
  };

  const handleRemoveKey = (index: number) => {
    if (formKeys.length <= 1) {
      setFormKeys([
        {
          id: `k_${Date.now()}`,
          name: isAccountMode ? "Account #1" : "Primary Key",
          key: "",
          isActive: true,
          showSecret: false,
        },
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
      setModalError(
        isAccountMode
          ? "Please connect or provide at least one GitHub Copilot account"
          : "Please provide at least one valid API Key"
      );
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
            models: presetDefaultModels.length > 0 ? presetDefaultModels : undefined,
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
          const cleanKey = p.replace(/^["']|["']$/g, "").trim();
          const jwt = parseJwtInfo(cleanKey);
          newItems.push({
            id: `k_${Date.now()}_${count}`,
            name: jwt?.email || (isAccountMode ? `Account #${count}` : `API Key #${count}`),
            key: cleanKey,
            isActive: true,
            showSecret: false,
            jwtInfo: jwt,
          });
        }
      } else {
        const match = trimmed.match(/^([^:=]+)[:=]\s*(.+)$/);
        if (match) {
          const rawKey = match[2]!.trim().replace(/^[,"';]+|[,"';]+$/g, "");
          const jwt = parseJwtInfo(rawKey);
          newItems.push({
            id: `k_${Date.now()}_${++count}`,
            name: match[1]!.trim(),
            key: rawKey,
            isActive: true,
            showSecret: false,
            jwtInfo: jwt,
          });
        } else {
          const cleanKey = trimmed.replace(/^[,"';]+|[,"';]+$/g, "");
          const jwt = parseJwtInfo(cleanKey);
          newItems.push({
            id: `k_${Date.now()}_${++count}`,
            name: jwt?.email || (isAccountMode ? `Account #${count}` : `API Key #${count}`),
            key: cleanKey,
            isActive: true,
            showSecret: false,
            jwtInfo: jwt,
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
              className={`p-1.5 rounded text-xs cursor-pointer ${viewMode === "grid"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                }`}
              title="Card Grid View (9Router style)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded text-xs cursor-pointer ${viewMode === "table"
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

          {/* SECTION 2: OAuth Providers (Antigravity & GitHub Copilot) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                  <Rocket className="w-4 h-4 text-indigo-500" />
                  <span>OAuth Providers</span>
                  <span className="text-xs font-normal text-zinc-400">
                    ({PRESET_PROVIDERS.filter((p) => p.category === "oauth").length})
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Connect accounts via official OAuth. Store multiple accounts with automatic round-robin request routing between active accounts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3.5">
              {PRESET_PROVIDERS.filter((p) => p.category === "oauth")
                .filter((p) => !query || p.name.toLowerCase().includes(query) || p.id.includes(query))
                .map((preset) => {
                  const connected = findUpstreamForPreset(preset);
                  const isConnected = Boolean(connected);
                  const activeKeysCount = connected?.activeKeysCount ?? (connected?.keyEntries?.filter((k) => k.isActive).length ?? 0);
                  const totalKeysCount = connected?.totalKeysCount ?? (connected?.keyEntries?.length ?? 0);

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
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${isConnected
                        ? "skeuo-card border-zinc-400/40 dark:border-zinc-700/60 shadow-sm"
                        : "bg-zinc-50/60 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400/50 dark:hover:border-zinc-600"
                        }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-10 h-10 rounded-lg ${preset.iconBg} flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform`}
                            >
                              {preset.id === "antigravity" ? (
                                <Rocket className="w-5 h-5 text-white" />
                              ) : preset.id === "openai-codex" ? (
                                <OpenAIIcon className="w-5 h-5 text-white" />
                              ) : (
                                <GithubIcon className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5">
                                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                  {preset.name}
                                </h4>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 font-semibold border border-zinc-500/20">
                                  {preset.badge || "OAuth Flow"}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1.5 text-[11px] mt-0.5">
                                {isConnected ? (
                                  <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                                    <span>{activeKeysCount} of {totalKeysCount} Active Accounts</span>
                                  </span>
                                ) : (
                                  <span className="text-zinc-400">No accounts saved yet</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 font-mono flex items-center space-x-1">
                          <RotateCw className="w-2.5 h-2.5" />
                          <span>Round-Robin Default</span>
                        </span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-semibold group-hover:underline flex items-center space-x-1">
                          <span>
                            {isConnected
                              ? "Manage Accounts"
                              : preset.id === "antigravity"
                                ? "+ Setup Antigravity"
                                : preset.id === "openai-codex"
                                  ? "+ Setup Codex"
                                  : "+ Setup Copilot"}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5" />
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
                    const isAccountItem =
                      item.name.toLowerCase().includes("copilot") ||
                      item.name.toLowerCase().includes("antigravity") ||
                      Boolean(
                        item.baseUrl &&
                        (item.baseUrl.includes("githubcopilot.com") ||
                          item.baseUrl.includes("cloudcode-pa.googleapis.com"))
                      );

                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.provider === "openai"
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
                          {isAccountItem ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 font-mono">
                              Managed OAuth
                            </span>
                          ) : item.baseUrl ? (
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
                {isAccountMode
                  ? alias.toLowerCase().includes("antigravity") || (baseUrl && baseUrl.includes("cloudcode-pa.googleapis.com"))
                    ? editingUpstream
                      ? "Edit Provider Antigravity (Google OAuth)"
                      : "Setup Provider Antigravity (Google OAuth Multi-Account)"
                    : alias.toLowerCase().includes("codex") || (baseUrl && baseUrl.includes("chatgpt.com/backend-api/codex"))
                      ? editingUpstream
                        ? "Edit Provider OpenAI Codex (OAuth)"
                        : "Setup Provider OpenAI Codex (ChatGPT OAuth Multi-Account)"
                      : editingUpstream
                        ? "Edit Provider GitHub Copilot (OAuth)"
                        : "Setup Provider GitHub Copilot (OAuth Multi-Account)"
                  : editingUpstream
                    ? `Edit ${provider === "openai" ? "OpenAI" : "Anthropic"} Compatible`
                    : `Add ${provider === "openai" ? "OpenAI" : "Anthropic"} Compatible`}
              </h3>
            </div>

            {/* Antigravity / Codex / Copilot OAuth Mode Guide Banner */}
            {isAccountMode && (
              <div className="mb-4 p-3 rounded-lg border border-zinc-700/60 bg-zinc-900/40 text-zinc-200 text-xs space-y-2">
                {alias.toLowerCase().includes("antigravity") || (baseUrl && baseUrl.includes("cloudcode-pa.googleapis.com")) ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold flex items-center space-x-1.5 text-zinc-100">
                        <Rocket className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Antigravity</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => startAntigravityOAuth()}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <GoogleIcon className="w-3.5 h-3.5" />
                        <span>+ Login via Google</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Connect your Google accounts via Cloud Code OAuth. Store multiple accounts below and Neko-Router will automatically rotate requests using Round-Robin across active accounts.
                    </p>
                    <div className="text-[10px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded-md border border-zinc-800 space-y-1">
                      <div className="font-medium text-zinc-300">How to Connect:</div>
                      <div>1. Click <strong>+ Login via Google</strong> above to open the official Google OAuth consent screen.</div>
                      <div>2. After approval, copy and paste the redirected callback URL or authorization code into the prompt.</div>
                      <div>3. You can also manually paste existing active Google access tokens (<code>ya29...</code>) below.</div>
                    </div>
                  </>
                ) : alias.toLowerCase().includes("codex") || (baseUrl && baseUrl.includes("chatgpt.com/backend-api/codex")) ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold flex items-center space-x-1.5 text-zinc-100">
                        <OpenAIIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>OpenAI Codex</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => startCodexOAuth()}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <OpenAIIcon className="w-3.5 h-3.5 text-white" />
                        <span>+ Login via OpenAI</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Connect your OpenAI accounts via Codex CLI OAuth. Store multiple ChatGPT accounts below and Neko-Router will automatically rotate requests using Round-Robin across active accounts.
                    </p>
                    <div className="text-[10px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded-md border border-zinc-800 space-y-1">
                      <div className="font-medium text-zinc-300">How to Connect:</div>
                      <div>1. Click <strong>+ Login via OpenAI</strong> above to open the official OpenAI OAuth login screen.</div>
                      <div>2. Sign in and approve authorization. The local callback on port 1455 will automatically catch and link the account.</div>
                      <div>3. You can also manually paste existing ChatGPT access tokens (<code>eyJ...</code>) or the callback URL into the prompt below.</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold flex items-center space-x-1.5 text-zinc-100">
                        <GithubIcon className="w-4 h-4 text-white shrink-0" />
                        <span>GitHub Copilot</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => startCopilotOAuth()}
                        className="px-2.5 py-1 rounded bg-white text-zinc-900 hover:bg-zinc-100 font-semibold text-[11px] inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <GithubIcon className="w-3.5 h-3.5 text-zinc-900" />
                        <span>+ Login via GitHub</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Connect your GitHub account via Device Code OAuth. Store multiple GitHub Copilot accounts below and Neko-Router will automatically rotate requests using Round-Robin across active accounts.
                    </p>
                    <div className="text-[10px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded-md border border-zinc-800 space-y-1">
                      <div className="font-medium text-zinc-300">How to Connect:</div>
                      <div>1. Click <strong>+ Login via GitHub (Device Flow)</strong> above to obtain a verification code.</div>
                      <div>2. Enter the code at <a href="https://github.com/login/device" target="_blank" rel="noreferrer" className="underline text-indigo-400 font-medium">github.com/login/device</a> and approve authorization.</div>
                      <div>3. The account will automatically be added to the list below. You can also manually paste existing <code>ghu_...</code> tokens.</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {modalError && (
              <div className="mb-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveUpstream} className="space-y-3.5 text-xs">
              {/* Name */}
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {isAccountMode ? "Provider / Pool Name *" : "Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder={
                    isAccountMode
                      ? alias.toLowerCase().includes("antigravity") || (baseUrl && baseUrl.includes("cloudcode-pa.googleapis.com"))
                        ? "Antigravity Pool"
                        : alias.toLowerCase().includes("codex") || (baseUrl && baseUrl.includes("chatgpt.com/backend-api/codex"))
                          ? "OpenAI Codex Pool"
                          : "GitHub Copilot Pool"
                      : provider === "openai"
                        ? "OpenAI Compatible (Prod)"
                        : "Anthropic Compatible"
                  }
                  className="w-full px-3 py-2 rounded-md skeuo-inset text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  {isAccountMode ? "Identifier name for this OAuth account pool." : "Required. A friendly label for this node."}
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
                  placeholder={
                    isAccountMode
                      ? alias.toLowerCase().includes("antigravity") || (baseUrl && baseUrl.includes("cloudcode-pa.googleapis.com"))
                        ? "antigravity"
                        : alias.toLowerCase().includes("codex") || (baseUrl && baseUrl.includes("chatgpt.com/backend-api/codex"))
                          ? "codex"
                          : "copilot"
                      : "e.g. oc-prod"
                  }
                  className="w-full px-3 py-2 rounded-md skeuo-inset font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  Optional. Used as the provider prefix for model IDs (e.g. codex/gpt-5.4).
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

              {/* Base URL - Hidden for OAuth providers */}
              {!isAccountMode && (
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
              )}

              {/* Multi-Key Pool / Account Pool & Round Robin */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs flex items-center space-x-1.5">
                      {isAccountMode ? (
                        alias.toLowerCase().includes("antigravity") || (baseUrl && baseUrl.includes("cloudcode-pa.googleapis.com")) ? (
                          <Rocket className="w-3.5 h-3.5 text-indigo-400" />
                        ) : alias.toLowerCase().includes("codex") || (baseUrl && baseUrl.includes("chatgpt.com/backend-api/codex")) ? (
                          <OpenAIIcon className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <GithubIcon className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                        )
                      ) : (
                        <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                      <span>
                        {isAccountMode
                          ? alias.toLowerCase().includes("antigravity") || (baseUrl && baseUrl.includes("cloudcode-pa.googleapis.com"))
                            ? `Antigravity Google Account Pool (${formKeys.length} accounts) *`
                            : alias.toLowerCase().includes("codex") || (baseUrl && baseUrl.includes("chatgpt.com/backend-api/codex"))
                              ? `OpenAI Codex Account Pool (${formKeys.length} accounts) *`
                              : `GitHub Copilot Account Pool (${formKeys.length} accounts) *`
                          : `API Key Pool (${formKeys.length} keys) *`}
                      </span>
                    </label>
                    <p className="text-[10px] text-zinc-400">
                      {isAccountMode
                        ? "Store multiple OAuth accounts. Neko-Router automatically round-robins requests across active accounts."
                        : "Configure keys. Toggle on/off individually."}
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
                      title="Rotate requests across active accounts/keys in this pool"
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
                      className={`p-2.5 rounded-lg border transition-all ${k.isActive
                        ? "skeuo-card-subtle border-zinc-200 dark:border-zinc-800"
                        : "bg-zinc-100/60 dark:bg-zinc-900/30 border-dashed border-zinc-300 dark:border-zinc-800 opacity-60"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <input
                          type="text"
                          value={k.name}
                          onChange={(e) => handleKeyNameChange(idx, e.target.value)}
                          placeholder={isAccountMode ? `@github-account-${idx + 1}` : `Key #${idx + 1}`}
                          className="text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 flex-1 max-w-[200px]"
                        />

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleToggleKeyActive(idx)}
                            className="p-0.5 cursor-pointer"
                            title={k.isActive ? "Disable account" : "Enable account"}
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
                              title="Delete account"
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
                          placeholder={
                            isAccountMode
                              ? "Paste GitHub Token (ghu_...) or login via GitHub above"
                              : provider === "openai"
                                ? "sk-proj-... (or paste multiple keys)"
                                : "sk-ant-..."
                          }
                          className="w-full px-3 py-1.5 pr-8 pl-7 rounded-md skeuo-inset font-mono text-xs text-zinc-900 dark:text-zinc-100"
                        />
                        {isAccountMode ? (
                          <GithubIcon className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2" />
                        ) : (
                          <KeyRound className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2" />
                        )}
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
                    {isAccountMode && (
                      alias.toLowerCase().includes("antigravity") || (baseUrl && baseUrl.includes("cloudcode-pa.googleapis.com")) ? (
                        <button
                          type="button"
                          onClick={() => startAntigravityOAuth()}
                          className="inline-flex items-center space-x-1 text-[11px] font-semibold text-white bg-indigo-600 px-2.5 py-0.5 rounded hover:bg-indigo-500 cursor-pointer shadow-xs"
                        >
                          <GoogleIcon className="w-3 h-3" />
                          <span>+ Login via Google</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startCopilotOAuth()}
                          className="inline-flex items-center space-x-1 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-200/80 dark:bg-zinc-800 px-2 py-0.5 rounded hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
                        >
                          <GithubIcon className="w-3 h-3" />
                          <span>+ Login via GitHub</span>
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      onClick={handleAddKey}
                      className="inline-flex items-center space-x-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAccountMode ? "Add Manual Token Row" : "Add Key Row"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkPasteOpen(!isBulkPasteOpen)}
                      className="inline-flex items-center space-x-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:underline cursor-pointer"
                    >
                      <UploadCloud className="w-3 h-3" />
                      <span>{isAccountMode ? "Bulk Paste Multiple Accounts" : "Bulk Paste Keys"}</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-400 italic">
                    {isAccountMode
                      ? alias.toLowerCase().includes("antigravity") || (baseUrl && baseUrl.includes("cloudcode-pa.googleapis.com"))
                        ? "Format: @email:ya29... or one token/code per line"
                        : "Format: @username:ghu_... or one token per line"
                      : "Paste multiple keys to auto-split"}
                  </span>
                </div>

                {isBulkPasteOpen && (
                  <div className="mt-2.5 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-500/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      <span className="flex items-center space-x-1">
                        <UploadCloud className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{isAccountMode ? "Bulk Paste Multiple Accounts" : "Paste Multiple Keys"}</span>
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
                      placeholder={
                        isAccountMode
                          ? "@user1:ghu_xxxx...\n@user2:ghu_yyyy...\nor paste tokens directly one per line..."
                          : "Paste keys here (one per line, comma separated, or Label: Key)..."
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-900 dark:text-zinc-100"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleBulkPasteIntoForm}
                        className="skeuo-btn-primary px-3 py-1 rounded text-xs font-medium cursor-pointer"
                      >
                        {isAccountMode ? "Add to Account List" : "Append to Form"}
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
                    className={`mt-2 p-2 rounded-md text-xs flex items-center space-x-2 ${checkStatus.success
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
            {(() => {
              const isCopilotProvider =
                activeConnectionsUpstream.name.toLowerCase().includes("copilot") ||
                Boolean(activeConnectionsUpstream.baseUrl && activeConnectionsUpstream.baseUrl.includes("githubcopilot.com"));

              const isAntigravityProvider =
                activeConnectionsUpstream.name.toLowerCase().includes("antigravity") ||
                Boolean(activeConnectionsUpstream.baseUrl && activeConnectionsUpstream.baseUrl.includes("cloudcode-pa.googleapis.com"));

              const isCodexProvider =
                activeConnectionsUpstream.name.toLowerCase().includes("codex") ||
                Boolean(activeConnectionsUpstream.baseUrl && activeConnectionsUpstream.baseUrl.includes("chatgpt.com/backend-api/codex"));

              const isAccountProvider = isCopilotProvider || isAntigravityProvider || isCodexProvider;

              return (
                <>
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
                          {isAntigravityProvider
                            ? `Manage Antigravity Accounts: ${activeConnectionsUpstream.name}`
                            : isCopilotProvider
                              ? `Manage GitHub Copilot Accounts: ${activeConnectionsUpstream.name}`
                              : isCodexProvider
                                ? `Manage OpenAI Codex Accounts: ${activeConnectionsUpstream.name}`
                                : `Connections: ${activeConnectionsUpstream.name}`}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isAntigravityProvider
                            ? "bg-indigo-600 text-white border border-indigo-500"
                            : isCopilotProvider
                              ? "bg-zinc-800 text-white border border-zinc-700"
                              : isCodexProvider
                                ? "bg-emerald-600 text-white border border-emerald-500"
                                : activeConnectionsUpstream.provider === "openai"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                        >
                          {isAntigravityProvider
                            ? "OAuth Antigravity"
                            : isCopilotProvider
                              ? "OAuth Copilot"
                              : isCodexProvider
                                ? "OAuth Codex"
                                : activeConnectionsUpstream.provider}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {connectionsList.filter((k) => k.isActive).length} of {connectionsList.length} {isAccountProvider ? "active accounts" : "connections active"}
                        {!isAccountProvider && activeConnectionsUpstream.baseUrl ? ` · ${activeConnectionsUpstream.baseUrl}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Action Bar: Test One-by-One, Round Robin switch, + Add Key/Account */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 my-3">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleTestOneByOne}
                        disabled={testingOneByOne || connectionsList.length === 0}
                        className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Sequentially ping and verify every key/account in this pool"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingOneByOne ? "animate-spin text-indigo-500" : ""}`} />
                        <span>{testingOneByOne ? "Testing..." : isAccountProvider ? "Test Accounts One-by-One" : "Test Connection One-by-One"}</span>
                      </button>

                      {/* Round Robin Switch */}
                      <button
                        type="button"
                        onClick={handleToggleRoundRobinInConnections}
                        className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-2 cursor-pointer"
                        title="Toggle round-robin rotation between active keys/accounts"
                      >
                        <span className="text-zinc-700 dark:text-zinc-300">Round Robin</span>
                        {activeConnectionsUpstream.roundRobin !== false ? (
                          <ToggleRight className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-zinc-400" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 flex-wrap">
                      {isAntigravityProvider && (
                        <button
                          type="button"
                          onClick={() => startAntigravityOAuth(activeConnectionsUpstream)}
                          className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs"
                          title="Connect a new Google account via OAuth"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          <span>+ Connect via Google</span>
                        </button>
                      )}
                      {isCopilotProvider && (
                        <button
                          type="button"
                          onClick={() => startCopilotOAuth(activeConnectionsUpstream)}
                          className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          title="Connect a new GitHub account via OAuth Device Code"
                        >
                          <GithubIcon className="w-3.5 h-3.5" />
                          <span>+ Connect via GitHub</span>
                        </button>
                      )}
                      {isCodexProvider && (
                        <button
                          type="button"
                          onClick={() => startCodexOAuth(activeConnectionsUpstream)}
                          className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs"
                          title="Connect a new OpenAI Codex account via OAuth"
                        >
                          <OpenAIIcon className="w-3.5 h-3.5" />
                          <span>+ Connect via OpenAI</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsMassImportOpen(!isMassImportOpen);
                          setIsAddingConnection(false);
                          setMassImportError("");
                          setMassImportSuccess("");
                        }}
                        className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer text-indigo-600 dark:text-indigo-400 hover:border-indigo-500/50"
                        title="Import accounts in bulk"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isAccountProvider ? "Bulk Import Accounts" : "Mass Import Keys"}</span>
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
                        <span>{isAccountProvider ? "Add Token" : "Add API Key"}</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Mass Import Keys Box */}
            {isMassImportOpen && (
              <form
                onSubmit={handleMassImportKeys}
                className="mb-3 p-3.5 rounded-lg border border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UploadCloud className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Mass Import Accounts / Keys</span>
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
                    placeholder={
                      activeConnectionsUpstream.name.toLowerCase().includes("copilot") || (activeConnectionsUpstream.baseUrl && activeConnectionsUpstream.baseUrl.includes("githubcopilot.com"))
                        ? "@user1:ghu_...\n@user2:ghu_...\natau paste token ghu_... langsung per baris..."
                        : "Paste hundreds of keys here (one key per line, or comma-separated, or Label: Key)\nsk-proj-abc123456789...\nsk-proj-def987654321...\nBackup Key 3: sk-proj-111..."
                    }
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Mendukung format <code>@user:ghu_token</code>, atau token langsung per baris.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Prefix / Default Label</label>
                    <input
                      type="text"
                      value={massImportPrefix}
                      onChange={(e) => setMassImportPrefix(e.target.value)}
                      placeholder={activeConnectionsUpstream.name.toLowerCase().includes("copilot") ? "@github-user" : "e.g. API Key"}
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
                          <span>Import {detectedKeysCount} {activeConnectionsUpstream.name.toLowerCase().includes("copilot") ? "Accounts" : "Keys"}</span>
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
                  <span>
                    {activeConnectionsUpstream.name.toLowerCase().includes("copilot")
                      ? "Add GitHub Copilot Account (Token)"
                      : "Add New Connection Key"}
                  </span>
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
                    placeholder={
                      activeConnectionsUpstream.name.toLowerCase().includes("copilot")
                        ? "GitHub Username (e.g. @octocat)"
                        : "Key Label (e.g. Backup Key)"
                    }
                    value={newConnName}
                    onChange={(e) => setNewConnName(e.target.value)}
                    className="px-2.5 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                  <input
                    type="password"
                    required
                    placeholder={
                      activeConnectionsUpstream.name.toLowerCase().includes("copilot")
                        ? "GitHub User Token (ghu_...)"
                        : "API Key (sk-...)"
                    }
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
                    {activeConnectionsUpstream.name.toLowerCase().includes("copilot") ? "Save Account" : "Save Key"}
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
                  <p>No accounts or keys stored yet.</p>
                </div>
              ) : (
                connectionsList.map((conn, idx) => {
                  const testInfo = keyTestStatus[conn.id];
                  const isCop =
                    activeConnectionsUpstream.name.toLowerCase().includes("copilot") ||
                    Boolean(activeConnectionsUpstream.baseUrl && activeConnectionsUpstream.baseUrl.includes("githubcopilot.com"));
                  const isAnti =
                    activeConnectionsUpstream.name.toLowerCase().includes("antigravity") ||
                    Boolean(activeConnectionsUpstream.baseUrl && activeConnectionsUpstream.baseUrl.includes("cloudcode-pa.googleapis.com"));
                  const isCdx =
                    activeConnectionsUpstream.name.toLowerCase().includes("codex") ||
                    Boolean(activeConnectionsUpstream.baseUrl && activeConnectionsUpstream.baseUrl.includes("chatgpt.com/backend-api/codex"));

                  return (
                    <div
                      key={conn.id}
                      className={`p-3 rounded-lg border transition-all ${conn.isActive
                        ? "skeuo-card-subtle border-zinc-200/90 dark:border-zinc-800"
                        : "bg-zinc-100/60 dark:bg-zinc-900/30 border-dashed border-zinc-300 dark:border-zinc-800/80 opacity-60"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${conn.isActive
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                              : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                              }`}
                          >
                            {isCop ? (
                              <GithubIcon className="w-4 h-4" />
                            ) : isAnti ? (
                              <Rocket className="w-4 h-4 text-indigo-400" />
                            ) : isCdx ? (
                              <OpenAIIcon className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <KeyRound className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                                {conn.name ||
                                  (isAnti
                                    ? `Antigravity Account #${idx + 1}`
                                    : isCop
                                      ? `Copilot Account #${idx + 1}`
                                      : isCdx
                                        ? `Codex Account #${idx + 1}`
                                        : `API Key #${idx + 1}`)}
                              </span>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold ${conn.isActive
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 border border-zinc-500/30"
                                  }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full mr-1 ${conn.isActive ? "bg-emerald-500" : "bg-zinc-400"
                                    }`}
                                />
                                {conn.isActive ? "active" : "disabled"}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                              <span>
                                {isAnti
                                  ? `Account #${idx + 1}`
                                  : isCop
                                    ? `Account #${idx + 1}`
                                    : isCdx
                                      ? `Account #${idx + 1}`
                                      : `API Key #${idx + 1}`}
                              </span>
                              <span>·</span>
                              <span>{conn.maskedKey || "******"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {testInfo && !testInfo.testing && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center space-x-1 ${testInfo.success
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
                        className={`w-2 h-2 rounded-full shrink-0 ${m.enabled ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-zinc-500/40"
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
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${m.enabled
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
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-zinc-700/50 transition-colors duration-150 ease-in-out focus:outline-none ${m.enabled
                          ? "bg-emerald-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                          : "bg-zinc-300 dark:bg-zinc-800"
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-150 ease-in-out ${m.enabled ? "translate-x-4" : "translate-x-0"
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

      {/* GitHub Copilot Device Code Flow Modal */}
      {copilotModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCopilotModalOpen(false)}
        >
          <div
            className="skeuo-card max-w-md w-full p-6 rounded-2xl border border-zinc-300 dark:border-zinc-700 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center border border-zinc-700 shadow-xs">
                  <GithubIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Connect GitHub Copilot
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    OAuth Device Code Flow
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCopilotModalOpen(false)}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                title="Close"
              />
            </div>

            {copilotLoading ? (
              <div className="py-10 text-center space-y-3">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-zinc-600 dark:text-zinc-300" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {copilotStatusText || "Connecting to GitHub..."}
                </p>
              </div>
            ) : copilotError ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs space-y-3 text-center">
                <AlertCircle className="w-6 h-6 mx-auto text-red-500" />
                <p className="font-semibold">{copilotError}</p>
                <button
                  type="button"
                  onClick={() => startCopilotOAuth(copilotTargetUpstream)}
                  className="skeuo-btn px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : copilotDeviceInfo ? (
              <div className="space-y-4">
                {/* Step 1: User Code */}
                <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                    Step 1: Copy Verification Code
                  </span>
                  <div className="text-2xl font-mono font-extrabold tracking-widest text-zinc-900 dark:text-zinc-100 select-all">
                    {copilotDeviceInfo.user_code}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(copilotDeviceInfo.user_code);
                        setCopilotCopied(true);
                        setTimeout(() => setCopilotCopied(false), 3000);
                      } catch (e) { }
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer transition-colors ${copilotCopied
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                  >
                    {copilotCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Code Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Step 2: Open GitHub link */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block text-center">
                    Step 2: Enter Code on GitHub
                  </span>
                  <a
                    href={copilotDeviceInfo.verification_uri || "https://github.com/login/device"}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold text-xs flex items-center justify-center space-x-2 shadow-sm cursor-pointer transition-all"
                  >
                    <GithubIcon className="w-4 h-4" />
                    <span>Open github.com/login/device</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                </div>

                {/* Step 3: Polling Status indicator */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-center">
                  {copilotStatus === "polling" && (
                    <div className="flex items-center justify-center space-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[11px]">{copilotStatusText}</span>
                    </div>
                  )}
                  {copilotStatus === "success" && (
                    <div className="flex items-center justify-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{copilotStatusText}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCopilotModalOpen(false)}
                className="skeuo-btn px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Antigravity Google OAuth Flow Modal */}
      {antigravityModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAntigravityModalOpen(false)}
        >
          <div
            className="skeuo-card max-w-md w-full p-6 rounded-2xl border border-zinc-300 dark:border-zinc-700 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center border border-indigo-500 shadow-xs">
                  <Rocket className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                    <span>Connect Antigravity</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                      Google OAuth
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Cloud Code Assist Authorization
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAntigravityModalOpen(false)}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                title="Close"
              />
            </div>

            {antigravityLoading && antigravityStatus === "idle" ? (
              <div className="py-10 text-center space-y-3">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-500" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {antigravityStatusText || "Generating authorization link..."}
                </p>
              </div>
            ) : antigravityError && antigravityStatus === "error" && !antigravityAuthUrl ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs space-y-3 text-center">
                <AlertCircle className="w-6 h-6 mx-auto text-red-500" />
                <p className="font-semibold">{antigravityError}</p>
                <button
                  type="button"
                  onClick={() => startAntigravityOAuth(antigravityTargetUpstream)}
                  className="skeuo-btn px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Step 1: Open Google Sign-In */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                    Step 1: Sign In & Authorize with Google
                  </span>
                  <a
                    href={antigravityAuthUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm cursor-pointer transition-all"
                  >
                    <GoogleIcon className="w-4 h-4 bg-white p-0.5 rounded-full" />
                    <span>Open Google Sign-In Page</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Sign in to your Google account and grant Cloud Code permissions. After approval, you will be redirected to the callback URL.
                  </p>
                </div>

                {/* Step 2: Paste Callback URL or Code */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                    Step 2: Paste Callback URL, Code, or ya29 Token
                  </span>
                  <div className="space-y-1.5">
                    <textarea
                      value={antigravityCode}
                      onChange={(e) => {
                        setAntigravityCode(e.target.value);
                        setAntigravityError("");
                      }}
                      placeholder="Paste redirected callback URL (http://localhost:51121/oauth-callback?code=...) or code parameter or active ya29 token"
                      className="w-full h-20 px-3 py-2 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {antigravityError && (
                      <p className="text-[11px] text-red-500 font-medium">{antigravityError}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleExchangeAntigravity}
                    disabled={antigravityLoading || !antigravityCode.trim()}
                    className="w-full py-2 px-4 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {antigravityLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying & Exchanging...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm & Add Account</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status indicator */}
                {antigravityStatus === "success" && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-center">
                    <div className="flex items-center justify-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{antigravityStatusText}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAntigravityModalOpen(false)}
                className="skeuo-btn px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OpenAI Codex OAuth Flow Modal */}
      {codexModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCodexModalOpen(false)}
        >
          <div
            className="skeuo-card max-w-md w-full p-6 rounded-2xl border border-zinc-300 dark:border-zinc-700 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center border border-emerald-500 shadow-xs">
                  <OpenAIIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5">
                    <span>Connect OpenAI Codex</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                      OAuth PKCE
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    ChatGPT Codex CLI Authorization
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCodexModalOpen(false)}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors inline-block cursor-pointer"
                title="Close"
              />
            </div>

            {codexLoading && codexStatus === "idle" ? (
              <div className="py-10 text-center space-y-3">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-500" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {codexStatusText || "Starting local listener and generating authorization link..."}
                </p>
              </div>
            ) : codexError && codexStatus === "error" && !codexAuthUrl ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs space-y-3 text-center">
                <AlertCircle className="w-6 h-6 mx-auto text-red-500" />
                <p className="font-semibold">{codexError}</p>
                <button
                  type="button"
                  onClick={() => startCodexOAuth(codexTargetUpstream)}
                  className="skeuo-btn px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Step 1: Open OpenAI Sign-In */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                    Step 1: Sign In & Authorize with OpenAI
                  </span>
                  <a
                    href={codexAuthUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm cursor-pointer transition-all"
                  >
                    <OpenAIIcon className="w-4 h-4 text-white" />
                    <span>Open OpenAI Authorization Page</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                  <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mt-1 shrink-0" />
                    <div>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                        Automatic Callback Listener Active
                      </p>
                      <p className="text-[10px] mt-0.5">
                        Listening on <code className="text-emerald-600 dark:text-emerald-400 font-mono">http://localhost:{codexLocalPort}</code>. Once approved in your browser, Neko-Router will automatically complete the connection!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Fallback paste */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                    Step 2: Manual Fallback (Paste URL, Code, or Token)
                  </span>
                  <div className="space-y-1.5">
                    <textarea
                      value={codexCode}
                      onChange={(e) => {
                        setCodexCode(e.target.value);
                        setCodexError("");
                      }}
                      placeholder="Paste redirected callback URL (http://localhost:1455/auth/callback?code=...), code parameter, or active ChatGPT session token"
                      className="w-full h-20 px-3 py-2 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {codexError && (
                      <p className="text-[11px] text-red-500 font-medium">{codexError}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleExchangeCodex}
                    disabled={codexLoading || !codexCode.trim()}
                    className="w-full py-2 px-4 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {codexLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying & Exchanging...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm & Add Account</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status indicator */}
                {codexStatus === "success" && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-center">
                    <div className="flex items-center justify-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{codexStatusText}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCodexModalOpen(false)}
                className="skeuo-btn px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
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

export default UpstreamKeysTab;
