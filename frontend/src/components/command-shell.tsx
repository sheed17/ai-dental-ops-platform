"use client";

import Link from "next/link";

import { Activity, Calendar, ChevronDown, Clock3, Phone, RefreshCcw, Settings2, ShieldAlert, Workflow } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  count?: string;
  tone?: "red" | "blue" | "gray";
};

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Today's ops",
    items: [
      { label: "Morning briefing", href: "/callbacks?view=briefing", count: "3", tone: "red" },
      { label: "Callback queue", href: "/callbacks", count: "11", tone: "red" },
      { label: "Operations feed", href: "/callbacks?view=feed", count: "27", tone: "gray" },
    ],
  },
  {
    title: "Incidents",
    items: [
      { label: "Open incidents", href: "/callbacks?filter=incident", count: "2", tone: "red" },
      { label: "Resolved", href: "/callbacks?filter=done", count: "8", tone: "gray" },
    ],
  },
  {
    title: "Calls",
    items: [
      { label: "Call logs", href: "/callbacks", count: "42", tone: "blue" },
      { label: "Repeat callers", href: "/callbacks?repeat=1", count: "4", tone: "red" },
      { label: "Analytics", href: "/settings" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Routing rules", href: "/integrations" },
      { label: "Integrations", href: "/integrations" },
      { label: "Practice setup", href: "/onboarding" },
    ],
  },
];

function iconFor(label: string) {
  if (label.includes("briefing")) return Calendar;
  if (label.includes("Callback")) return Clock3;
  if (label.includes("Operations")) return Activity;
  if (label.includes("incidents")) return ShieldAlert;
  if (label.includes("Call")) return Phone;
  if (label.includes("Routing")) return Workflow;
  if (label.includes("Integrations")) return Activity;
  return Settings2;
}

function badgeClass(tone?: "red" | "blue" | "gray") {
  if (tone === "red") return "bg-[var(--red-bg)] text-[var(--red)]";
  if (tone === "blue") return "bg-[var(--blue-bg)] text-[var(--blue)]";
  return "border border-[var(--border)] bg-[var(--surface2)] text-[var(--text-secondary)]";
}

export function CommandShell({
  title,
  activeHref,
  actions,
  subheader,
  contentClassName,
  children,
}: {
  title: string;
  activeHref: string;
  actions?: React.ReactNode;
  subheader?: React.ReactNode;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <nav className="flex w-[var(--sidebar-w)] min-w-[var(--sidebar-w)] flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 pb-[14px] pt-[18px]">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-white text-black">
              <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current">
                <path d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7S11.87 1 8 1zm0 2a2 2 0 110 4 2 2 0 010-4zm0 10c-1.93 0-3.64-.98-4.65-2.47C4.37 9.36 6.08 8.5 8 8.5s3.63.86 4.65 2.03C11.64 12.02 9.93 13 8 13z" />
              </svg>
            </div>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.3px]">Dental Ops</div>
              <div className="mt-px text-[10px] text-[var(--text-tertiary)]">After-Hours Command Center</div>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-[8px] border border-[var(--border)] bg-[var(--surface2)] px-[10px] py-2 text-left transition-colors hover:bg-[var(--surface3)]"
          >
            <div>
              <div className="text-[12px] font-medium">Bright Smiles Dental</div>
              <div className="mt-px text-[10px] text-[var(--text-tertiary)]">3 practices connected</div>
            </div>
            <ChevronDown className="h-[11px] w-[11px] text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 [scrollbar-width:thin]">
          {navGroups.map((group) => (
            <div key={group.title} className="px-0 pb-1">
              <div className="px-2 pb-[5px] pt-[10px] text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--text-tertiary)]">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = iconFor(item.label);
                const active = activeHref === item.href || (item.href === "/integrations" && activeHref.startsWith("/integrations")) || (item.href === "/onboarding" && activeHref.startsWith("/onboarding")) || (item.href === "/settings" && activeHref.startsWith("/settings"));
                return (
                  <Link
                    key={`${group.title}-${item.label}`}
                    href={item.href}
                    className={`relative flex items-center gap-[9px] rounded-[8px] px-2 py-[7px] text-left text-[12.5px] transition-colors ${
                      active
                        ? "bg-white text-black"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface2)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon className="h-[14px] w-[14px] shrink-0 opacity-50" />
                    <span>{item.label}</span>
                    {item.count ? (
                      <span className={`ml-auto rounded-[20px] px-[6px] py-[1px] text-[10.5px] font-semibold ${active ? "bg-black/10 text-black" : badgeClass(item.tone)}`}>
                        {item.count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-[6px] text-[11.5px] text-[var(--text-secondary)]">
            <span className="h-[7px] w-[7px] rounded-full bg-[#27ae60]" style={{ animation: "pulse-ring 2s infinite" }} />
            <span>Live — voice active</span>
          </div>
          <div className="mono mt-[3px] text-[10px] text-[var(--text-tertiary)]">+1 (228) 283 2484</div>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-[14px]">
          <div className="flex items-center justify-between">
            <div className="text-[17px] font-semibold tracking-[-0.4px]">{title}</div>
            <div className="flex gap-[6px]">
              {actions || (
                <button type="button" className="ops-button">
                  <RefreshCcw className="h-[11px] w-[11px]" />
                  Refresh
                </button>
              )}
            </div>
          </div>
        </div>

        {subheader}

        <div className={`flex-1 overflow-y-auto bg-[var(--bg)] ${contentClassName || "p-5"}`}>{children}</div>
      </div>
    </div>
  );
}
