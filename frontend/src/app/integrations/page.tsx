"use client";

import { useQuery } from "@tanstack/react-query";
import { IntegrationCard } from "@/components/integration-card";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function IntegrationsPage() {
  const { data } = useQuery({ queryKey: ["integrations"], queryFn: api.integrations });

  return (
    <div>
      <PageHeader title="Integrations" description="Connected systems for voice, messaging, alerts, and CRM workflows." />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {data?.map((integration) => <IntegrationCard key={integration.id} integration={integration} />)}
      </div>
    </div>
  );
}
