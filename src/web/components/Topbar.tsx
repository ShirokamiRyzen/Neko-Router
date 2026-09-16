import React from "react";
import { Menu, BookOpen, Sun, Moon } from "lucide-react";

interface TopbarProps {
  activeTab: string;
  onOpenSidebar: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const titles: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: "System Overview",
    subtitle: "Real-time traffic telemetry and proxy status",
  },
  "client-keys": {
    title: "Client Access Keys",
    subtitle: "Manage API keys for downstream applications",
  },
  "upstream-keys": {
    title: "Upstream Router Keys",
    subtitle: "Configure and balance OpenAI & Anthropic providers",
  },
  telemetry: {
    title: "Request Telemetry & Logs",
    subtitle: "Live token metrics and upstream latency inspection",
  },
  database: {
    title: "Database & System Settings",
    subtitle: "SQLite persistence, WAL snapshots, and security credentials",
  },
};

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  onOpenSidebar,
  theme,
  toggleTheme,
}) => {
  const current = titles[activeTab] || {
    title: "Gateway Dashboard",
    subtitle: "Neko-Router Control Panel",
  };

  return (
    <header className="sticky top-0 z-30 w-full h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#111216]/90 backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.05)] flex items-center shrink-0">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Mobile menu toggle + Page title */}
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {current.title}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
              {current.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center space-x-2.5">

          {/* Swagger Link */}
          <a
            href="/swagger"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 skeuo-btn"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>OpenAPI Docs</span>
          </a>

          {/* Theme quick toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md skeuo-btn text-zinc-600 dark:text-zinc-300"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
