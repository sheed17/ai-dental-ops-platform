"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, Bot, Building2, ChartNoAxesCombined, GitBranch, LayoutDashboard, MessageSquare, Phone, Repeat, Settings, ShieldAlert, Sparkles, Workflow, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/callbacks", label: "Callbacks", icon: Repeat },
  { href: "/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/automation", label: "Automation", icon: Bot },
  { href: "/setup", label: "Setup", icon: Wrench },
  { href: "/routing-rules", label: "Routing Rules", icon: GitBranch },
  { href: "/integrations", label: "Integrations", icon: Sparkles },
  { href: "/practices", label: "Practices", icon: Building2 },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const practices = useQuery({ queryKey: ["practices"], queryFn: api.practices });
  const practiceOptions = practices.data || [];
  const activePracticeName = practiceOptions[0]?.name || "Practice";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-white lg:block">
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Dental Ops</div>
                <div className="text-xs text-slate-500">AI Receptionist Platform</div>
              </div>
            </div>

            <nav className="mt-8 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                <select
                  value={activePracticeName}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900"
                  disabled
                >
                  {practiceOptions.length ? (
                    practiceOptions.map((practice) => (
                      <option key={practice.id} value={practice.name}>
                        {practice.name}
                      </option>
                    ))
                  ) : (
                    <option>Loading practice...</option>
                  )}
                </select>
                <div className="w-full max-w-xl">
                  <Input placeholder="Search calls, callbacks, incidents, messages..." />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600">
                  <Bell className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">SJ</div>
                  <div>
                    <div className="text-sm font-medium">Sammy</div>
                    <div className="text-xs text-slate-500">Operations</div>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <main className="px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
