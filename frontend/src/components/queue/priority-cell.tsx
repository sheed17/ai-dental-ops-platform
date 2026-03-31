import { cn } from "@/lib/utils";

const dots: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
};

const shortLabels: Record<string, string> = {
  high: "High",
  medium: "Med",
  low: "Low",
};

export function PriorityCell({ priority }: { priority: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", dots[priority] ?? "bg-neutral-400")} />
      <span className="text-[13px] text-neutral-700">{shortLabels[priority] ?? priority}</span>
    </div>
  );
}
