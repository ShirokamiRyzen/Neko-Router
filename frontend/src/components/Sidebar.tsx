import React from "react";
import {
  Cat,
  LogOut,
  BookOpen,
  KeyRound,
  Layers,
  Activity,
  Database,
  BarChart3,
  X,
} from "lucide-react";
import { TAB_ROUTES } from "../App";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  isOpen,
  onClose,
}) => {
  const navigation = [
    {
      group: "GATEWAY ROUTING",
      items: [
        {
          id: "dashboard",
          label: "Overview & Metrics",
          icon: BarChart3,
          description: "Traffic, tokens & latency",
        },
        {
          id: "client-keys",
          label: "Endpoint & Keys",
          icon: KeyRound,
          description: "API keys & AI secret keys",
        },
        {
          id: "upstream-keys",
          label: "Upstream Providers",
          icon: Layers,
          description: "OpenAI & Anthropic keys",
        },
      ],
    },
    {
      group: "MONITORING & STORAGE",
      items: [
        {
          id: "telemetry",
          label: "Live Telemetry Logs",
          icon: Activity,
          description: "Real-time token requests",
        },
        {
          id: "database",
          label: "Database & Settings",
          icon: Database,
          description: "SQLite WAL backup & PIN",
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-68 bg-[#f8f9fa] dark:bg-[#111216] border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.5)] text-white">
                <Cat className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                    Neko<span className="text-zinc-400 dark:text-zinc-500 font-normal">Router</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">
                    ONLINE · v1.0
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigation.map((section) => (
            <div key={section.group} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                {section.group}
              </div>
              <div className="space-y-1 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const href = TAB_ROUTES[item.id] || "/";
                  return (
                    <a
                      key={item.id}
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-all duration-120 group cursor-pointer ${isActive
                          ? "bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-100 font-medium border border-zinc-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.4)]"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40"
                        }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${isActive
                            ? "text-zinc-100"
                            : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                          }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{item.label}</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Docs Link */}
          <div className="pt-2">
            <div className="px-3 text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-2">
              DOCUMENTATION
            </div>
            <a
              href="/swagger"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-xs transition-colors"
            >
              <BookOpen className="w-4 h-4 text-zinc-400" />
              <span>Swagger API Docs</span>
            </a>
          </div>
        </div>

        {/* Footer Controls (Logout only) */}
        <div className="h-12 px-4 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
