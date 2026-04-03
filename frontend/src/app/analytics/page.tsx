"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsCharts } from "@/components/analytics-charts";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function AnalyticsPage() {
  const { data } = useQuery({ queryKey: ["analytics"], queryFn: api.analytics });

  return (
    <div>
      <PageHeader title="Analytics" description="Volume, missed calls, callback load, conversion trend, and automation performance across the platform." />
      {data ? <AnalyticsCharts data={data} /> : null}
    </div>
  );
}
