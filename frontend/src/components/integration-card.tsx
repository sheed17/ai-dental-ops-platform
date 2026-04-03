import { Integration } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

export function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-950">{integration.name}</div>
          <div className="mt-2 text-sm leading-6 text-slate-500">{integration.description}</div>
        </div>
        <StatusBadge value={integration.status} />
      </div>
    </Card>
  );
}
