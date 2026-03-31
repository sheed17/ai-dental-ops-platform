"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, PhoneCall, RefreshCcw, Search, X } from "lucide-react";

import { CommandShell } from "@/components/command-shell";

export type ConsoleCallback = {
  id: string;
  caller: string;
  phone: string;
  repeat: number;
  practice: string;
  reason: string;
  status: "overdue" | "pending" | "open" | "done" | "incident";
  priority: "high" | "medium" | "low";
  ageMin: number;
  assignedTo: string | null;
  callId: string | null;
  summary: string | null;
  transcript: string | null;
  messageForStaff: string | null;
};

export type ConsoleFeedItem = {
  id: string;
  time: string;
  type: "call" | "alert" | "sms" | "system" | "incident";
  icon: string;
  title: string;
  description: string;
  relatedCallId: string | null;
};

type ViewMode = "queue" | "briefing" | "feed";
type FilterMode = "all" | "overdue" | "pending" | "open" | "done" | "incident";

function formatAge(minutes: number) {
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function statusLabel(status: ConsoleCallback["status"]) {
  if (status === "open") return "In progress";
  if (status === "done") return "Done";
  if (status === "incident") return "Incident";
  if (status === "overdue") return "Overdue";
  return "Pending";
}

function statusTone(status: ConsoleCallback["status"]) {
  if (status === "incident") return "bg-[var(--red-bg)] text-[var(--red)]";
  if (status === "overdue") return "bg-[var(--amber-bg)] text-[var(--amber)]";
  if (status === "open") return "bg-[var(--blue-bg)] text-[var(--blue)]";
  if (status === "done") return "bg-[var(--green-bg)] text-[var(--green)]";
  return "bg-[var(--surface3)] text-[var(--text-secondary)]";
}

function priorityDot(priority: ConsoleCallback["priority"]) {
  if (priority === "high") return "var(--red-mid)";
  if (priority === "medium") return "var(--amber-mid)";
  return "var(--green-mid)";
}

function feedTone(type: ConsoleFeedItem["type"]) {
  if (type === "call") return "bg-[var(--blue-bg)]";
  if (type === "alert") return "bg-[var(--amber-bg)]";
  if (type === "sms") return "bg-[var(--green-bg)]";
  if (type === "incident") return "bg-[var(--red-bg)]";
  return "bg-[var(--surface3)]";
}

export function CallbackOperatorConsole({
  callbacks,
  urgentCallbacks,
  operationsFeed,
  practiceName,
  initialView,
  initialFilter,
  repeatOnly,
}: {
  callbacks: ConsoleCallback[];
  urgentCallbacks: ConsoleCallback[];
  operationsFeed: ConsoleFeedItem[];
  practiceName: string;
  initialView: ViewMode;
  initialFilter: FilterMode;
  repeatOnly: boolean;
}) {
  const [rows, setRows] = useState(callbacks);
  const [selectedId, setSelectedId] = useState<string | null>(callbacks[0]?.id || null);
  const [filter, setFilter] = useState<FilterMode>(initialFilter);
  const [view, setView] = useState<ViewMode>(initialView);
  const [search, setSearch] = useState("");
  const [repeatFilter, setRepeatFilter] = useState(repeatOnly);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    setRepeatFilter(repeatOnly);
  }, [repeatOnly]);

  const selected = rows.find((row) => row.id === selectedId) || null;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filter !== "all" && row.status !== filter) return false;
      if (repeatFilter && row.repeat < 1) return false;
      if (search && !`${row.caller} ${row.reason} ${row.practice}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, filter, repeatFilter, search]);

  const metrics = useMemo(() => {
    const due = rows.filter((row) => row.status !== "done").length;
    const overdue = rows.filter((row) => row.status === "overdue" || row.status === "incident").length;
    const avgWait = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.ageMin, 0) / rows.length) : 0;
    const recoveryRate = rows.length ? Math.round((rows.filter((row) => row.status === "done").length / rows.length) * 100) : 0;
    return { due, overdue, avgWait, recoveryRate };
  }, [rows]);

  const morningStats = useMemo(() => {
    const newPatients = rows.filter((row) => row.reason.toLowerCase().includes("new patient")).length;
    const missedCalls = rows.filter((row) => row.status !== "done").length;
    const resolved = rows.filter((row) => row.status === "done").length;
    return { newPatients, missedCalls, resolved };
  }, [rows]);

  const resolveRow = (id: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status: "done", ageMin: 0 } : row)));
  };

  return (
    <CommandShell
      title={view === "briefing" ? "Morning Briefing" : view === "feed" ? "Operations Feed" : "AI Operator Console"}
      activeHref="/callbacks"
      actions={
        <>
          <button type="button" className="ops-button">
            <RefreshCcw className="h-[11px] w-[11px]" />
            Refresh
          </button>
          <button type="button" className="ops-button">
            <Download className="h-[11px] w-[11px]" />
            Export
          </button>
          <button type="button" className="ops-button ops-button--primary">New task</button>
        </>
      }
      subheader={
        <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5">
          <div className="flex items-center gap-5 text-[12.5px]">
            <button type="button" onClick={() => setView("briefing")} className={`border-b-2 px-1 py-3 ${view === "briefing" ? "border-white text-[var(--text-primary)]" : "border-transparent text-[var(--text-tertiary)]"}`}>
              Morning brief
            </button>
            <button type="button" onClick={() => setView("queue")} className={`border-b-2 px-1 py-3 ${view === "queue" ? "border-white text-[var(--text-primary)]" : "border-transparent text-[var(--text-tertiary)]"}`}>
              Callback queue
            </button>
            <button type="button" onClick={() => setView("feed")} className={`border-b-2 px-1 py-3 ${view === "feed" ? "border-white text-[var(--text-primary)]" : "border-transparent text-[var(--text-tertiary)]"}`}>
              Operations feed
            </button>
          </div>
        </div>
      }
      contentClassName="p-0"
    >
      <div className="h-full overflow-y-auto bg-[var(--bg)] px-6 py-6">
        <div className="mb-6 rounded-[20px] border border-[var(--border)] bg-[linear-gradient(135deg,#171b24_0%,#10141c_100%)] p-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--blue)]">Morning brief</div>
          <div className="mt-2 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.8px] text-[var(--text-primary)]">{practiceName}</h1>
              <p className="mt-2 max-w-[760px] text-[14px] leading-7 text-[var(--text-secondary)]">
                {urgentCallbacks.length} urgent callbacks, {morningStats.newPatients} new patient inquiries, {morningStats.missedCalls} missed calls overnight, {morningStats.resolved} callbacks resolved automatically.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[14px] border border-[var(--border)] bg-black/20 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Urgent</div>
                <div className="mt-2 text-[22px] font-semibold text-[var(--red)]">{urgentCallbacks.length}</div>
              </div>
              <div className="rounded-[14px] border border-[var(--border)] bg-black/20 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Resolved</div>
                <div className="mt-2 text-[22px] font-semibold text-[var(--green)]">{morningStats.resolved}</div>
              </div>
            </div>
          </div>
        </div>

        {view === "briefing" ? (
          <div className="space-y-4">
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Urgent callbacks</div>
              <div className="mt-2 text-[18px] font-semibold text-[var(--text-primary)]">{urgentCallbacks.length} callbacks need immediate attention</div>
                <div className="mt-2 text-[13px] text-[var(--text-secondary)]">
                  {urgentCallbacks.slice(0, 3).map((item) => `${item.caller} (${formatAge(item.ageMin)})`).join(", ") || "No urgent callbacks right now."}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Last night&apos;s calls</div>
                <div className="mt-2 text-[28px] font-semibold text-[var(--text-primary)]">{rows.length}</div>
                <div className="mt-2 text-[13px] text-[var(--text-secondary)]">{morningStats.missedCalls} still require human follow-up.</div>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">AI recovery rate</div>
                <div className="mt-2 text-[28px] font-semibold text-[var(--green)]">{metrics.recoveryRate}%</div>
                <div className="mt-2 text-[13px] text-[var(--text-secondary)]">Callbacks resolved or recovered without front-desk intervention.</div>
              </div>
            </div>
            <div>
              <button type="button" onClick={() => setView("queue")} className="ops-button ops-button--primary">
                Open callback queue
              </button>
            </div>
          </div>
        ) : null}

        {view === "feed" ? (
          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="space-y-4">
              {operationsFeed.map((item) => (
                <div key={item.id} className="flex gap-3 border-b border-[var(--border)] pb-4 last:border-b-0 last:pb-0">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${feedTone(item.type)}`}>{item.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">{item.title}</div>
                      <div className="mono text-[10px] text-[var(--text-tertiary)]">{item.time}</div>
                    </div>
                    <div className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">{item.description}</div>
                    {item.relatedCallId ? (
                      <Link href={`/calls/${item.relatedCallId}`} className="mt-2 inline-block text-[11px] font-medium text-[var(--blue)]">
                        Open call
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {view === "queue" ? (
          <>
            <div className="mb-6 grid grid-cols-4 gap-4">
              {[
                { label: "Callbacks due", value: metrics.due, tone: "text-[var(--text-primary)]" },
                { label: "Overdue", value: metrics.overdue, tone: "text-[var(--amber)]" },
                { label: "Recovery rate", value: `${metrics.recoveryRate}%`, tone: "text-[var(--green)]" },
                { label: "Avg wait time", value: formatAge(metrics.avgWait), tone: "text-[var(--blue)]" },
              ].map((item) => (
                <div key={item.label} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                  <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">{item.label}</div>
                  <div className={`mt-2 text-[24px] font-semibold tracking-[-0.6px] ${item.tone}`}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Urgent tasks</div>
                  <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.4px] text-[var(--text-primary)]">Handle these first</h2>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {urgentCallbacks.slice(0, 3).map((task) => (
                  <div key={task.id} className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[15px] font-semibold text-[var(--text-primary)]">{task.caller}</div>
                        <div className="mt-1 text-[13px] text-[var(--text-secondary)]">{task.practice}</div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusTone(task.status)}`}>{statusLabel(task.status)}</span>
                    </div>
                    <div className="mt-4 text-[13px] text-[var(--text-primary)]">{task.reason}</div>
                    <div className="mt-2 text-[12px] text-[var(--text-secondary)]">Waiting: {formatAge(task.ageMin)}</div>
                    <div className="mt-4 flex gap-2">
                      <button type="button" className="ops-button" onClick={() => setSelectedId(task.id)}>
                        <PhoneCall className="h-[11px] w-[11px]" />
                        Call
                      </button>
                      <button type="button" className="ops-button">Assign</button>
                      <button type="button" className="ops-button" onClick={() => resolveRow(task.id)}>Resolve</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1.25fr)_360px] gap-6">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Callback queue</div>
                    <h2 className="mt-2 text-[18px] font-semibold text-[var(--text-primary)]">Operator list</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search callbacks"
                        className="h-10 rounded-[10px] border border-[var(--border)] bg-[var(--surface2)] pl-9 pr-3 text-[13px] text-[var(--text-primary)] outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      {(["all", "overdue", "pending", "open", "done", "incident"] as const).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setFilter(item)}
                          className={`rounded-full px-3 py-1.5 text-[11px] font-medium capitalize ${
                            filter === item ? "bg-white text-black" : "bg-[var(--surface2)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRepeatFilter((current) => !current)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${repeatFilter ? "bg-white text-black" : "bg-[var(--surface2)] text-[var(--text-secondary)]"}`}
                    >
                      Repeat only
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-[var(--border)]">
                  {filteredRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={`flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-[var(--surface2)] ${selectedId === row.id ? "bg-[var(--surface2)]" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-[14px] font-medium text-[var(--text-primary)]">{row.caller}</div>
                          {row.repeat > 0 ? <span className="rounded-full bg-[var(--pink-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--pink)]">×{row.repeat}</span> : null}
                        </div>
                        <div className="mt-1 max-w-[420px] truncate text-[13px] text-[var(--text-secondary)]">{row.reason}</div>
                      </div>
                      <div className="w-[120px] text-[12px] text-[var(--text-secondary)]">{statusLabel(row.status)}</div>
                      <div className="w-[100px]">
                        <div className="inline-flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                          <span className="h-[7px] w-[7px] rounded-full" style={{ background: priorityDot(row.priority) }} />
                          <span className="capitalize">{row.priority}</span>
                        </div>
                      </div>
                      <div className={`mono w-[72px] text-[12px] ${row.ageMin >= 120 ? "text-[var(--red)]" : "text-[var(--text-secondary)]"}`}>{formatAge(row.ageMin)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)]">
                <div className="border-b border-[var(--border)] px-4 py-4">
                  <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Operations feed</div>
                  <h2 className="mt-2 text-[18px] font-semibold text-[var(--text-primary)]">Realtime timeline</h2>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {operationsFeed.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${feedTone(item.type)}`}>{item.icon}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[13px] font-medium text-[var(--text-primary)]">{item.title}</div>
                            <div className="mono text-[10px] text-[var(--text-tertiary)]">{item.time}</div>
                          </div>
                          <div className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">{item.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {selected ? (
        <div className="fixed inset-y-0 right-0 z-40 w-[420px] border-l border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Callback detail</div>
              <div className="mt-1 text-[18px] font-semibold text-[var(--text-primary)]">{selected.caller}</div>
            </div>
            <button type="button" onClick={() => setSelectedId(null)} className="rounded-[10px] border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--surface2)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[calc(100vh-73px)] overflow-y-auto p-5">
            <div className="space-y-4">
              <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface2)] p-4">
                <div className="mono text-[12px] text-[var(--text-secondary)]">{selected.phone}</div>
                <div className="mt-2 text-[13px] leading-6 text-[var(--text-primary)]">{selected.summary || selected.reason}</div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="ops-button ops-button--primary">
                  <PhoneCall className="h-[11px] w-[11px]" />
                  Call
                </button>
                <button type="button" className="ops-button">Send SMS</button>
                <button type="button" className="ops-button">Assign</button>
                <button type="button" className="ops-button" onClick={() => resolveRow(selected.id)}>Resolve</button>
              </div>
              <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Message for staff</div>
                <div className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">{selected.messageForStaff || "No staff guidance captured."}</div>
              </div>
              <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Transcript</div>
                <pre className="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-[var(--text-secondary)]">{selected.transcript || "Transcript unavailable for this callback."}</pre>
              </div>
              {selected.callId ? (
                <Link href={`/calls/${selected.callId}`} className="inline-flex text-[12px] font-medium text-[var(--blue)]">
                  Open full call record
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </CommandShell>
  );
}
