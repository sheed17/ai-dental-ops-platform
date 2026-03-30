import Link from "next/link";
import { notFound } from "next/navigation";

import { TopNav } from "@/components/top-nav";
import { getCall } from "@/lib/api";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  const call = await getCall(callId).catch(() => null);

  if (!call) {
    notFound();
  }

  return (
    <main className="app-shell">
      <TopNav />
      <section className="hero hero--compact">
        <div>
          <span className="eyebrow">Call Detail</span>
          <h1>{call.caller_name || "Unknown caller"}</h1>
          <p>{call.call_summary || call.reason_for_call || "Call detail and workflow context."}</p>
        </div>
        <aside className="hero-card">
          <span className="eyebrow">Call Snapshot</span>
          <dl>
            <div>
              <dt>Disposition</dt>
              <dd>{call.disposition.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Urgency</dt>
              <dd>{call.urgency}</dd>
            </div>
            <div>
              <dt>Caller phone</dt>
              <dd>{call.caller_phone || "No phone captured"}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(call.created_at)}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="content-grid">
        <article className="panel panel--wide">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Transcript & Recording</span>
              <h2>Review what actually happened</h2>
            </div>
            <Link href="/callbacks" className="text-link">
              Back to queue
            </Link>
          </div>

          {call.recording_url ? (
            <div className="recording-player">
              <audio controls src={call.recording_url}>
                Your browser does not support audio playback.
              </audio>
              <a href={call.recording_url} target="_blank" rel="noreferrer" className="text-link">
                Open recording
              </a>
            </div>
          ) : (
            <p className="empty-state">No recording URL stored for this call yet.</p>
          )}

          <div className="transcript-card">
            <h3>Transcript</h3>
            <pre>{call.transcript || "Transcript not yet available for this call."}</pre>
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Operational Context</span>
              <h2>What the team should do</h2>
            </div>
          </div>

          <div className="stack-list">
            <div className="stack-item">
              <strong>Message for staff</strong>
              <p>{call.message_for_staff || "No staff note was generated."}</p>
            </div>

            <div className="stack-item">
              <strong>Callback tasks</strong>
              {call.callback_tasks.length ? (
                call.callback_tasks.map((task) => (
                  <div key={task.id} className="detail-row">
                    <span>{task.status.replaceAll("_", " ")}</span>
                    <span>{task.callback_phone || "No phone captured"}</span>
                  </div>
                ))
              ) : (
                <p className="subtle">No callback tasks linked.</p>
              )}
            </div>

            <div className="stack-item">
              <strong>Incidents</strong>
              {call.incidents.length ? (
                call.incidents.map((incident) => (
                  <div key={incident.id} className="detail-row">
                    <span>{incident.incident_type.replaceAll("_", " ")}</span>
                    <span className={`pill pill--${incident.severity}`}>{incident.severity}</span>
                  </div>
                ))
              ) : (
                <p className="subtle">No incidents linked.</p>
              )}
            </div>

            <div className="stack-item">
              <strong>Structured outputs</strong>
              {call.structured_outputs.length ? (
                call.structured_outputs.map((output) => (
                  <div key={output.id} className="detail-structured">
                    <span>{output.field_name}</span>
                    <code>
                      {output.value_text ??
                        (output.value_bool !== null ? String(output.value_bool) : JSON.stringify(output.value_json))}
                    </code>
                  </div>
                ))
              ) : (
                <p className="subtle">No structured outputs stored.</p>
              )}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
