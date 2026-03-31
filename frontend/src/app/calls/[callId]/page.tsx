import Link from "next/link";
import { notFound } from "next/navigation";

import { CommandShell } from "@/components/command-shell";
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

  if (!call) notFound();

  return (
    <CommandShell title="Call detail" activeHref="/callbacks">
      <div className="grid gap-4">
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Call detail</div>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.4px]">{call.caller_name || "Unknown caller"}</h2>
              <p className="mt-2 max-w-[720px] text-[13px] leading-6 text-[var(--text-secondary)]">
                {call.call_summary || call.reason_for_call || "Call detail and workflow context."}
              </p>
            </div>
            <Link href="/callbacks" className="ops-button">
              Back to queue
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-[1.5fr_1fr] gap-4">
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Transcript and recording</div>
            {call.recording_url ? (
              <div className="mt-4">
                <audio controls src={call.recording_url} className="w-full" />
              </div>
            ) : null}
            <pre className="mt-4 overflow-x-auto rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3 text-[12px] leading-6 text-[var(--text-secondary)]">
              {call.transcript || "Transcript not yet available for this call."}
            </pre>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Snapshot</div>
              <div className="mt-3 grid gap-2 text-[12px] text-[var(--text-secondary)]">
                <div>Disposition: <span className="text-[var(--text-primary)]">{call.disposition.replaceAll("_", " ")}</span></div>
                <div>Urgency: <span className="text-[var(--text-primary)]">{call.urgency}</span></div>
                <div>Caller: <span className="mono text-[var(--text-primary)]">{call.caller_phone || "No phone captured"}</span></div>
                <div>Created: <span className="text-[var(--text-primary)]">{formatDateTime(call.created_at)}</span></div>
              </div>
            </div>

            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Callback tasks</div>
              <div className="mt-3 grid gap-2">
                {call.callback_tasks.length ? call.callback_tasks.map((task) => (
                  <div key={task.id} className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3 text-[12px]">
                    <div className="font-medium text-[var(--text-primary)]">{task.reason}</div>
                    <div className="mt-1 text-[var(--text-secondary)]">{task.status.replaceAll("_", " ")}</div>
                  </div>
                )) : <div className="text-[12px] text-[var(--text-secondary)]">No callback tasks linked.</div>}
              </div>
            </div>

            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Incidents</div>
              <div className="mt-3 grid gap-2">
                {call.incidents.length ? call.incidents.map((incident) => (
                  <div key={incident.id} className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3 text-[12px]">
                    <div className="font-medium text-[var(--text-primary)]">{incident.incident_type.replaceAll("_", " ")}</div>
                    <div className="mt-1 text-[var(--text-secondary)]">{incident.summary}</div>
                  </div>
                )) : <div className="text-[12px] text-[var(--text-secondary)]">No incidents linked.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CommandShell>
  );
}
