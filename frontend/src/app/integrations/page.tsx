"use client";

import { useQuery } from "@tanstack/react-query";
import { IntegrationCard } from "@/components/integration-card";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function IntegrationsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["integrations"], queryFn: api.integrations });

  return (
    <div>
      <PageHeader title="Integrations" description="Connected systems for voice, messaging, alerts, and staff follow-up workflows." />
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading integrations…</div>
      ) : data?.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.map((integration) => <IntegrationCard key={integration.id} integration={integration} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          No integration settings are available yet.
        </div>
      )}
    </div>
  );
}
