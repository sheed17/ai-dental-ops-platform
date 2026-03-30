import { TopNav } from "@/components/top-nav";
import { getOnboardingOverview, getPracticeSettings } from "@/lib/api";

export default async function OnboardingPage() {
  const practices = await getPracticeSettings();
  const activePractice = practices[0] ?? null;
  const overview = activePractice ? await getOnboardingOverview(activePractice.id) : null;

  return (
    <main className="app-shell">
      <TopNav />
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

      <section className="stack-list">
        {overview?.checklist.map((item) => (
          <article key={item.key} className="panel">
            <div className="queue-card__header">
              <div>
                <span className="eyebrow">Checklist Item</span>
                <h2>{item.label}</h2>
              </div>
              <span className={`pill pill--${item.completed ? "routine" : "high"}`}>
                {item.completed ? "complete" : "needs setup"}
              </span>
            </div>
            <p className="queue-card__reason">{item.detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
