"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

function formatAge(value?: string) {
  if (!value) {
    return "Unknown";
  }
  const ageMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(ageMs / 60000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) {
    return remainder ? `${hours}h ${remainder}m ago` : `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

export default function IncidentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");
  const { data, isLoading } = useQuery({ queryKey: ["incidents"], queryFn: api.incidents });

  const resolveMutation = useMutation({
    mutationFn: (incidentId: string) => api.resolveIncident(incidentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });

  const grouped = useMemo(() => {
    const incidents = data || [];
    return {
      active: incidents.filter((incident) => incident.status !== "resolved"),
      resolved: incidents.filter((incident) => incident.status === "resolved"),
      urgent: incidents.filter((incident) => incident.severity === "urgent" && incident.status !== "resolved"),
    };
  }, [data]);

  const currentItems = grouped[activeTab];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents"
        description="Escalations and high-risk calls that need immediate human judgment, not just queue follow-up."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-500">Active incidents</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{grouped.active.length}</div>
          <div className="mt-2 text-sm text-slate-500">Open and escalated incidents still waiting on human action.</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-500">Urgent right now</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{grouped.urgent.length}</div>
          <div className="mt-2 text-sm text-slate-500">These incidents need the fastest response from the team.</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-slate-500">Resolved today</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{grouped.resolved.length}</div>
          <div className="mt-2 text-sm text-slate-500">Recently handled incident work and closed loops.</div>
        </Card>
      </div>

      <Card className="p-2">
        <div className="flex gap-2 border-b border-slate-200 px-3 py-3">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={
              activeTab === "active"
                ? "rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
                : "rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            }
          >
            Active ({grouped.active.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resolved")}
            className={
              activeTab === "resolved"
                ? "rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
                : "rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            }
          >
            Resolved ({grouped.resolved.length})
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : currentItems.length ? (
            <div className="grid gap-4">
              {currentItems.map((incident) => (
                <Card key={incident.id} className="p-5">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_220px_220px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-slate-950">{incident.title}</div>
                        <StatusBadge value={incident.status === "resolved" ? "incident_resolved" : incident.status === "escalated" ? "escalated" : "incident_open"} />
                        <StatusBadge value={incident.severity} />
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{incident.practice}</div>
                      <div className="mt-4 text-base font-semibold text-slate-900">{incident.summary}</div>
                      {incident.details ? (
                        <div className="mt-3 text-sm leading-6 text-slate-600">{incident.details}</div>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Severity</div>
                        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
                          {incident.severity === "urgent" ? <ShieldAlert className="h-4 w-4 text-red-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          {incident.severity === "urgent" ? "Immediate attention" : incident.severity === "high" ? "Escalated concern" : "Moderate concern"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Raised</div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">{formatAge(incident.createdAt)}</div>
                        {incident.createdAt ? (
                          <div className="mt-1 text-xs text-slate-500">{new Date(incident.createdAt).toLocaleString()}</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Next move</div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">
                          {incident.status === "resolved"
                            ? "No immediate action required"
                            : incident.severity === "urgent"
                              ? "Contact the team immediately"
                              : incident.status === "escalated"
                                ? "Owner review is needed"
                                : "Review and resolve quickly"}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {incident.status !== "resolved" ? (
                          <Button
                            variant="secondary"
                            onClick={() => resolveMutation.mutate(incident.id)}
                            disabled={resolveMutation.isPending}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Resolve
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              {activeTab === "resolved" ? "No resolved incidents yet." : "No active incidents right now."}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
