"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { RuleBuilder } from "@/components/rule-builder";
import { api } from "@/lib/api";

export default function RoutingRulesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["routing-rules"], queryFn: api.routingRules });

  return (
    <div>
      <PageHeader title="Routing Rules" description="A builder-style view of trigger, condition, and action logic across the AI receptionist workflow engine." />
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading routing rules…</div>
      ) : data?.length ? (
        <div className="space-y-4">
          {data.map((rule) => <RuleBuilder key={rule.id} rule={rule} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          No routing rules are configured yet for this practice.
        </div>
      )}
    </div>
  );
}
