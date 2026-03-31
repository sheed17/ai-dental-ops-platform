import { CommandShell } from "@/components/command-shell";
import { getPracticeSettings } from "@/lib/api";

export default async function SettingsPage() {
  const practices = await getPracticeSettings();

  return (
    <CommandShell title="Practice settings" activeHref="/settings">
      <div className="grid gap-4">
        {practices.map((practice) => (
          <article key={practice.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Practice profile</div>
            <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.4px]">{practice.practice_name}</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Office hours</div>
                <div className="mt-1 text-[12px] text-[var(--text-primary)]">{practice.office_hours}</div>
              </div>
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Emergency number</div>
                <div className="mt-1 text-[12px] text-[var(--text-primary)]">{practice.emergency_number}</div>
              </div>
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Callback SLA</div>
                <div className="mt-1 text-[12px] text-[var(--text-primary)]">{practice.callback_sla_minutes} minutes</div>
              </div>
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Scheduling mode</div>
                <div className="mt-1 text-[12px] capitalize text-[var(--text-primary)]">{practice.scheduling_mode.replaceAll("_", " ")}</div>
              </div>
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Insurance mode</div>
                <div className="mt-1 text-[12px] capitalize text-[var(--text-primary)]">{practice.insurance_mode.replaceAll("_", " ")}</div>
              </div>
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Recovery</div>
                <div className="mt-1 text-[12px] text-[var(--text-primary)]">{practice.missed_call_recovery_enabled ? "Enabled" : "Disabled"}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </CommandShell>
  );
}
