import { cn } from "@/lib/utils";

export function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "open" || value === "urgent" || value === "high" || value === "incident_urgent"
      ? "bg-red-50 text-red-700"
      : value === "resolved" || value === "completed" || value === "connected" || value === "healthy" || value === "callback_resolved" || value === "incident_resolved"
        ? "bg-emerald-50 text-emerald-700"
        : value === "escalated" || value === "warning" || value === "not_connected" || value === "callback_open" || value === "incident_open"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-700";

  const labelMap: Record<string, string> = {
    callback_open: "Callback open",
    callback_resolved: "No callback",
    incident_open: "Incident open",
    incident_resolved: "No incident",
    incident_urgent: "Urgent incident",
  };

  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize", tone)}>{labelMap[value] || value.replaceAll("_", " ")}</span>;
}
