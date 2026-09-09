import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { SetupScreen } from "./components/SetupScreen";
import { LoginScreen } from "./components/LoginScreen";
import { DashboardTab } from "./components/DashboardTab";
import { ClientKeysTab } from "./components/ClientKeysTab";
import { UpstreamKeysTab } from "./components/UpstreamKeysTab";
import { TelemetryTab } from "./components/TelemetryTab";
import { DatabaseSettingsTab } from "./components/DatabaseSettingsTab";
import { useTheme } from "./hooks/useTheme";
import { apiRequest, type AuthStatus } from "./lib/api";
import { Loader2 } from "lucide-react";

export const TAB_ROUTES: Record<string, string> = {
  dashboard: "/",
  "client-keys": "/keys",
  "upstream-keys": "/providers",
  telemetry: "/telemetry",
  database: "/settings",
};

export const ROUTE_TO_TAB: Record<string, string> = {
  "/": "dashboard",
  "/overview": "dashboard",
  "/dashboard": "dashboard",
  "/keys": "client-keys",
  "/client-keys": "client-keys",
  "/endpoint-keys": "client-keys",
  "/providers": "upstream-keys",
  "/upstream-keys": "upstream-keys",
  "/upstreams": "upstream-keys",
  "/telemetry": "telemetry",
  "/logs": "telemetry",
  "/settings": "database",
  "/database": "database",
};

export function getTabFromLocation(): string {
  if (typeof window === "undefined") return "dashboard";

  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (ROUTE_TO_TAB[pathname]) {
    return ROUTE_TO_TAB[pathname];
  }

  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, "");
  if (hash && ROUTE_TO_TAB[`/${hash}`]) {
    return ROUTE_TO_TAB[`/${hash}`];
  }
  if (hash && ["dashboard", "client-keys", "upstream-keys", "telemetry", "database"].includes(hash)) {
    return hash;
  }

  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  if (tabParam && ROUTE_TO_TAB[`/${tabParam}`]) {
    return ROUTE_TO_TAB[`/${tabParam}`];
  }
  if (tabParam && ["dashboard", "client-keys", "upstream-keys", "telemetry", "database"].includes(tabParam)) {
    return tabParam;
  }

  const saved = localStorage.getItem("neko_active_tab");
  if (saved && ["dashboard", "client-keys", "upstream-keys", "telemetry", "database"].includes(saved)) {
    return saved;
  }

  return "dashboard";
}

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTabState] = useState<string>(getTabFromLocation);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleTabChange = (tabId: string) => {
    setActiveTabState(tabId);
    try {
      localStorage.setItem("neko_active_tab", tabId);
      const targetPath = TAB_ROUTES[tabId] || "/";
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab: tabId }, "", targetPath);
      }
    } catch (e) {
      // ignore
    }
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromLocation();
      setActiveTabState(tab);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync initial URL if loaded on root but with saved tab or hash
  useEffect(() => {
    try {
      const targetPath = TAB_ROUTES[activeTab] || "/";
      if (window.location.pathname === "/" && targetPath !== "/") {
        window.history.replaceState({ tab: activeTab }, "", targetPath);
      }
    } catch (e) {
      // ignore
    }
  }, [activeTab]);

  const checkAuth = async () => {
    try {
      const status = await apiRequest<AuthStatus>("/api/auth/status");
      setAuthStatus(status);
    } catch (e) {
      console.error("Auth check failed:", e);
      setAuthStatus({ isDefaultPin: true, authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // ignore
    }
    setAuthStatus((prev) => (prev ? { ...prev, authenticated: false } : null));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // 1. Forced First Setup if default PIN '123456' is still active
  if (authStatus?.isDefaultPin) {
    return (
      <SetupScreen
        onSetupSuccess={() => {
          checkAuth();
        }}
      />
    );
  }

  // 2. Login Screen if not authenticated
  if (!authStatus?.authenticated) {
    return (
      <LoginScreen
        turnstileSiteKey={authStatus?.turnstileSiteKey}
        turnstileEnabled={authStatus?.turnstileEnabled}
        onLoginSuccess={() => {
          checkAuth();
        }}
      />
    );
  }

  // 3. Main Router Dashboard with modern Sidebar layout
  return (
    <div className="h-screen flex bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:pl-68 h-screen">
        <Topbar
          activeTab={activeTab}
          onOpenSidebar={() => setSidebarOpen(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "client-keys" && <ClientKeysTab />}
          {activeTab === "upstream-keys" && <UpstreamKeysTab />}
          {activeTab === "telemetry" && <TelemetryTab />}
          {activeTab === "database" && <DatabaseSettingsTab />}
        </main>

        {/* Footer — sits at viewport bottom, perfectly aligned with sidebar bottom */}
        <footer className="h-12 shrink-0 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-[#fafafa] dark:bg-[#09090b] px-6 flex items-center text-xs text-zinc-500 dark:text-zinc-400 z-10">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Neko-Router &copy; {new Date().getFullYear()} — Ultra-Low Latency AI Gateway</span>
            <span className="font-mono text-[11px]">Bun + ElysiaJS + SQLite WAL</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
