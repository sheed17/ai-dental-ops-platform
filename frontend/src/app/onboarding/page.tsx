import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getOnboardingOverview, getPracticeModules, getPracticeSettings } from "@/lib/api";

export default async function OnboardingPage() {
  const practices = await getPracticeSettings();
  const activePractice = practices[0] ?? null;
  const [overview, modules] = activePractice
    ? await Promise.all([getOnboardingOverview(activePractice.id), getPracticeModules(activePractice.id)])
    : [null, []];

  return (
    <div className="app-shell">
      <section className="hero hero--compact">
        <div>
          <span className="eyebrow">Go-Live Checklist</span>
          <h1>Make onboarding feel like setup, not a consulting project.</h1>
          <p>
            This is the client-side experience we want: clear progress, simple requirements,
            and a trustworthy checklist that gets a practice live fast.
          </p>
        </div>
        {overview ? (
          <aside className="hero-card">
            <span className="eyebrow">Progress</span>
            <h2>{overview.practice_name}</h2>
            <p>
              {overview.completed_steps} of {overview.total_steps} onboarding steps completed
            </p>
          </aside>
        ) : null}
      </section>

      {activePractice && overview ? <OnboardingWizard practice={activePractice} overview={overview} modules={modules} /> : null}
    </div>
  );
}
