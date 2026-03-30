import Link from "next/link";

import { TopNav } from "@/components/top-nav";
import { getDashboardSummary } from "@/lib/api";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function Home() {
  const summary = await getDashboardSummary();
  const recentCalls = summary.recent_calls.slice(0, 8);
  const urgentIncidents = summary.urgent_incidents.slice(0, 6);
  const activePractice = summary.practices[0] ?? null;

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
          <strong>{summary.open_callback_tasks.length}</strong>
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

      <section className="content-grid">
        <article className="panel">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Overdue Callbacks</span>
              <h2>Who is slipping past SLA</h2>
            </div>
          </div>
          <div className="stack-list">
            {summary.overdue_callback_tasks.length ? (
              summary.overdue_callback_tasks.map((task) => (
                <div key={task.id} className="stack-item">
                  <div className="stack-item__top">
                    <strong>{task.callback_name || "Unknown caller"}</strong>
                    <span className={`pill pill--${task.priority}`}>{task.priority}</span>
                  </div>
                  <p>{task.reason}</p>
                  <span className="subtle">{task.callback_phone || "No phone captured"}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">No callbacks are currently overdue.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Repeat Callers</span>
              <h2>Signals worth reviewing</h2>
            </div>
          </div>
          <div className="stack-list">
            {summary.repeat_callers.length ? (
              summary.repeat_callers.map((call) => (
                <div key={call.id} className="stack-item">
                  <div className="stack-item__top">
                    <strong>{call.caller_name || "Unknown caller"}</strong>
                    <span className={`pill pill--${call.urgency}`}>{call.urgency}</span>
                  </div>
                  <p>{call.call_summary || "Repeat caller needs review."}</p>
                  <span className="subtle">{call.caller_phone || "No phone captured"}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">No repeat caller patterns yet.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
