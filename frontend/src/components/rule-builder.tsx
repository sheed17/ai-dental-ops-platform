import { RoutingRule } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

export function RuleBuilder({ rule }: { rule: RoutingRule }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Trigger</div>
            <div className="mt-1 text-sm font-medium text-slate-950">{rule.trigger}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Condition</div>
            <div className="mt-1 text-sm text-slate-700">{rule.condition}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Action</div>
            <div className="mt-1 text-sm text-slate-700">{rule.action}</div>
          </div>
        </div>
        <StatusBadge value={rule.enabled ? "connected" : "not_connected"} />
      </div>
    </Card>
  );
}
