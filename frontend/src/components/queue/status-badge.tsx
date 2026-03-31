import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  overdue: "bg-red-50 text-red-800",
  pending: "bg-amber-50 text-amber-800",
  in_progress: "bg-blue-50 text-blue-800",
  done: "bg-green-50 text-green-800",
  incident: "bg-pink-50 text-pink-800",
};

const labels: Record<string, string> = {
  overdue: "Overdue",
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
  incident: "Incident",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none",
        variants[status] ?? "bg-neutral-100 text-neutral-600",
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
