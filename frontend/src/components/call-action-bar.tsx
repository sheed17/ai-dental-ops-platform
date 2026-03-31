"use client";

import { useState, useTransition } from "react";

import { performCallAction } from "@/lib/api";

export function CallActionBar({ callId }: { callId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runAction = (action: string, note?: string) => {
    startTransition(async () => {
      try {
        await performCallAction(callId, action, note);
        setMessage(`${action.replaceAll("_", " ")} complete`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Action failed");
      }
    });
  };

  return (
    <div className="action-bar">
      <button type="button" className="action-button" onClick={() => runAction("mark_handled")} disabled={isPending}>
        Mark handled
      </button>
      <button
        type="button"
        className="action-button"
        onClick={() => runAction("schedule_callback", "Scheduled from operator action bar")}
        disabled={isPending}
      >
        Schedule callback
      </button>
      <button
        type="button"
        className="action-button action-button--accent"
        onClick={() => runAction("send_sms", "We received your request and will follow up as soon as possible.")}
        disabled={isPending}
      >
        Send SMS
      </button>
      {message ? <span className="subtle">{message}</span> : null}
    </div>
  );
}
