"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnalyticsPoint } from "@/lib/types";
import { Card } from "@/components/ui/card";

export function AnalyticsCharts({ data }: { data: AnalyticsPoint[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="p-5">
        <div className="text-lg font-semibold text-slate-950">Calls Volume</div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Line type="monotone" dataKey="calls" stroke="#0f172a" strokeWidth={2.5} />
              <Line type="monotone" dataKey="callbacks" stroke="#64748b" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5">
        <div className="text-lg font-semibold text-slate-950">Missed Vs Conversion</div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="missed" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="conversion" fill="#0f172a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
