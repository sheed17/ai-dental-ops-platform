export function CallerCell({
  name,
  phone,
  repeatCount,
}: {
  name: string;
  phone: string;
  repeatCount: number;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="truncate text-[13px] font-medium text-neutral-900">{name}</span>
        {repeatCount > 1 && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-pink-50 px-1.5 py-px text-[10px] font-semibold text-pink-700">
            &times;{repeatCount}
          </span>
        )}
      </div>
      <span className="block truncate font-mono text-[11px] text-neutral-400">{phone}</span>
    </div>
  );
}
