import Link from "next/link";

import { TopNav } from "@/components/top-nav";
import { getCalls, getIncidents, getPracticeSettings } from "@/lib/api";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function Home() {
  const [calls, incidents, practices] = await Promise.all([
    getCalls(),
    getIncidents(),
    getPracticeSettings(),
  ]);

  const recentCalls = calls.slice(0, 8);
  const urgentIncidents = incidents.filter((incident) => incident.status === "open").slice(0, 6);
  const activePractice = practices[0] ?? null;

  return (
    <main className="app-shell">
      <TopNav />

      <section className="hero">
        <div>
          <span className="eyebrow">Morning Command Center</span>
          <h1>Everything your front desk needs when the office was unavailable.</h1>
          <p>
            After-hours calls, missed-call recovery, urgent triage, and callback follow-through
            in one workflow surface.
          </p>
        </div>
        {activePractice ? (
          <aside className="hero-card">
            <span className="eyebrow">Active Practice</span>
            <h2>{activePractice.practice_name}</h2>
            <p>{activePractice.office_hours}</p>
            <dl>
              <div>
                <dt>Scheduling</dt>
                <dd>{activePractice.scheduling_mode.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Insurance</dt>
                <dd>{activePractice.insurance_mode.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Callback SLA</dt>
                <dd>{activePractice.callback_sla_minutes} minutes</dd>
              </div>
            </dl>
          </aside>
        ) : null}
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>Recent Calls</span>
          <strong>{recentCalls.length}</strong>
          <p>Fresh calls ready for review and follow-up.</p>
        </article>
        <article className="metric-card">
          <span>Urgent Incidents</span>
          <strong>{urgentIncidents.length}</strong>
          <p>Needs same-day attention from the team.</p>
        </article>
        <article className="metric-card">
          <span>Needs Callback</span>
          <strong>{calls.filter((call) => call.needs_callback).length}</strong>
          <p>Calls that should flow into the callback queue.</p>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Recent Calls</span>
              <h2>Start here every morning</h2>
            </div>
            <Link href="/callbacks" className="text-link">
              Open callback queue
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Caller</th>
                  <th>Disposition</th>
                  <th>Urgency</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => (
                  <tr key={call.id}>
                    <td>{formatDateTime(call.created_at)}</td>
                    <td>
                      <Link href={`/calls/${call.id}`} className="table-link">
                        {call.caller_name || "Unknown caller"}
                      </Link>
                      <div className="subtle">{call.caller_phone || "No phone captured"}</div>
                    </td>
                    <td>{call.disposition.replaceAll("_", " ")}</td>
                    <td>
                      <span className={`pill pill--${call.urgency}`}>{call.urgency}</span>
                    </td>
                    <td>{call.call_summary || call.reason_for_call || "Awaiting review"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Urgent Queue</span>
              <h2>Highest priority first</h2>
            </div>
          </div>
          <div className="stack-list">
            {urgentIncidents.length ? (
              urgentIncidents.map((incident) => (
                <div key={incident.id} className="stack-item">
                  <div className="stack-item__top">
                    <strong>{incident.incident_type.replaceAll("_", " ")}</strong>
                    <span className={`pill pill--${incident.severity}`}>{incident.severity}</span>
                  </div>
                  <p>{incident.summary}</p>
                  <span className="subtle">{formatDateTime(incident.created_at)}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">No urgent incidents are open right now.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
