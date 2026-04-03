import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function DashboardCard({ title, value, meta, icon }: { title: string; value: string | number; meta: string; icon: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500">{title}</div>
        <div className="text-slate-500">{icon}</div>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{meta}</div>
    </Card>
  );
}
