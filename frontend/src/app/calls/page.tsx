"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, ShieldAlert } from "lucide-react";

import { CallDuration } from "@/components/call-duration";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function CallsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["calls"], queryFn: api.calls });

  return (
    <div>
      <PageHeader title="Calls" description="Review every conversation, inspect the outcome, and move directly into detail when callback or incident work is needed." />
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : data ? (
        <div className="grid gap-4">
          {data.map((call) => (
            <Card key={call.id} className="p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_180px_140px_170px_150px_150px_110px] xl:items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-semibold text-slate-950">{call.caller}</div>
                    {call.incident ? <ShieldAlert className="h-4 w-4 text-red-500" /> : null}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{call.phone}</div>
                  <div className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{call.summary}</div>
                </div>

                <div className="text-sm text-slate-600">
                  <div className="font-medium text-slate-900">{call.practice}</div>
                  <div className="mt-1">Practice</div>
                </div>

                <div className="text-sm text-slate-600">
                  <div className="font-medium text-slate-900">{new Date(call.time).toLocaleDateString()}</div>
                  <div className="mt-1">{new Date(call.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock3 className="h-4 w-4 text-slate-400" />
                  <span><CallDuration duration={call.duration} recordingUrl={call.recordingUrl} /></span>
                </div>

                <div className="text-sm text-slate-700">
                  <div className="font-medium text-slate-900">{call.outcome}</div>
                  <div className="mt-1 text-slate-500">Outcome</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={call.callbackStatus} />
                  <StatusBadge value={call.incident ? "urgent" : call.incidentStatus} />
                  <StatusBadge value={call.recordingUrl ? "connected" : "not_connected"} />
                </div>

                <div className="flex xl:justify-end">
                  <Button asChild variant="secondary">
                    <Link href={`/calls/${call.id}`} className="inline-flex items-center gap-2">
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
