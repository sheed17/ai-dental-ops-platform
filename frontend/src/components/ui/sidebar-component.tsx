"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  ChevronDown,
  FileText,
  GitBranch,
  LayoutDashboard,
  Phone,
  PhoneCall,
  Repeat,
  Settings2,
  TriangleAlert,
  Workflow,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  count?: string;
  tone?: "red" | "blue" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Today's ops",
    items: [
      { href: "/", label: "Morning briefing", count: "3", tone: "red", icon: LayoutDashboard },
      { href: "/callbacks", label: "Callback queue", count: "11", tone: "red", icon: PhoneCall },
      { href: "/callbacks?view=feed", label: "Operations feed", count: "27", tone: "neutral", icon: Activity },
    ],
  },
  {
    title: "Incidents",
    items: [
      { href: "/callbacks?view=incidents", label: "Open incidents", count: "2", tone: "red", icon: TriangleAlert },
      { href: "/callbacks?view=resolved", label: "Resolved", count: "8", tone: "neutral", icon: Bell },
    ],
  },
  {
    title: "Calls",
    items: [
      { href: "/callbacks?view=logs", label: "Call logs", count: "42", tone: "blue", icon: Phone },
      { href: "/callbacks?view=repeat", label: "Repeat callers", count: "4", tone: "red", icon: Repeat },
      { href: "/callbacks?view=analytics", label: "Analytics", icon: FileText },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/integrations", label: "Routing rules", icon: GitBranch },
      { href: "/integrations", label: "Integrations", icon: Workflow },
      { href: "/onboarding", label: "Practice setup", icon: Settings2 },
    ],
  },
];

function badgeClasses(tone: NavItem["tone"]) {
  if (tone === "red") {
    return "bg-[var(--red-bg)] text-[var(--red)]";
  }
  if (tone === "blue") {
    return "bg-[var(--blue-bg)] text-[var(--blue)]";
  }
  return "border border-[var(--border)] bg-transparent text-[var(--text-tertiary)]";
}

function ToothMark() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--text-primary)] text-white">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8.5 3.5C6.1 3.5 4 5.4 4 7.9c0 2.6 1.1 4.1 2.2 5.6.9 1.2 1.6 2.7 2 5 .1.7.7 1.2 1.4 1.2.6 0 1.2-.4 1.3-1l.8-3.5c.1-.3.3-.4.6-.4s.5.1.6.4l.8 3.5c.1.6.7 1 1.3 1 .7 0 1.3-.5 1.4-1.2.4-2.3 1.1-3.8 2-5 1.1-1.5 2.2-3 2.2-5.6C20 5.4 17.9 3.5 15.5 3.5c-1.4 0-2.4.4-3.5 1.1-1.1-.7-2.1-1.1-3.5-1.1Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export default function SidebarComponent() {
  const pathname = usePathname();

  return (
    <aside className="sidebar-shell">
      <div className="border-b border-[var(--border)] px-4 pb-4 pt-4">
        <div className="flex items-center gap-3">
          <ToothMark />
          <div>
            <div className="text-[14px] font-semibold leading-none text-[var(--text-primary)]">Dental Ops</div>
            <div className="mt-1 text-[10px] text-[var(--text-tertiary)]">After-Hours Command Center</div>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-left transition-colors hover:border-[var(--border-med)] hover:bg-[#eceae6]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-medium text-[var(--text-primary)]">Bright Smiles Dental</div>
              <div className="mt-1 text-[10px] text-[var(--text-tertiary)]">3 practices connected</div>
            </div>
            <ChevronDown className="mt-0.5 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          </div>
        </button>
      </div>

      <div className="sidebar-scroll flex-1 px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-5">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === "/callbacks"
                      ? item.label === "Callback queue"
                      : pathname.startsWith(item.href.split("?")[0]);
                const Icon = item.icon;
                return (
                  <Link
                    key={`${group.title}-${item.label}`}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-[8px] px-[8px] py-[7px] text-[12px] transition-colors ${
                      active
                        ? "bg-[var(--text-primary)] text-white"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface2)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon className="h-[14px] w-[14px] shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.count ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          active && item.tone !== "neutral" ? "bg-white/18 text-white" : badgeClasses(item.tone)
                        }`}
                      >
                        {item.count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] px-4 py-4">
        <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-secondary)]">
          <span className="pulse-dot" />
          <span>Live — voice active</span>
        </div>
        <div className="mono mt-2 text-[10.5px] text-[var(--text-tertiary)]">+1 (228) 283 2484</div>
      </div>
    </aside>
  );
}
