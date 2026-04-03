"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function IncidentsPage() {
  const { data } = useQuery({ queryKey: ["incidents"], queryFn: api.incidents });

  return (
    <div>
      <PageHeader title="Incidents" description="Urgent calls, escalations, and high-risk situations that require immediate attention." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((incident) => (
          <Card key={incident.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-950">{incident.title}</div>
                <div className="mt-1 text-sm text-slate-500">{incident.practice}</div>
              </div>
              <StatusBadge value={incident.status} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{incident.summary}</p>
            <div className="mt-4"><StatusBadge value={incident.severity} /></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
