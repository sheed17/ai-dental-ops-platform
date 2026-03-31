import {
  getCalls,
  getCallbackTasks,
  getOperationsFeed,
  getPracticeSettings,
  type Call,
  type CallbackTask,
  type OperationFeedItem,
  type Practice,
} from "@/lib/api";

import { CallbackOperatorConsole, type ConsoleCallback, type ConsoleFeedItem } from "@/components/callback-operator-console";

function mapStatus(task: CallbackTask, now: number, practice: Practice | undefined): ConsoleCallback["status"] {
  if (task.status === "completed") return "done";
  if (task.status === "in_progress") return "open";
  if (task.status === "escalated") return "incident";
  const createdAt = new Date(task.created_at).getTime();
  const sla = practice?.callback_sla_minutes ?? 60;
  const overdue = now - createdAt >= sla * 60_000;
  return overdue ? "overdue" : "pending";
}

function mapPriority(priority: string): ConsoleCallback["priority"] {
  if (priority === "high" || priority === "urgent") return "high";
  if (priority === "medium" || priority === "normal") return "medium";
  return "low";
}

function mapFeed(items: OperationFeedItem[]): ConsoleFeedItem[] {
  return items.slice(0, 10).map((item) => {
    const type =
      item.item_type.includes("sms") || item.item_type.includes("message")
        ? "sms"
        : item.item_type.includes("incident")
          ? "incident"
          : item.item_type.includes("alert") || item.item_type.includes("callback.overdue")
            ? "alert"
            : item.item_type.includes("call")
              ? "call"
              : "system";
    const icon =
      type === "sms" ? "✉️" : type === "incident" ? "🚨" : type === "alert" ? "⚠️" : type === "call" ? "📞" : "⚙️";
    return {
      id: item.id,
      time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(item.occurred_at)),
      type,
      icon,
      title: item.title,
      description: item.detail || item.status || item.item_type,
      relatedCallId: item.related_call_id,
    };
  });
}

export default async function CallbackPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) || {};
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const requestedFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const repeatOnly = (Array.isArray(params.repeat) ? params.repeat[0] : params.repeat) === "1";
  const [calls, tasks, feed, practices] = await Promise.all([
    getCalls().catch(() => [] as Call[]),
    getCallbackTasks().catch(() => [] as CallbackTask[]),
    getOperationsFeed().catch(() => [] as OperationFeedItem[]),
    getPracticeSettings().catch(() => [] as Practice[]),
  ]);

  const practiceMap = new Map(practices.map((practice) => [practice.id, practice]));
  // This page snapshots queue age at request time so operators see current urgency on load.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const callbacks: ConsoleCallback[] = tasks.map((task) => {
    const call = task.callback_phone
      ? calls.find((candidate) => candidate.caller_phone === task.callback_phone)
      : undefined;
    const practice = call ? practiceMap.get(call.practice_id) : undefined;
    const ageMin = Math.max(0, Math.floor((now - new Date(task.created_at).getTime()) / 60000));
    return {
      id: task.id,
      caller: task.callback_name || call?.caller_name || "Unknown caller",
      phone: task.callback_phone || call?.caller_phone || "No phone captured",
      repeat: call?.repeat_caller_count || 0,
      practice: practice?.practice_name || "Unknown practice",
      reason: task.reason,
      status: mapStatus(task, now, practice),
      priority: mapPriority(task.priority),
      ageMin,
      assignedTo: task.assigned_to || null,
      callId: call?.id || null,
      summary: call?.call_summary || call?.reason_for_call || task.reason,
      transcript: call?.transcript || null,
      messageForStaff: call?.message_for_staff || null,
    };
  });

  const urgentCallbacks = callbacks.filter((item) => item.priority === "high" || item.status === "incident" || item.status === "overdue");

  return (
    <CallbackOperatorConsole
      callbacks={callbacks}
      urgentCallbacks={urgentCallbacks}
      operationsFeed={mapFeed(feed)}
      practiceName={practices[0]?.practice_name || "Dental Ops"}
      initialView={requestedView === "briefing" || requestedView === "feed" ? requestedView : "queue"}
      initialFilter={
        requestedFilter === "overdue" ||
        requestedFilter === "pending" ||
        requestedFilter === "open" ||
        requestedFilter === "done" ||
        requestedFilter === "incident"
          ? requestedFilter
          : "all"
      }
      repeatOnly={repeatOnly}
    />
  );
}
