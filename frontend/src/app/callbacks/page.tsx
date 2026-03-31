"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  ChevronDown,
  Clock3,
  Download,
  Phone,
  RefreshCcw,
  Settings2,
  ShieldAlert,
  Workflow,
} from "lucide-react";

type CallbackStatus = "overdue" | "pending" | "open" | "done" | "incident";
type Priority = "high" | "medium" | "low";
type ViewKey = "queue" | "briefing" | "feed";
type SortColumn = "age" | "priority" | "caller" | "status";
type FilterKey = "all" | CallbackStatus;

type CallbackRecord = {
  id: string;
  caller: string;
  phone: string;
  repeat: number;
  practice: string;
  reason: string;
  status: CallbackStatus;
  priority: Priority;
  ageMin: number;
};

type FeedItem = {
  id: string;
  time: string;
  type: "call" | "alert" | "sms" | "system" | "incident";
  icon: string;
  title: string;
  description: string;
};

type NavItem = {
  key: string;
  label: string;
  count?: string;
  tone?: "red" | "blue" | "gray";
  icon: typeof Calendar;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const initialCallbacks: CallbackRecord[] = [
  { id: "1", caller: "Maria Gonzalez", phone: "+1 (209) 814 3953", repeat: 3, practice: "Bright Smiles – Main", reason: "Tooth pain, urgent", status: "overdue", priority: "high", ageMin: 192 },
  { id: "2", caller: "James Thornton", phone: "+1 (209) 637 9224", repeat: 0, practice: "Bright Smiles – North", reason: "New patient inquiry", status: "overdue", priority: "medium", ageMin: 164 },
  { id: "3", caller: "Sandra Kim", phone: "+1 (209) 551 0012", repeat: 0, practice: "Downtown Dental", reason: "Appointment reschedule", status: "pending", priority: "medium", ageMin: 78 },
  { id: "4", caller: "Robert Patel", phone: "+1 (209) 814 3951", repeat: 2, practice: "Bright Smiles – Main", reason: "Insurance question", status: "open", priority: "low", ageMin: 58 },
  { id: "5", caller: "Lisa Hoffman", phone: "+1 (415) 209 7741", repeat: 0, practice: "Downtown Dental", reason: "Billing dispute", status: "incident", priority: "high", ageMin: 243 },
  { id: "6", caller: "Tom Nguyen", phone: "+1 (209) 403 8812", repeat: 0, practice: "Bright Smiles – North", reason: "Follow-up after extraction", status: "pending", priority: "medium", ageMin: 44 },
  { id: "7", caller: "Amy Chen", phone: "+1 (209) 814 0049", repeat: 0, practice: "Bright Smiles – Main", reason: "Crown replacement", status: "pending", priority: "low", ageMin: 31 },
  { id: "8", caller: "David Park", phone: "+1 (209) 555 0192", repeat: 0, practice: "Downtown Dental", reason: "Cleaning appointment", status: "done", priority: "low", ageMin: 320 },
  { id: "9", caller: "Rachel Moore", phone: "+1 (209) 555 0847", repeat: 0, practice: "Bright Smiles – Main", reason: "Pain after procedure", status: "done", priority: "high", ageMin: 280 },
  { id: "10", caller: "Kevin Torres", phone: "+1 (209) 555 0331", repeat: 0, practice: "Bright Smiles – North", reason: "Cancel appointment", status: "done", priority: "low", ageMin: 210 },
  { id: "11", caller: "Nancy Wright", phone: "+1 (209) 555 0563", repeat: 1, practice: "Downtown Dental", reason: "Prescription refill", status: "open", priority: "medium", ageMin: 95 },
];

const feedItems: FeedItem[] = [
  { id: "1", time: "8:42 AM", type: "call", icon: "📞", title: "Inbound call — Maria Gonzalez", description: "Call lasted 1m 12s. Left message: tooth pain, requesting urgent callback. Repeat caller flag triggered." },
  { id: "2", time: "8:38 AM", type: "alert", icon: "🔔", title: "Overdue callback alert sent", description: "Staff alert emailed to Bright Smiles – Main front desk. 3 callbacks flagged as overdue." },
  { id: "3", time: "8:15 AM", type: "sms", icon: "💬", title: "SMS follow-up sent — 4 repeat callers", description: "Automated morning recovery messages delivered. 4/4 confirmed delivered." },
  { id: "4", time: "8:00 AM", type: "system", icon: "⚙️", title: "Morning workflow triggered", description: "27 calls processed from last night. 11 callback tasks created. 2 incidents escalated." },
  { id: "5", time: "7:44 AM", type: "call", icon: "📞", title: "Inbound call — Nancy Wright", description: "Call lasted 58s. Insurance prescription question. Task created and assigned." },
  { id: "6", time: "3:12 AM", type: "incident", icon: "🚨", title: "Incident opened — Lisa Hoffman", description: "Billing dispute escalated to incident after second callback attempt failed. Awaiting manager review." },
  { id: "7", time: "11:58 PM", type: "call", icon: "📞", title: "Inbound call — Lisa Hoffman", description: "Call lasted 2m 04s. Caller expressed frustration over bill. Incident workflow initiated." },
  { id: "8", time: "11:42 PM", type: "call", icon: "📞", title: "Inbound call — Robert Patel", description: "Repeat caller ×2. Insurance coverage question. Callback task created." },
];

const navGroups: NavGroup[] = [
  {
    title: "Today's ops",
    items: [
      { key: "briefing", label: "Morning briefing", count: "3", tone: "red" as const, icon: Calendar },
      { key: "queue", label: "Callback queue", count: "11", tone: "red" as const, icon: Clock3 },
      { key: "feed", label: "Operations feed", count: "27", tone: "gray" as const, icon: Activity },
    ],
  },
  {
    title: "Incidents",
    items: [
      { key: "incident", label: "Open incidents", count: "2", tone: "red" as const, icon: ShieldAlert },
      { key: "resolved", label: "Resolved", count: "8", tone: "gray" as const, icon: Activity },
    ],
  },
  {
    title: "Calls",
    items: [
      { key: "logs", label: "Call logs", count: "42", tone: "blue" as const, icon: Phone },
      { key: "repeat", label: "Repeat callers", count: "4", tone: "red" as const, icon: RefreshCcw },
      { key: "analytics", label: "Analytics", icon: Activity },
    ],
  },
  {
    title: "Configuration",
    items: [
      { key: "routing", label: "Routing rules", icon: Workflow },
      { key: "integrations", label: "Integrations", icon: Activity },
      { key: "practice", label: "Practice setup", icon: Settings2 },
    ],
  },
] as const;

const filterPills: { key: string; label: string; icon?: typeof Clock3 }[] = [
  { key: "last24h", label: "Last 24h", icon: Clock3 },
  { key: "practice", label: "Practice" },
  { key: "priority", label: "Priority" },
  { key: "assigned", label: "Assigned to" },
  { key: "reason", label: "Call reason" },
  { key: "repeat", label: "Repeat caller only" },
];

function formatAge(minutes: number) {
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function priorityOrder(priority: Priority) {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}

function priorityLabel(priority: Priority) {
  return priority === "medium" ? "Med" : priority === "high" ? "High" : "Low";
}

function statusLabel(status: CallbackStatus) {
  if (status === "open") return "In progress";
  if (status === "done") return "Done";
  if (status === "incident") return "Incident";
  if (status === "overdue") return "Overdue";
  return "Pending";
}

function statusTone(status: CallbackStatus) {
  if (status === "overdue") return "var(--red-bg)";
  if (status === "pending") return "var(--amber-bg)";
  if (status === "open") return "var(--blue-bg)";
  if (status === "done") return "var(--green-bg)";
  return "var(--pink-bg)";
}

function statusColor(status: CallbackStatus) {
  if (status === "overdue") return "var(--red)";
  if (status === "pending") return "var(--amber)";
  if (status === "open") return "var(--blue)";
  if (status === "done") return "var(--green)";
  return "var(--pink)";
}

function priorityDot(priority: Priority) {
  if (priority === "high") return "var(--red-mid)";
  if (priority === "medium") return "var(--amber-mid)";
  return "var(--green-mid)";
}

function feedBg(type: FeedItem["type"]) {
  if (type === "call") return "var(--blue-bg)";
  if (type === "alert") return "var(--amber-bg)";
  if (type === "sms") return "var(--green-bg)";
  if (type === "incident") return "var(--red-bg)";
  return "var(--surface2)";
}

function badgeClass(tone?: "red" | "blue" | "gray") {
  if (tone === "red") return "bg-[var(--red-bg)] text-[var(--red)]";
  if (tone === "blue") return "bg-[var(--blue-bg)] text-[var(--blue)]";
  return "border border-[var(--border)] bg-[var(--surface2)] text-[var(--text-secondary)]";
}

export default function CallbackQueuePage() {
  const [callbacks, setCallbacks] = useState(initialCallbacks);
  const [currentView, setCurrentView] = useState<ViewKey>("queue");
  const [currentFilter, setCurrentFilter] = useState<FilterKey>("all");
  const [currentSort, setCurrentSort] = useState<{ col: SortColumn; dir: "asc" | "desc" }>({ col: "age", dir: "desc" });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [activeFilterPills, setActiveFilterPills] = useState<string[]>(["last24h"]);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: callbacks.length,
      overdue: callbacks.filter((r) => r.status === "overdue").length,
      pending: callbacks.filter((r) => r.status === "pending").length,
      open: callbacks.filter((r) => r.status === "open").length,
      done: callbacks.filter((r) => r.status === "done").length,
      incident: callbacks.filter((r) => r.status === "incident").length,
    }),
    [callbacks],
  );

  const filteredCallbacks = useMemo(() => {
    const filtered = currentFilter === "all" ? [...callbacks] : callbacks.filter((r) => r.status === currentFilter);
    filtered.sort((a, b) => {
      let result = 0;
      if (currentSort.col === "age") result = a.ageMin - b.ageMin;
      if (currentSort.col === "priority") result = priorityOrder(a.priority) - priorityOrder(b.priority);
      if (currentSort.col === "caller") result = a.caller.localeCompare(b.caller);
      if (currentSort.col === "status") result = a.status.localeCompare(b.status);
      return currentSort.dir === "asc" ? result : -result;
    });
    return filtered;
  }, [callbacks, currentFilter, currentSort]);

  const metrics = useMemo(() => {
    const avg = Math.round(callbacks.reduce((sum, row) => sum + row.ageMin, 0) / callbacks.length);
    return {
      due: callbacks.filter((row) => row.status !== "done").length,
      avg,
      resolved: callbacks.filter((row) => row.status === "done").length,
    };
  }, [callbacks]);

  const allSelected = filteredCallbacks.length > 0 && filteredCallbacks.every((row) => selectedRows.has(row.id));

  const setView = (view: ViewKey) => setCurrentView(view);

  const sortTable = (column: SortColumn) => {
    setCurrentSort((current) =>
      current.col === column
        ? { col: column, dir: current.dir === "asc" ? "desc" : "asc" }
        : { col: column, dir: "asc" },
    );
  };

  const toggleAll = () => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (allSelected) {
        filteredCallbacks.forEach((row) => next.delete(row.id));
      } else {
        filteredCallbacks.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleResolve = (id: string) => {
    setCallbacks((current) => current.map((row) => (row.id === id ? { ...row, status: "done", ageMin: 0 } : row)));
  };

  const handleCall = (caller: string) => {
    setToast(`📞 Calling ${caller}...`);
    window.setTimeout(() => setToast(null), 2500);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 1200);
  };

  const togglePill = (key: string) => {
    setActiveFilterPills((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  return (
    <>
      <div className="shell flex h-screen overflow-hidden">
        <nav className="flex w-[var(--sidebar-w)] min-w-[var(--sidebar-w)] flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-4 pb-[14px] pt-[18px]">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[var(--text-primary)]">
                <svg viewBox="0 0 16 16" className="h-4 w-4 fill-white">
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
              className="flex w-full items-center justify-between rounded-[8px] bg-[var(--surface2)] px-[10px] py-2 text-left transition-colors hover:bg-[#eae9e5]"
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
                  const Icon = item.icon;
                  const active =
                    (item.key === "briefing" && currentView === "briefing") ||
                    (item.key === "queue" && currentView === "queue") ||
                    (item.key === "feed" && currentView === "feed");
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (item.key === "briefing") setView("briefing");
                        if (item.key === "queue") {
                          setCurrentFilter("all");
                          setView("queue");
                        }
                        if (item.key === "feed") setView("feed");
                        if (item.key === "incident") {
                          setCurrentFilter("incident");
                          setView("queue");
                        }
                      }}
                      className={`relative flex w-full items-center gap-[9px] rounded-[8px] px-2 py-[7px] text-left text-[12.5px] transition-colors ${
                        active
                          ? "bg-[var(--text-primary)] text-white"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface2)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <Icon className="h-[14px] w-[14px] shrink-0 opacity-50" />
                      <span>{item.label}</span>
                      {item.count ? (
                        <span
                          className={`ml-auto rounded-[20px] px-[6px] py-[1px] text-[10.5px] font-semibold ${
                            active ? "bg-white/20 text-white" : badgeClass(item.tone)
                          }`}
                        >
                          {item.count}
                        </span>
                      ) : null}
                    </button>
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
          <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-5">
            <div className="flex items-center justify-between py-[14px]">
              <div className="text-[17px] font-semibold tracking-[-0.4px]">
                {currentView === "briefing" ? "Morning briefing" : currentView === "feed" ? "Operations feed" : "Callback queue"}
              </div>
              <div className="flex gap-[6px]">
                <button type="button" className="btn ops-button" onClick={handleRefresh}>
                  <RefreshCcw className="h-[11px] w-[11px]" />
                  {refreshing ? "Refreshing…" : "Refresh"}
                </button>
                <button type="button" className="btn ops-button">
                  <Download className="h-[11px] w-[11px]" />
                  Export
                </button>
                <button type="button" className="btn ops-button ops-button--primary">+ New task</button>
              </div>
            </div>

            <div className="flex">
              {[
                { key: "briefing", label: "Morning briefing" },
                { key: "queue", label: "Callback queue" },
                { key: "feed", label: "Operations feed" },
                { key: "incidents", label: "Incidents" },
                { key: "logs", label: "Call logs" },
              ].map((tab) => {
                const active =
                  (tab.key === "briefing" && currentView === "briefing") ||
                  (tab.key === "queue" && currentView === "queue" && currentFilter !== "incident") ||
                  (tab.key === "feed" && currentView === "feed");
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      if (tab.key === "briefing") setView("briefing");
                      if (tab.key === "queue") {
                        setCurrentFilter("all");
                        setView("queue");
                      }
                      if (tab.key === "feed") setView("feed");
                    }}
                    className={`border-b-2 px-[14px] py-2 text-[12.5px] ${
                      active
                        ? "border-[var(--text-primary)] font-medium text-[var(--text-primary)]"
                        : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-2">
            <div className="flex gap-[5px] overflow-x-auto [scrollbar-width:none]">
              {[
                { key: "all", label: "All", count: counts.all, dot: "var(--text-tertiary)" },
                { key: "overdue", label: "Overdue", count: counts.overdue, dot: "var(--red-mid)" },
                { key: "pending", label: "Pending", count: counts.pending, dot: "var(--amber-mid)" },
                { key: "open", label: "In progress", count: counts.open, dot: "var(--blue-mid)" },
                { key: "done", label: "Done today", count: counts.done, dot: "var(--green-mid)" },
                { key: "incident", label: "Incidents", count: counts.incident, dot: "var(--pink-mid)" },
              ].map((chip) => {
                const active = currentFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setCurrentFilter(chip.key as FilterKey)}
                    className={`inline-flex items-center gap-[6px] whitespace-nowrap rounded-[20px] border px-[11px] py-[5px] text-[12px] ${
                      active
                        ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <span className="h-[6px] w-[6px] rounded-full" style={{ background: active ? "rgba(255,255,255,0.7)" : chip.dot }} />
                    {chip.label}
                    <span className={`font-semibold ${active ? "text-white" : "text-[var(--text-primary)]"}`}>{chip.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-[7px]">
            <div className="flex flex-wrap gap-[5px]">
              {filterPills.map((pill) => {
                const Icon = pill.icon;
                const active = activeFilterPills.includes(pill.key);
                return (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => togglePill(pill.key)}
                    className={`inline-flex items-center gap-1 rounded-[20px] border px-[10px] py-1 text-[11.5px] ${
                      active
                        ? "border-[var(--border-med)] bg-[var(--surface2)] text-[var(--text-primary)]"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface2)]"
                    }`}
                  >
                    {Icon ? <Icon className="h-[10px] w-[10px]" /> : null}
                    {pill.label}
                    {pill.key !== "last24h" ? <span>⌄</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
            {currentView === "queue" ? (
              <div className="active">
                <div className="grid grid-cols-4 gap-3 px-5 pt-4">
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[14px]">
                    <div className="mb-[6px] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Callbacks due</div>
                    <div className="text-[26px] font-semibold tracking-[-0.8px] text-[var(--red)]">{metrics.due}</div>
                    <div className="mt-1 inline-flex rounded px-[6px] py-[1px] text-[11px] font-medium text-[var(--red)]" style={{ background: "var(--red-bg)" }}>
                      ↑ 4 from yesterday
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[14px]">
                    <div className="mb-[6px] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Avg wait time</div>
                    <div className="text-[26px] font-semibold tracking-[-0.8px]">1h 42m</div>
                    <div className="mt-1 inline-flex rounded px-[6px] py-[1px] text-[11px] font-medium text-[var(--red)]" style={{ background: "var(--red-bg)" }}>
                      ↑ 18m above target
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[14px]">
                    <div className="mb-[6px] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Resolved today</div>
                    <div className="text-[26px] font-semibold tracking-[-0.8px] text-[var(--green)]">{metrics.resolved}</div>
                    <div className="mt-1 inline-flex rounded px-[6px] py-[1px] text-[11px] font-medium text-[var(--green)]" style={{ background: "var(--green-bg)" }}>
                      ↑ 2 from yesterday
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[14px]">
                    <div className="mb-[6px] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Recovery rate</div>
                    <div className="text-[26px] font-semibold tracking-[-0.8px]">78%</div>
                    <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">of missed calls recovered</div>
                  </div>
                </div>

                <div className="mx-5 mb-5 mt-[14px] overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                    <div className="text-[13px] font-semibold">Callback tasks</div>
                    <div className="flex gap-[5px]">
                      <button type="button" className="ops-button text-[11px]">Mark resolved</button>
                      <button type="button" className="ops-button text-[11px]">Assign</button>
                    </div>
                  </div>
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: "36px" }} />
                      <col style={{ width: "170px" }} />
                      <col style={{ width: "145px" }} />
                      <col style={{ width: "155px" }} />
                      <col style={{ width: "105px" }} />
                      <col style={{ width: "90px" }} />
                      <col style={{ width: "68px" }} />
                      <col style={{ width: "140px" }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left">
                        <th className="px-[14px] py-[9px] text-center">
                          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-[13px] w-[13px] accent-[var(--text-primary)]" />
                        </th>
                        {[
                          { key: "caller", label: "Caller" },
                          { key: "practice", label: "Practice" },
                          { key: "reason", label: "Reason" },
                          { key: "status", label: "Status" },
                          { key: "priority", label: "Priority" },
                          { key: "age", label: "Age" },
                        ].map((head) => {
                          const sortable = head.key === "caller" || head.key === "status" || head.key === "priority" || head.key === "age";
                          const active = currentSort.col === head.key;
                          const indicator = sortable ? (active ? (currentSort.dir === "asc" ? "↑" : "↓") : "↕") : "↕";
                          return (
                            <th key={head.key} className="px-[14px] py-[9px]">
                              <button
                                type="button"
                                onClick={() => sortable && sortTable(head.key as SortColumn)}
                                className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                              >
                                {head.label} <span className="ml-[3px] text-[9px]">{indicator}</span>
                              </button>
                            </th>
                          );
                        })}
                        <th className="px-[14px] py-[9px] text-[10.5px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCallbacks.map((row) => (
                        <tr
                          key={row.id}
                          className={`anim-in cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[#faf9f7] ${
                            row.status === "overdue" ? "border-l-[3px] border-l-[var(--red-mid)]" : row.status === "incident" ? "border-l-[3px] border-l-[var(--pink-mid)]" : ""
                          }`}
                        >
                          <td className="px-[14px] py-[11px] text-center">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(row.id)}
                              onChange={() => toggleRow(row.id)}
                              className="h-[13px] w-[13px] accent-[var(--text-primary)]"
                            />
                          </td>
                          <td className="px-[14px] py-[11px]">
                            <div className="flex items-center gap-[5px] text-[13px] font-medium text-[var(--text-primary)]">
                              {row.caller}
                              {row.repeat > 0 ? (
                                <span className="rounded bg-[var(--pink-bg)] px-[5px] py-[1px] text-[9.5px] font-semibold text-[var(--pink)]">×{row.repeat}</span>
                              ) : null}
                            </div>
                            <div className="mono mt-[2px] text-[10.5px] text-[var(--text-tertiary)]">{row.phone}</div>
                          </td>
                          <td className="truncate px-[14px] py-[11px] text-[12px] text-[var(--text-secondary)]">{row.practice}</td>
                          <td className="truncate px-[14px] py-[11px] text-[12.5px] text-[var(--text-primary)]">{row.reason}</td>
                          <td className="px-[14px] py-[11px]">
                            <span
                              className="inline-flex rounded-[20px] px-2 py-[3px] text-[11px] font-medium"
                              style={{ background: statusTone(row.status), color: statusColor(row.status) }}
                            >
                              {statusLabel(row.status)}
                            </span>
                          </td>
                          <td className="px-[14px] py-[11px]">
                            <div className="flex items-center gap-[6px] text-[12.5px] text-[var(--text-secondary)]">
                              <span className="h-[7px] w-[7px] rounded-full" style={{ background: priorityDot(row.priority) }} />
                              {priorityLabel(row.priority)}
                            </div>
                          </td>
                          <td className={`mono px-[14px] py-[11px] text-[11.5px] ${row.ageMin >= 120 ? "font-semibold text-[var(--red)]" : "text-[var(--text-secondary)]"}`}>
                            {formatAge(row.ageMin)}
                          </td>
                          <td className="px-[14px] py-[11px]">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleCall(row.caller);
                                }}
                                className="rounded-[6px] border border-[#bdd0e8] px-[9px] py-1 text-[11px] font-medium text-[var(--blue)] transition-colors hover:bg-[var(--blue-bg)]"
                              >
                                Call
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (row.status !== "incident") handleResolve(row.id);
                                }}
                                className="rounded-[6px] border border-[var(--border-med)] px-[9px] py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface2)]"
                              >
                                {row.status === "incident" ? "View" : "Resolve"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {currentView === "briefing" ? (
              <div className="flex flex-col gap-[14px] p-5">
                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4" style={{ borderLeft: "3px solid var(--red-mid)" }}>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--red-bg)] text-[15px]">🚨</div>
                    <div>
                      <div className="text-[13px] font-semibold">3 callbacks are critically overdue</div>
                      <div className="mt-[3px] text-[12px] leading-[1.5] text-[var(--text-secondary)]">Maria Gonzalez (3h 12m), Lisa Hoffman (4h 03m), and James Thornton (2h 44m) have been waiting over 2 hours. Maria has called 3 times and flagged tooth pain as urgent.</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4" style={{ borderLeft: "3px solid var(--amber-mid)" }}>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--amber-bg)] text-[15px]">⚠️</div>
                    <div>
                      <div className="text-[13px] font-semibold">2 open incidents require follow-up</div>
                      <div className="mt-[3px] text-[12px] leading-[1.5] text-[var(--text-secondary)]">Lisa Hoffman&apos;s billing dispute has been escalated to incident status. A second incident is pending acknowledgment from the North location.</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4" style={{ borderLeft: "3px solid var(--blue-mid)" }}>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--blue-bg)] text-[15px]">📞</div>
                    <div>
                      <div className="text-[13px] font-semibold">4 repeat callers detected last night</div>
                      <div className="mt-[3px] text-[12px] leading-[1.5] text-[var(--text-secondary)]">Maria Gonzalez (×3), Robert Patel (×2), and 2 others called multiple times after hours. Repeat-caller workflows have been triggered.</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-[14px]">
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="mb-[6px] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Last night&apos;s calls</div>
                    <div className="text-[26px] font-semibold tracking-[-0.8px]">27</div>
                  </div>
                  <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="mb-[6px] text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">AI recovery rate</div>
                    <div className="text-[26px] font-semibold tracking-[-0.8px]">78%</div>
                  </div>
                </div>
                <div className="pt-2 text-center">
                  <button type="button" className="ops-button ops-button--primary" onClick={() => setView("queue")}>
                    Open callback queue →
                  </button>
                </div>
              </div>
            ) : null}

            {currentView === "feed" ? (
              <div className="p-5">
                <div className="space-y-0">
                  {feedItems.map((item) => (
                    <div key={item.id} className="flex gap-3 border-b border-[var(--border)] py-3">
                      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-[15px]" style={{ background: feedBg(item.type) }}>
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[13px] font-medium text-[var(--text-primary)]">{item.title}</div>
                          <div className="mono shrink-0 text-[11px] text-[var(--text-tertiary)]">{item.time}</div>
                        </div>
                        <div className="mt-[3px] text-[12px] leading-[1.5] text-[var(--text-secondary)]">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[9999] rounded-[10px] bg-[var(--text-primary)] px-4 py-[10px] text-[12.5px] font-medium text-white anim-in">
          {toast}
        </div>
      ) : null}
    </>
  );
}
