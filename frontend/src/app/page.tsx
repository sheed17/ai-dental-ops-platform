"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, Phone, Repeat, ShieldAlert, Sparkles } from "lucide-react";

import { ActivityFeed } from "@/components/activity-feed";
import { DashboardCard } from "@/components/dashboard-card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function OverviewPage() {
  const summary = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const events = useQuery({ queryKey: ["events"], queryFn: api.events });

  return (
    <div>
      <PageHeader
        title="Overview"
        description="A real-time operational view across AI receptionist workflows, callbacks, incidents, messaging, and automation activity."
      />

      {summary.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      ) : summary.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <DashboardCard title="Calls Today" value={summary.data.callsToday} meta="Inbound and completed" icon={<Phone className="h-4 w-4" />} />
          <DashboardCard title="Missed Calls" value={summary.data.missedCalls} meta="Recovery candidates" icon={<Sparkles className="h-4 w-4" />} />
          <DashboardCard title="Open Callbacks" value={summary.data.openCallbacks} meta="Needs human follow-up" icon={<Repeat className="h-4 w-4" />} />
          <DashboardCard title="Incidents" value={summary.data.incidents} meta="Urgent signals in queue" icon={<ShieldAlert className="h-4 w-4" />} />
          <DashboardCard title="Active Automations" value={summary.data.activeAutomations} meta="Healthy and enabled" icon={<Bot className="h-4 w-4" />} />
        </div>
      ) : null}

      <div className="mt-6">
        {events.data ? <ActivityFeed items={events.data} /> : <Skeleton className="h-80" />}
      </div>
    </div>
  );
}
