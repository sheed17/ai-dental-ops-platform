"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, PhoneCall, Siren } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { Callback } from "@/lib/types";

function formatAge(createdAt: string) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.max(1, Math.floor(ageMs / 60000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) {
    return remainder ? `${hours}h ${remainder}m ago` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ageTone(createdAt: string, priority: Callback["priority"]) {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (priority === "high" || ageHours >= 24) {
    return "text-red-600";
  }
  if (ageHours >= 6) {
    return "text-amber-600";
  }
  return "text-slate-500";
}

export default function CallbacksPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"open" | "escalated" | "completed">("open");
  const { data, isLoading } = useQuery({ queryKey: ["callbacks"], queryFn: api.callbacks });

  const callbackMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.updateCallback(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["callbacks"] });
    },
  });

  const grouped = useMemo(() => {
    const callbacks = data || [];
    return {
      open: callbacks.filter((item) => item.status === "open"),
      escalated: callbacks.filter((item) => item.status === "escalated"),
      completed: callbacks.filter((item) => item.status === "completed"),
    };
  }, [data]);

  const currentItems = grouped[activeTab];
  const counts = {
    open: grouped.open.length,
    escalated: grouped.escalated.length,
    completed: grouped.completed.length,
  };

  function updateCallbackStatus(id: string, status: Callback["status"], extra?: Record<string, unknown>) {
    callbackMutation.mutate({
      id,
      payload: {
        status,
        assigned_to: null,
        internal_notes: null,
        outcome: status === "completed" ? "Handled from callback queue" : null,
        ...(extra || {}),
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Callbacks"
        description="Work the callback queue from most urgent to least urgent, and move each person toward a clear next step."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-500">Needs attention now</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{counts.open + counts.escalated}</div>
          <div className="mt-2 text-sm text-slate-500">Open and escalated callbacks still waiting on a person.</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-500">Escalated callbacks</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{counts.escalated}</div>
          <div className="mt-2 text-sm text-slate-500">These callbacks need immediate owner attention.</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-500">Twilio readiness</div>
          <div className="mt-3 text-lg font-semibold text-slate-950">UI ready</div>
          <div className="mt-2 text-sm text-slate-500">
            SMS actions can stay in place now and route through Twilio once approval lands.
          </div>
        </Card>
      </div>

      <Card className="p-2">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-3 py-3">
          {[
            { key: "open", label: "Open", count: counts.open },
            { key: "escalated", label: "Escalated", count: counts.escalated },
            { key: "completed", label: "Completed", count: counts.completed },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={
                activeTab === tab.key
                  ? "rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
                  : "rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              }
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="p-4">
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : currentItems.length ? (
            <div className="grid gap-4">
              {currentItems.map((callback) => (
                <Card key={callback.id} className="p-5">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_220px_220px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-slate-950">{callback.caller}</div>
                        <StatusBadge value={callback.status === "open" ? "callback_open" : callback.status} />
                        <StatusBadge value={callback.priority} />
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{callback.phone}</div>
                      <div className="mt-4 text-base font-semibold text-slate-900">{callback.reason}</div>
                      {callback.internalNotes ? (
                        <div className="mt-3 text-sm leading-6 text-slate-600">{callback.internalNotes}</div>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Practice</div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">{callback.practice}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Queue age</div>
                        <div className={`mt-2 text-sm font-semibold ${ageTone(callback.createdAt, callback.priority)}`}>
                          {formatAge(callback.createdAt)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{new Date(callback.createdAt).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Next move</div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">
                          {callback.status === "escalated"
                            ? "Escalated callback needs owner attention"
                            : callback.priority === "high"
                              ? "Call back as soon as possible"
                              : "Return the call in queue order"}
                        </div>
                        {callback.dueNote ? (
                          <div className="mt-2 text-sm text-slate-500">{callback.dueNote}</div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {callback.status !== "completed" ? (
                          <Button
                            variant="secondary"
                            onClick={() => updateCallbackStatus(callback.id, "completed")}
                            disabled={callbackMutation.isPending}
                          >
                            Mark completed
                          </Button>
                        ) : null}
                        {callback.status !== "escalated" ? (
                          <Button
                            onClick={() =>
                              updateCallbackStatus(callback.id, "escalated", {
                                internal_notes: callback.internalNotes || "Escalated from callback queue.",
                              })
                            }
                            disabled={callbackMutation.isPending}
                          >
                            <Siren className="mr-2 h-4 w-4" />
                            Escalate
                          </Button>
                        ) : null}
                        <Button asChild variant="ghost">
                          <Link href="/messages" className="inline-flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Send SMS
                          </Link>
                        </Button>
                        <Button asChild variant="ghost">
                          <Link href="/calls" className="inline-flex items-center gap-2">
                            <PhoneCall className="h-4 w-4" />
                            Open calls
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              {activeTab === "completed"
                ? "No completed callbacks yet."
                : activeTab === "escalated"
                  ? "No escalated callbacks right now."
                  : "No open callbacks right now."}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
