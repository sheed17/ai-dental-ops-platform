import Link from "next/link";

import { TopNav } from "@/components/top-nav";
import { getCallbackTasks, getCalls } from "@/lib/api";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CallbackQueuePage() {
  const [tasks, calls] = await Promise.all([getCallbackTasks(), getCalls()]);
  const openTasks = tasks.filter((task) => task.status !== "completed");

  const callByTaskId = new Map(
    calls.flatMap((call) => call.callback_tasks.map((task) => [task.id, call] as const)),
  );

  return (
    <main className="app-shell">
      <TopNav />
      <section className="hero hero--compact">
        <div>
          <span className="eyebrow">Callback Queue</span>
          <h1>Work the queue without guessing what matters first.</h1>
          <p>Prioritize urgent items, see assignees, and jump into the full call context fast.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Active Tasks</span>
            <h2>{openTasks.length} callback tasks need attention</h2>
          </div>
        </div>

        <div className="queue-grid">
          {openTasks.map((task) => {
            const call = callByTaskId.get(task.id);
            const urgency = call?.urgency || "routine";
            return (
              <article key={task.id} className="queue-card">
                <div className="queue-card__header">
                  <div>
                    <span className="eyebrow">Callback Task</span>
                    <h3>{task.callback_name || "Unknown caller"}</h3>
                  </div>
                  <span className={`pill pill--${urgency}`}>{urgency}</span>
                </div>

                <dl className="queue-meta">
                  <div>
                    <dt>Phone</dt>
                    <dd>{task.callback_phone || "No phone captured"}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{task.status.replaceAll("_", " ")}</dd>
                  </div>
                  <div>
                    <dt>Assigned</dt>
                    <dd>{task.assigned_to || "Unassigned"}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDateTime(task.created_at)}</dd>
                  </div>
                </dl>

                <p className="queue-card__reason">{task.reason}</p>
                {task.due_note ? <p className="subtle">{task.due_note}</p> : null}
                {task.internal_notes ? <p className="queue-card__notes">Notes: {task.internal_notes}</p> : null}

                {call ? (
                  <Link href={`/calls/${call.id}`} className="button-link">
                    Open call detail
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
