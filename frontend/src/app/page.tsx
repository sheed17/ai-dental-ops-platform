"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Phone,
  Repeat,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { ActivityFeed } from "@/components/activity-feed";
import { DashboardCard } from "@/components/dashboard-card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

function formatTime(value?: string) {
  if (!value) {
    return "No activity yet";
  }
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OverviewPage() {
  const summary = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const events = useQuery({ queryKey: ["events"], queryFn: api.events });
  const callbacks = useQuery({ queryKey: ["callbacks"], queryFn: api.callbacks });
  const incidents = useQuery({ queryKey: ["incidents"], queryFn: api.incidents });
  const messages = useQuery({ queryKey: ["messages"], queryFn: api.messages });
  const setup = useQuery({ queryKey: ["setup-workspace"], queryFn: () => api.setupWorkspace() });

  const loading =
    summary.isLoading ||
    events.isLoading ||
    callbacks.isLoading ||
    incidents.isLoading ||
    messages.isLoading ||
    setup.isLoading;

  const urgentIncident = incidents.data?.find((item) => item.status !== "resolved");
  const nextCallback = callbacks.data?.find((item) => item.status !== "completed");
  const nextThread = messages.data?.find((item) => item.status === "needs_reply") || messages.data?.[0];
  const setupChecklist = setup.data?.checklist || [];
  const completedSetupSteps = setupChecklist.filter((item) => item.completed).length;
  const threadNeedsReplyCount = messages.data?.filter((item) => item.status === "needs_reply").length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Mission control for the receptionist system. Start here to see what needs attention, what is healthy, and where to jump next."
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <DashboardCard title="Calls Today" value={summary.data?.callsToday || 0} meta="Inbound and completed" icon={<Phone className="h-4 w-4" />} />
            <DashboardCard title="Missed Calls" value={summary.data?.missedCalls || 0} meta="Recovery candidates" icon={<Sparkles className="h-4 w-4" />} />
            <DashboardCard title="Open Callbacks" value={summary.data?.openCallbacks || 0} meta="Needs human follow-up" icon={<Repeat className="h-4 w-4" />} />
            <DashboardCard title="Incidents" value={summary.data?.incidents || 0} meta="Urgent signals in queue" icon={<ShieldAlert className="h-4 w-4" />} />
            <DashboardCard title="Active Automations" value={summary.data?.activeAutomations || 0} meta="Healthy and enabled" icon={<Bot className="h-4 w-4" />} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="text-lg font-semibold text-slate-950">Attention now</div>
                <div className="mt-1 text-sm text-slate-500">The clearest next actions across calls, callbacks, incidents, and messaging.</div>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Urgent incident</div>
                  <div className="mt-3 text-lg font-semibold text-slate-950">
                    {urgentIncident ? urgentIncident.title : "No active incident"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    {urgentIncident
                      ? urgentIncident.summary
                      : "Nothing urgent is waiting on the team right now."}
                  </div>
                  <Button asChild className="mt-5" variant="secondary">
                    <Link href="/incidents" className="inline-flex items-center gap-2">
                      Open incidents
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Callback queue</div>
                  <div className="mt-3 text-lg font-semibold text-slate-950">
                    {nextCallback ? nextCallback.caller : "Queue is clear"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    {nextCallback
                      ? `${nextCallback.reason} · ${nextCallback.practice}`
                      : "No callbacks are waiting on staff right now."}
                  </div>
                  <Button asChild className="mt-5" variant="secondary">
                    <Link href="/callbacks" className="inline-flex items-center gap-2">
                      Work callbacks
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Messaging</div>
                  <div className="mt-3 text-lg font-semibold text-slate-950">
                    {nextThread ? nextThread.patient : "No active thread"}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    {nextThread
                      ? `${nextThread.triggerLabel || "Follow-up thread"} · ${formatTime(nextThread.lastMessageAt)}`
                      : "No SMS conversations are waiting on a reply."}
                  </div>
                  <Button asChild className="mt-5" variant="secondary">
                    <Link href="/messages" className="inline-flex items-center gap-2">
                      Open messages
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="text-lg font-semibold text-slate-950">Go-live readiness</div>
              <div className="mt-1 text-sm text-slate-500">How close the practice is to running the receptionist system cleanly.</div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-3xl font-semibold text-slate-950">
                  {completedSetupSteps}/{setupChecklist.length || 0}
                </div>
                <div className="mt-2 text-sm text-slate-500">Checklist steps completed</div>
              </div>

              <div className="mt-5 space-y-3">
                {setupChecklist.slice(0, 4).map((item) => (
                  <div key={item.key} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-950">{item.label}</div>
                      <StatusPill completed={item.completed} />
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{item.detail}</div>
                  </div>
                ))}
              </div>

              <Button asChild className="mt-5 w-full">
                <Link href="/setup">Open setup workspace</Link>
              </Button>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <ActivityFeed items={events.data || []} />

            <Card className="p-6">
              <div className="text-lg font-semibold text-slate-950">System health</div>
              <div className="mt-1 text-sm text-slate-500">A quick read on whether core workflows are behaving as expected.</div>

              <div className="mt-5 space-y-3">
                <HealthRow
                  label="Callback queue"
                  detail={
                    (summary.data?.openCallbacks || 0) > 0
                      ? `${summary.data?.openCallbacks} callback items still need staff action`
                      : "No callbacks are waiting right now"
                  }
                  tone={(summary.data?.openCallbacks || 0) > 0 ? "warning" : "healthy"}
                />
                <HealthRow
                  label="Incident flow"
                  detail={
                    (summary.data?.incidents || 0) > 0
                      ? `${summary.data?.incidents} incident records are still active`
                      : "No active incidents are blocking the team"
                  }
                  tone={(summary.data?.incidents || 0) > 0 ? "warning" : "healthy"}
                />
                <HealthRow
                  label="Messaging follow-up"
                  detail={
                    threadNeedsReplyCount > 0
                      ? `${threadNeedsReplyCount} SMS thread${threadNeedsReplyCount === 1 ? "" : "s"} may need a human response`
                      : "No SMS thread currently needs human response"
                  }
                  tone={threadNeedsReplyCount > 0 ? "warning" : "healthy"}
                />
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatusPill({ completed }: { completed: boolean }) {
  return (
    <span
      className={
        completed
          ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
      }
    >
      {completed ? "Ready" : "Pending"}
    </span>
  );
}

function HealthRow({
  label,
  detail,
  tone,
}: {
  label: string;
  detail: string;
  tone: "healthy" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-950">{label}</div>
        <span
          className={
            tone === "healthy"
              ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
              : "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
          }
        >
          {tone === "healthy" ? "Healthy" : "Attention"}
        </span>
      </div>
      <div className="mt-1 text-sm text-slate-500">{detail}</div>
    </div>
  );
}
