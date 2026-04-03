"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function CallbacksPage() {
  const { data, isLoading } = useQuery({ queryKey: ["callbacks"], queryFn: api.callbacks });

  return (
    <div>
      <PageHeader title="Callbacks" description="Open callback queue with operational context, priority, and action affordances for staff teams." />
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : data ? (
        <DataTable columns={["Caller", "Practice", "Reason", "Status", "Priority", "Created At", "Actions"]}>
          {data.map((callback) => (
            <tr key={callback.id}>
              <td className="px-5 py-4 font-medium text-slate-950">{callback.caller}</td>
              <td className="px-5 py-4 text-sm text-slate-600">{callback.practice}</td>
              <td className="px-5 py-4 text-sm text-slate-600">{callback.reason}</td>
              <td className="px-5 py-4"><StatusBadge value={callback.status} /></td>
              <td className="px-5 py-4"><StatusBadge value={callback.priority} /></td>
              <td className="px-5 py-4 text-sm text-slate-600">{new Date(callback.createdAt).toLocaleString()}</td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary">Mark completed</Button>
                  <Button variant="secondary">Send SMS</Button>
                  <Button>Escalate</Button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </div>
  );
}
