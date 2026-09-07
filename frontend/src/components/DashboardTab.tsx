import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Activity,
  Layers,
  Check,
  Copy,
  RefreshCw,
  Clock,
  Sparkles,
  Cat,
  Plus,
  Minus,
  Maximize2,
  Globe,
} from "lucide-react";
import {
  apiRequest,
  type TelemetryStats,
  type UpstreamKeyItem,
  type TelemetryLogItem,
} from "../lib/api";

function formatTimeAgo(timestamp: number): string {
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

function getProviderTag(name: string): string {
  const clean = name.trim().toUpperCase();
  if (clean.includes("OPENAI")) return "OA";
  if (clean.includes("ANTHROPIC") || clean.includes("CLAUDE")) return "AN";
  if (clean.includes("DEEPSEEK")) return "DS";
  if (clean.includes("GROQ")) return "GQ";
  if (clean.includes("RYZUMI")) return "OP";
  if (clean.includes("OPENCODE")) return "OC";
  if (clean.includes("MIMO")) return "MM";
  if (clean.includes("GEMINI")) return "GM";
  if (clean.includes("OLLAMA")) return "OL";
  const parts = clean.split(/[\s-_]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2);
}

export const DashboardTab: React.FC = () => {
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [upstreams, setUpstreams] = useState<UpstreamKeyItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<TelemetryLogItem[]>([]);
  const [activeUpstreamIds, setActiveUpstreamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Base URL copy states
  const [copiedType, setCopiedType] = useState<"v1" | "root" | null>(null);

  // 9Router View Tabs & Filters
  const [activeSubtab, setActiveSubtabState] = useState<"overview" | "details">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neko_dashboard_subtab");
      if (saved === "overview" || saved === "details") return saved;
    }
    return "overview";
  });

  const setActiveSubtab = (tab: "overview" | "details") => {
    setActiveSubtabState(tab);
    try {
      localStorage.setItem("neko_dashboard_subtab", tab);
    } catch {}
  };
  const [timeFilter, setTimeFilter] = useState<"Today" | "24h" | "7D" | "30D">("Today");
  const [graphMetricView, setGraphMetricView] = useState<"tokens" | "cost">("tokens");

  // Router Graph Canvas Zoom & Pan
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      return 0.8;
    }
    return 1;
  });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsData, upstreamsData, logsData] = await Promise.all([
        apiRequest<TelemetryStats>("/api/telemetry/stats").catch(() => null),
        apiRequest<{ upstreams: UpstreamKeyItem[] }>("/api/upstreams").catch(() => ({ upstreams: [] })),
        apiRequest<{ logs: TelemetryLogItem[] }>("/api/telemetry/logs?limit=12").catch(() => ({ logs: [] })),
      ]);

      if (statsData) {
        setStats(statsData);
        if (Array.isArray(statsData.activeUpstreamIds)) {
          setActiveUpstreamIds(statsData.activeUpstreamIds);
        }
      }
      if (upstreamsData?.upstreams) setUpstreams(upstreamsData.upstreams);
      if (logsData?.logs) setRecentLogs(logsData.logs);
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fast real-time polling for active request routing animations (every 1.2s)
  useEffect(() => {
    let mounted = true;
    const fetchActive = async () => {
      try {
        const res = await apiRequest<{ activeUpstreamIds: string[] }>("/api/telemetry/active");
        if (mounted && Array.isArray(res?.activeUpstreamIds)) {
          setActiveUpstreamIds(res.activeUpstreamIds);
        }
      } catch {
        // ignore error
      }
    };

    fetchActive();
    const activeInterval = setInterval(fetchActive, 1200);
    return () => {
      mounted = false;
      clearInterval(activeInterval);
    };
  }, []);

  const copyBaseUrl = (url: string, type: "v1" | "root") => {
    navigator.clipboard.writeText(url);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Zoom helpers
  const handleZoomIn = () => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))));
  const handleResetView = () => {
    const defaultZoom = typeof window !== "undefined" && window.innerWidth < 640 ? 0.8 : 1;
    setZoom(defaultZoom);
    setPan({ x: 0, y: 0 });
  };

  // Mouse pan dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch drag & multi-touch pinch-to-zoom handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX - panRef.current.x,
        y: touch.clientY - panRef.current.y,
      };
      pinchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartZoomRef.current = zoomRef.current;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    } else if (e.touches.length === 2 && pinchStartDistRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (pinchStartDistRef.current > 0) {
        const factor = currentDist / pinchStartDistRef.current;
        const nextZoom = Math.min(1.8, Math.max(0.5, pinchStartZoomRef.current * factor));
        setZoom(Number(nextZoom.toFixed(2)));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      pinchStartDistRef.current = null;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      dragStartRef.current = {
        x: touch.clientX - panRef.current.x,
        y: touch.clientY - panRef.current.y,
      };
      setIsDragging(true);
      pinchStartDistRef.current = null;
    }
  };

  // Global window listeners when dragging so fast movements or edge crossing don't get interrupted
  useEffect(() => {
    if (!isDragging) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const onWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        setPan({
          x: touch.clientX - dragStartRef.current.x,
          y: touch.clientY - dragStartRef.current.y,
        });
      }
    };

    const onWindowRelease = () => {
      setIsDragging(false);
      pinchStartDistRef.current = null;
    };

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowRelease);
    window.addEventListener("touchmove", onWindowTouchMove, { passive: true });
    window.addEventListener("touchend", onWindowRelease);
    window.addEventListener("touchcancel", onWindowRelease);

    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowRelease);
      window.removeEventListener("touchmove", onWindowTouchMove);
      window.removeEventListener("touchend", onWindowRelease);
      window.removeEventListener("touchcancel", onWindowRelease);
    };
  }, [isDragging]);

  // Active connected upstreams for the router graph
  const activeUpstreams = useMemo(() => {
    return upstreams.filter((u) => u.isActive !== 0);
  }, [upstreams]);

  // Dynamic layout coordinates for provider nodes relative to center (0, 0)
  // Matching 9Router graph appearance:
  const providerPositions = useMemo(() => {
    if (activeUpstreams.length === 0) {
      return [];
    }

    const count = activeUpstreams.length;
    if (count === 1) {
      return [{ ...activeUpstreams[0], tag: getProviderTag(activeUpstreams[0].name), x: 0, y: -130, connected: true }];
    }
    if (count === 2) {
      return [
        { ...activeUpstreams[0], tag: getProviderTag(activeUpstreams[0].name), x: -175, y: -60, connected: true },
        { ...activeUpstreams[1], tag: getProviderTag(activeUpstreams[1].name), x: 175, y: -60, connected: true },
      ];
    }
    if (count === 3) {
      return [
        { ...activeUpstreams[0], tag: getProviderTag(activeUpstreams[0].name), x: 0, y: -130, connected: true },
        { ...activeUpstreams[1], tag: getProviderTag(activeUpstreams[1].name), x: -190, y: 55, connected: true },
        { ...activeUpstreams[2], tag: getProviderTag(activeUpstreams[2].name), x: 190, y: 65, connected: true },
      ];
    }

    // Circular/elliptical distribution for 4+ providers
    const radiusX = 220;
    const radiusY = 120;
    return activeUpstreams.map((item, idx) => {
      // Offset start angle so top node is centered
      const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
      return {
        ...item,
        tag: getProviderTag(item.name),
        x: Math.round(Math.cos(angle) * radiusX),
        y: Math.round(Math.sin(angle) * radiusY),
        connected: true,
      };
    });
  }, [activeUpstreams]);

  const originUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const openAiBaseUrl = `${originUrl}/v1`;
  const anthropicBaseUrl = originUrl;

  return (
    <div className="space-y-6">
      {/* 1. Base URL Bar with Instant 1-Click Copy */}
      <div className="skeuo-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-zinc-200/80 dark:border-zinc-800/80 bg-gradient-to-r from-zinc-50/90 via-zinc-100/50 to-zinc-50/90 dark:from-zinc-900/90 dark:via-[#131418] dark:to-zinc-900/90">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-500 shadow-sm">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Router Base URL
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-md sm:max-w-xl">
              {openAiBaseUrl}
            </div>
          </div>
        </div>

        {/* Copy Buttons for OpenAI and Anthropic */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => copyBaseUrl(openAiBaseUrl, "v1")}
            className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 text-zinc-800 dark:text-zinc-200 cursor-pointer shadow-sm hover:border-orange-500/40"
            title="Copy OpenAI Compatible Base URL"
          >
            {copiedType === "v1" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Copied OpenAI URL!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Base URL (<code className="font-mono text-[11px] text-orange-500">/v1</code>)</span>
              </>
            )}
          </button>

          <button
            onClick={() => copyBaseUrl(anthropicBaseUrl, "root")}
            className="skeuo-btn px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 text-zinc-800 dark:text-zinc-200 cursor-pointer shadow-sm hover:border-amber-500/40"
            title="Copy Anthropic Base URL"
          >
            {copiedType === "root" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Copied Anthropic URL!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Root URL (Anthropic)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Top Header & Metrics Banner (9Router Style) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Usage & Analytics
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Monitor your API usage, token consumption, and router topology
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {/* Time Filter Pills matching 9Router (Today, 24h, 7D, 30D) */}
            <div className="flex items-center p-0.5 rounded-md skeuo-inset text-xs">
              {(["Today", "24h", "7D", "30D"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`px-2.5 py-1 rounded transition-all font-medium ${
                    timeFilter === t
                      ? "skeuo-btn text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={loadAllData}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium skeuo-btn text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-500" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 5 Metrics Cards Grid (Exact 9Router Style) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* TOTAL REQUESTS */}
          <div className="skeuo-card p-3.5">
            <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Requests
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {stats ? stats.totalRequests.toLocaleString() : "0"}
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>{stats ? `${stats.successRequests} successful` : "0 successful"}</span>
            </div>
          </div>

          {/* TOTAL INPUT TOKENS */}
          <div className="skeuo-card p-3.5">
            <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Input Tokens
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {stats ? stats.totalPromptTokens.toLocaleString() : "0"}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Inbound prompt context
            </div>
          </div>

          {/* CACHED TOKENS */}
          <div className="skeuo-card p-3.5 border-emerald-500/20 bg-emerald-500/5">
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
              <span>Cached Tokens</span>
              <Sparkles className="w-3 h-3 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats ? (stats.totalCachedTokens || 0).toLocaleString() : "0"}
            </div>
            <div className="mt-1 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
              Zero-latency cache hit
            </div>
          </div>

          {/* OUTPUT TOKENS */}
          <div className="skeuo-card p-3.5">
            <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Output Tokens
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {stats ? stats.totalCompletionTokens.toLocaleString() : "0"}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Generated response
            </div>
          </div>

          {/* EST. COST */}
          <div className="skeuo-card p-3.5">
            <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Est. Cost
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              ~$0.00
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Estimated, not actual billing
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Router Visualization Canvas (9Router Topology & Recent Requests) */}
      <div className="rounded-xl border border-zinc-300/80 dark:border-zinc-800 bg-[#0c0d10] shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden relative">
        {/* Top Bar inside Visualization Box */}
        <div className="p-3.5 px-4 flex items-center justify-between border-b border-zinc-800/80 bg-[#111217]">
          {/* Subtab Switcher: Overview / Details */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#1a1b22] border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveSubtab("overview")}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                activeSubtab === "overview"
                  ? "bg-[#272832] text-zinc-100 font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveSubtab("details")}
              className={`px-3 py-1 rounded-md transition-all font-medium ${
                activeSubtab === "details"
                  ? "bg-[#272832] text-zinc-100 font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Details
            </button>
          </div>

          <div className="flex items-center space-x-3 text-xs text-zinc-400">
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  activeUpstreamIds.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
                }`}
              />
              <span className="text-[11px] font-mono text-zinc-300">
                {activeUpstreamIds.length > 0
                  ? `${activeUpstreamIds.length} Active Routing`
                  : `${activeUpstreams.length} Connected Nodes (Idle)`}
              </span>
            </div>
          </div>
        </div>

        {/* Main Canvas & Recent Requests Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px] relative">
          {/* Left / Center: Interactive Router Node Topology Canvas */}
          <div
            className="lg:col-span-8 relative min-h-[440px] flex items-center justify-center p-6 select-none overflow-hidden cursor-grab active:cursor-grabbing touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              touchAction: "none",
            }}
          >
            {/* Zoom Controls (Floating on bottom left, identical to 9Router screenshot) */}
            <div
              className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 flex flex-col space-y-1 bg-[#16171e]/90 backdrop-blur-md border border-zinc-800 rounded-md p-1 shadow-lg pointer-events-auto"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-2 sm:p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 rounded transition-colors"
                title="Zoom In"
              >
                <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-2 sm:p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 rounded transition-colors"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetView}
                className="p-2 sm:p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 rounded transition-colors"
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>

            {/* Transformable Canvas Stage: Origin (0,0) is anchored at exact 50% / 50% center of the canvas */}
            <div
              className={`absolute left-1/2 top-1/2 ${
                isDragging ? "transition-none" : "transition-transform duration-150 ease-out"
              }`}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
              }}
            >
              {/* Dynamic SVG Curves: connects center node (0,0) to active upstream nodes */}
              {providerPositions.length > 0 && (
                <svg className="absolute left-0 top-0 overflow-visible pointer-events-none z-0">
                  <defs>
                    <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>

                  {providerPositions.map((node) => {
                    // Strictly only connect to the node if a request is actively routing through it
                    const isNodeActive = activeUpstreamIds.includes(node.id);
                    if (!isNodeActive) return null;

                    const startX = 0;
                    const startY = 0;
                    const targetX = node.x;
                    const targetY = node.y;

                    const midY = (startY + targetY) / 2;
                    const d = `M ${startX} ${startY} C ${startX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;

                    return (
                      <g key={node.id}>
                        <path
                          d={d}
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="2"
                          strokeOpacity="0.35"
                        />
                        <path
                          d={d}
                          fill="none"
                          stroke="url(#curveGradient)"
                          strokeWidth="2.5"
                          className="router-flow-active"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Center Core Node: NekoRouter (Placed dead center at 0,0) */}
              <div
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: "0px", top: "0px" }}
              >
                <div
                  className={`px-4 py-2 rounded-lg bg-[#171821] border transition-all ${
                    activeUpstreamIds.length > 0
                      ? "border-orange-500/80 shadow-[0_0_24px_rgba(249,115,22,0.4)]"
                      : "border-zinc-800 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                  } flex items-center space-x-2.5 hover:scale-105`}
                >
                  <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white font-black text-xs shadow-inner">
                    <Cat className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-xs text-white tracking-wide">
                      NekoRouter
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full inline-block transition-colors ${
                        activeUpstreamIds.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Clean message when no providers are configured */}
              {activeUpstreams.length === 0 && (
                <div
                  className="absolute z-10 -translate-x-1/2 text-center pointer-events-none"
                  style={{ left: "0px", top: "45px" }}
                >
                  <span className="text-[11px] text-zinc-500 font-mono whitespace-nowrap">
                    No upstream providers connected yet
                  </span>
                </div>
              )}

              {/* Surrounding Connected Upstream Nodes (Symmetrically placed around 0,0) */}
              {providerPositions.map((node) => {
                const isNodeActive = activeUpstreamIds.includes(node.id);
                return (
                  <div
                    key={node.id}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-105"
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                    }}
                  >
                    <div
                      className={`px-3.5 py-2 rounded-lg bg-[#14151c] transition-all flex items-center space-x-2.5 ${
                        isNodeActive
                          ? "border border-orange-500/80 shadow-[0_0_18px_rgba(249,115,22,0.4)] ring-1 ring-orange-500/30"
                          : "border border-zinc-800 hover:border-zinc-700 shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                        {node.tag}
                      </span>
                      <span className="text-xs font-medium text-zinc-200 whitespace-nowrap">
                        {node.name}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full inline-block transition-colors ${
                          isNodeActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          {/* Right: RECENT REQUESTS Panel (Exact 9Router Style) */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-zinc-800/80 bg-[#0f1015] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                Recent Requests
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {recentLogs.length} logged
              </span>
            </div>

            {/* Table Header: Model | In / Out | When */}
            <div className="grid grid-cols-12 text-[11px] text-zinc-500 font-medium px-2 py-1.5 border-b border-zinc-800/80">
              <span className="col-span-5">Model</span>
              <span className="col-span-4 text-right">In / Out</span>
              <span className="col-span-3 text-right">When</span>
            </div>

            {/* Request Rows */}
            <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-1 max-h-[360px]">
              {recentLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  <Clock className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
                  <span>No recent requests logged yet</span>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    Requests sent through your client key will appear here live.
                  </p>
                </div>
              ) : (
                recentLogs.map((log) => {
                  const isOk = log.statusCode >= 200 && log.statusCode < 300;
                  return (
                    <div
                      key={log.id}
                      className="grid grid-cols-12 items-center px-2 py-2 rounded text-xs hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Model with status dot */}
                      <div className="col-span-5 flex items-center space-x-1.5 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isOk ? "bg-emerald-400" : "bg-rose-500"
                          }`}
                        />
                        <span className="font-mono text-[11px] text-zinc-300 truncate" title={log.model}>
                          {log.model}
                        </span>
                      </div>

                      {/* Tokens: In / Out */}
                      <div className="col-span-4 text-right font-mono text-[11px]">
                        <span className="text-zinc-300">
                          {log.promptTokens.toLocaleString()}
                        </span>
                        <span className="text-emerald-500 mx-0.5">↑</span>
                        <span className="text-zinc-400">
                          {log.completionTokens.toLocaleString()}
                        </span>
                        <span className="text-blue-400 ml-0.5">↓</span>
                      </div>

                      {/* When */}
                      <div className="col-span-3 text-right text-[11px] text-zinc-500 truncate">
                        {formatTimeAgo(log.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Metric Filter Toggles (Tokens / Cost) */}
        <div className="p-3 px-4 border-t border-zinc-800/80 bg-[#111217] flex items-center justify-between">
          <div className="flex items-center space-x-1 p-0.5 rounded-md bg-[#1a1b22] border border-zinc-800 text-xs">
            <button
              onClick={() => setGraphMetricView("tokens")}
              className={`px-3 py-1 rounded transition-all font-medium ${
                graphMetricView === "tokens"
                  ? "bg-orange-500 text-white font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Tokens
            </button>
            <button
              onClick={() => setGraphMetricView("cost")}
              className={`px-3 py-1 rounded transition-all font-medium ${
                graphMetricView === "cost"
                  ? "bg-orange-500 text-white font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Cost
            </button>
          </div>

          <div className="text-[11px] text-zinc-500 hidden sm:block">
            Real-time topology passthrough with zero buffering
          </div>
          <div className="text-[10px] text-zinc-500 sm:hidden">
            Drag to pan canvas • Pinch to zoom
          </div>
        </div>
      </div>

      {/* 4. Model Breakdown Section */}
      {stats && stats.modelStats && stats.modelStats.length > 0 && (
        <div className="skeuo-card p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-zinc-500" />
            <span>Active Model Distribution (24h)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stats.modelStats.map((m, idx) => (
              <div key={idx} className="skeuo-card-subtle p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {m.model}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                    {m.provider}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{m.requests} requests</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-200 font-mono">
                    {m.tokens.toLocaleString()} tokens
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
