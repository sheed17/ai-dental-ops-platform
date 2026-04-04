"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function AutomationPage() {
  const { data, isLoading } = useQuery({ queryKey: ["automation"], queryFn: api.automations });

  return (
    <div>
      <PageHeader title="Automation" description="Operational automations with real-time status and quick enable or disable controls." />
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading automations…</div>
      ) : data?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((automation) => (
            <Card key={automation.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950">{automation.name}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{automation.description}</p>
                </div>
                <StatusBadge value={automation.status} />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Enabled</span>
                <div className={`h-6 w-11 rounded-full p-1 ${automation.enabled ? "bg-slate-900" : "bg-slate-300"}`}>
                  <div className={`h-4 w-4 rounded-full bg-white transition-transform ${automation.enabled ? "translate-x-5" : ""}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          No automation records are available yet.
        </div>
      )}
    </div>
  );
}
