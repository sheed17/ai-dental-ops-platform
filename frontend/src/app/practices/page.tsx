"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function PracticesPage() {
  const { data } = useQuery({ queryKey: ["practices"], queryFn: api.practices });

  return (
    <div>
      <PageHeader title="Practices" description="Multi-practice management across phone numbers, hours, services, and operational footprint." />
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.map((practice) => (
          <Card key={practice.id} className="p-5">
            <div className="text-xl font-semibold text-slate-950">{practice.name}</div>
            <div className="mt-2 text-sm text-slate-500">{practice.hours}</div>
            <div className="mt-4 text-sm font-medium text-slate-700">Phone Numbers</div>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              {practice.phoneNumbers.map((number) => <div key={number}>{number}</div>)}
            </div>
            <div className="mt-4 text-sm font-medium text-slate-700">Services</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {practice.services.map((service) => <span key={service} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{service}</span>)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
