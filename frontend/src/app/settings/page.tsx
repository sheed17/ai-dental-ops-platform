import { TopNav } from "@/components/top-nav";
import { getPracticeSettings } from "@/lib/api";

export default async function SettingsPage() {
  const practices = await getPracticeSettings();

  return (
    <main className="app-shell">
      <TopNav />
      <section className="hero hero--compact">
        <div>
          <span className="eyebrow">Practice Settings</span>
          <h1>Office behavior should be simple to understand and easy to tune.</h1>
          <p>
            These are the settings a practice owner should recognize immediately: hours,
            emergency posture, callback timing, scheduling mode, and insurance behavior.
          </p>
        </div>
      </section>

      <section className="stack-list">
        {practices.map((practice) => (
          <article key={practice.id} className="panel">
            <div className="panel__header">
              <div>
                <span className="eyebrow">Practice Profile</span>
                <h2>{practice.practice_name}</h2>
              </div>
            </div>
            <div className="settings-grid">
              <div className="stack-item">
                <strong>Office Hours</strong>
                <p>{practice.office_hours}</p>
              </div>
              <div className="stack-item">
                <strong>Emergency Number</strong>
                <p>{practice.emergency_number}</p>
              </div>
              <div className="stack-item">
                <strong>Scheduling Mode</strong>
                <p>{practice.scheduling_mode.replaceAll("_", " ")}</p>
              </div>
              <div className="stack-item">
                <strong>Insurance Mode</strong>
                <p>{practice.insurance_mode.replaceAll("_", " ")}</p>
              </div>
              <div className="stack-item">
                <strong>Callback SLA</strong>
                <p>{practice.callback_sla_minutes} minutes</p>
              </div>
              <div className="stack-item">
                <strong>Missed-Call Recovery</strong>
                <p>{practice.missed_call_recovery_enabled ? "Enabled" : "Disabled"}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
