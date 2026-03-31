import { CommandShell } from "@/components/command-shell";
import { getOnboardingOverview, getPracticeModules, getPracticeSettings } from "@/lib/api";

export default async function OnboardingPage() {
  const practices = await getPracticeSettings();
  const activePractice = practices[0] ?? null;
  const [overview, modules] = activePractice
    ? await Promise.all([getOnboardingOverview(activePractice.id), getPracticeModules(activePractice.id)])
    : [null, []];

  return (
    <CommandShell title="Practice setup" activeHref="/onboarding">
      {overview && activePractice ? (
        <div className="grid gap-4">
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Go-live checklist</div>
            <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.4px]">{overview.practice_name}</h2>
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
              {overview.completed_steps} of {overview.total_steps} onboarding steps completed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Practice profile</div>
              <div className="mt-3 grid gap-2 text-[12.5px] text-[var(--text-secondary)]">
                <div>{activePractice.practice_name}</div>
                <div>{activePractice.address}</div>
                <div>{activePractice.office_hours}</div>
                <div>Emergency: {activePractice.emergency_number}</div>
              </div>
            </div>
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Enabled modules</div>
              <div className="mt-3 grid gap-2">
                {modules.map((module) => (
                  <div key={module.id} className="flex items-center justify-between rounded-[8px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                    <span className="text-[12px] capitalize text-[var(--text-primary)]">{module.module_key.replaceAll("_", " ")}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                        module.is_enabled ? "bg-[var(--green-bg)] text-[var(--green)]" : "bg-[var(--surface2)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {module.is_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Checklist</div>
            <div className="mt-3 grid gap-3">
              {overview.checklist.map((item) => (
                <div key={item.key} className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-[13px]">{item.label}</strong>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                        item.completed ? "bg-[var(--green-bg)] text-[var(--green)]" : "bg-[var(--amber-bg)] text-[var(--amber)]"
                      }`}
                    >
                      {item.completed ? "Complete" : "Needs setup"}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-6 text-[var(--text-secondary)]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </CommandShell>
  );
}
