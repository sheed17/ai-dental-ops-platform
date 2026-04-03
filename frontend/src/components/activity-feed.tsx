import { ActivityEvent } from "@/lib/types";
import { Card } from "@/components/ui/card";

export function ActivityFeed({ items }: { items: ActivityEvent[] }) {
  return (
    <Card className="p-5">
      <div className="text-lg font-semibold text-slate-950">Recent Activity</div>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <div className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-950" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900">
                {item.title} <span className="text-slate-500">— {item.subtitle}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{item.practice}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
