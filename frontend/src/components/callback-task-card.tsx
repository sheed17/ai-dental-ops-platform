"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { CallbackTask, Call, updateCallbackTask } from "@/lib/api";

export function CallbackTaskCard({ task, call }: { task: CallbackTask; call?: Call }) {
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || "");
  const [status, setStatus] = useState(task.status);
  const [notes, setNotes] = useState(task.internal_notes || "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        await updateCallbackTask(task.id, {
          status,
          assigned_to: assignedTo || null,
          internal_notes: notes || null,
          outcome: task.outcome || null,
        });
        setMessage("Saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to save");
      }
    });
  };

  return (
    <article className="queue-card">
      <div className="queue-card__header">
        <div>
          <span className="eyebrow">Callback Task</span>
          <h3>{task.callback_name || "Unknown caller"}</h3>
        </div>
        <span className={`pill pill--${call?.urgency || "routine"}`}>{call?.urgency || "routine"}</span>
      </div>

      <dl className="queue-meta">
        <div>
          <dt>Phone</dt>
          <dd>{task.callback_phone || "No phone captured"}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{new Date(task.created_at).toLocaleString()}</dd>
        </div>
      </dl>

      <p className="queue-card__reason">{task.reason}</p>
      {task.due_note ? <p className="subtle">{task.due_note}</p> : null}

      <div className="form-grid">
        <label className="field">
          <span>Assigned to</span>
          <input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Sarah" />
        </label>
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
      </label>

      <div className="action-bar">
        <button type="button" className="action-button action-button--accent" onClick={save} disabled={isPending}>
          Save task
        </button>
        {call ? (
          <Link href={`/calls/${call.id}`} className="button-link">
            Open call
          </Link>
        ) : null}
        {message ? <span className="subtle">{message}</span> : null}
      </div>
    </article>
  );
}
