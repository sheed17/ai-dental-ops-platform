"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { RuleBuilder } from "@/components/rule-builder";
import { api } from "@/lib/api";

export default function RoutingRulesPage() {
  const { data } = useQuery({ queryKey: ["routing-rules"], queryFn: api.routingRules });

  return (
    <div>
      <PageHeader title="Routing Rules" description="A builder-style view of trigger, condition, and action logic across the AI receptionist workflow engine." />
      <div className="space-y-4">
        {data?.map((rule) => <RuleBuilder key={rule.id} rule={rule} />)}
      </div>
    </div>
  );
}
