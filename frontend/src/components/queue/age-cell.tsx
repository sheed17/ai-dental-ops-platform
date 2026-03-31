import { cn } from "@/lib/utils";

export function formatAge(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }
  return `${minutes}m`;
}

export function AgeCell({ minutes }: { minutes: number }) {
  const isOverdue = minutes >= 120;
  return (
    <span
      className={cn(
        "font-mono text-[13px]",
        isOverdue ? "font-bold text-red-600" : "text-neutral-600",
      )}
    >
      {formatAge(minutes)}
    </span>
  );
}
