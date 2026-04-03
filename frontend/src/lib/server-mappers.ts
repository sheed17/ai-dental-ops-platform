import {
  Call,
  Callback,
  DashboardSummary,
  Incident,
  Practice,
  ActivityEvent,
  Integration,
  RoutingRule,
  SetupChecklistItem,
  SetupPhoneNumber,
} from "@/lib/types";

type BackendCall = {
  id: string;
  practice_id: string;
  caller_name: string | null;
  caller_phone: string | null;
  disposition: string;
  urgency: string;
  call_summary: string | null;
  reason_for_call: string | null;
  needs_callback: boolean;
  needs_incident: boolean;
  transcript: string | null;
  recording_url: string | null;
  created_at: string;
  duration_seconds: number | null;
  message_for_staff?: string | null;
  ended_reason?: string | null;
  repeat_caller_count?: number;
  callback_tasks: Array<{ id: string }>;
  incidents: Array<{ id: string }>;
  structured_outputs: Array<{ field_name: string; value_text: string | null; value_bool: boolean | null }>;
  recent_related_calls?: Array<{ id: string; caller_name: string | null; caller_phone: string | null; call_summary: string | null; created_at: string }>;
};

type BackendPractice = {
  id: string;
  practice_name: string;
  office_hours: string;
  services_summary: string;
};

type BackendPhoneNumber = {
  phone_number: string;
};

type BackendDashboard = {
  recent_calls: BackendCall[];
  urgent_incidents: Array<{ id: string }>;
  open_callback_tasks: Array<{ id: string }>;
  overdue_callback_tasks: Array<{ id: string }>;
};

type BackendOperationalEvent = {
  id: string;
  title: string;
  detail: string | null;
  created_at: string;
  severity: string | null;
  event_name: string;
};

export function mapPractice(practice: BackendPractice, phoneNumbers: BackendPhoneNumber[]): Practice {
  return {
    id: practice.id,
    name: practice.practice_name,
    phoneNumbers: phoneNumbers.map((item) => item.phone_number),
    hours: practice.office_hours,
    services: practice.services_summary.split(",").map((value) => value.trim()).filter(Boolean),
    locations: phoneNumbers.length || 1,
  };
}

function formatStructuredOutput(fieldName: string, rawValue: string) {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  const labelMap: Record<string, string> = {
    flag_urgent: "Urgent concern",
    urgency_level: "Urgency",
    call_disposition: "Call type",
    reason_for_call: "Reason for call",
    caller_name: "Caller name",
    caller_phone: "Caller phone",
  };

  const valueMaps: Record<string, Record<string, string>> = {
    flag_urgent: {
      true: "Yes, the caller raised something urgent",
      false: "No urgent concern detected",
    },
    urgency_level: {
      informational: "Informational only",
      routine: "Routine",
      urgent: "Urgent",
    },
    call_disposition: {
      appointment_request: "Appointment request",
      urgent_dental: "Urgent dental concern",
      general_message: "General message",
      missed_call: "Missed call",
      other: "Other or unsupported request",
    },
  };

  const hiddenFields = new Set(["call_summary", "message_for_staff"]);
  if (hiddenFields.has(fieldName)) {
    return null;
  }

  return {
    label: labelMap[fieldName] || fieldName.replaceAll("_", " "),
    value: valueMaps[fieldName]?.[value.toLowerCase()] || value,
  };
}

export function mapCall(call: BackendCall, practiceName: string): Call {
  const caller =
    call.caller_name?.trim() ||
    (call.caller_phone ? "Unknown caller" : "Unknown caller");
  const phone = call.caller_phone || "Not captured";
  const duration =
    typeof call.duration_seconds === "number" && call.duration_seconds > 0 && call.duration_seconds <= 1800
      ? call.duration_seconds >= 3600
        ? `${Math.floor(call.duration_seconds / 3600)}h ${Math.floor((call.duration_seconds % 3600) / 60)}m`
        : `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
      : "Not reliable";
  const outcomeMap: Record<string, string> = {
    appointment_request: "Appointment request",
    urgent_dental: "Urgent dental concern",
    general_message: "General message",
    missed_call: "Missed call",
    other: "Other request",
  };

  return {
    id: call.id,
    caller,
    phone,
    practice: practiceName,
    practiceId: call.practice_id,
    time: call.created_at,
    duration,
    outcome: outcomeMap[call.disposition] || call.disposition.replaceAll("_", " "),
    callbackNeeded: call.needs_callback,
    incident: call.needs_incident || call.incidents.length > 0,
    callbackStatus: call.callback_tasks.length ? "open" : "resolved",
    incidentStatus: call.incidents.length ? "open" : "resolved",
    transcriptAvailable: Boolean(call.transcript),
    transcript: call.transcript || "",
    summary: call.call_summary || call.reason_for_call || "No summary available.",
    staffNote: call.message_for_staff || "No staff follow-up note was captured on this call.",
    recordingUrl: call.recording_url || "",
    recordingStatus: call.recording_url ? "available" : "not_available",
    structuredOutput: call.structured_outputs
      .map((item) => formatStructuredOutput(item.field_name, String(item.value_text ?? item.value_bool ?? "")))
      .filter((item): item is { label: string; value: string } => Boolean(item))
      .filter((item) => item.value.trim().length > 0),
    automationEvents: [
      `Call logged for ${practiceName}`,
      ...(call.callback_tasks.length ? ["Callback queue item opened for the front desk"] : []),
      ...(call.incidents.length ? ["Urgent incident escalated for human review"] : []),
      ...(call.recording_url ? ["Recording attached to the call record"] : []),
    ],
    repeatCallerCount: call.repeat_caller_count || 0,
    endedReason: (call.ended_reason || "Ended normally").replaceAll("-", " "),
    recentRelatedCalls: (call.recent_related_calls || []).map((item) => ({
      id: item.id,
      caller: item.caller_name?.trim() || (item.caller_phone ? "Caller number captured" : "Unknown caller"),
      phone: item.caller_phone || "Not captured",
      createdAt: item.created_at,
      summary: item.call_summary || "No summary available.",
    })),
  };
}

export function mapCallback(task: {
  id: string;
  callback_name: string | null;
  reason: string;
  status: string;
  priority: string;
  created_at: string;
  practice_id?: string;
}, practiceName: string): Callback {
  return {
    id: task.id,
    caller: task.callback_name || "Unknown caller",
    practice: practiceName,
    reason: task.reason,
    status: task.status === "in_progress" ? "open" : (task.status as Callback["status"]),
    priority: (task.priority === "normal" ? "medium" : task.priority) as Callback["priority"],
    createdAt: task.created_at,
  };
}

export function mapIncident(incident: {
  id: string;
  incident_type: string;
  severity: string;
  status: string;
  summary: string;
}, practiceName = "Unknown practice"): Incident {
  return {
    id: incident.id,
    title: incident.incident_type.replaceAll("_", " "),
    practice: practiceName,
    severity: (incident.severity === "routine" ? "medium" : incident.severity) as Incident["severity"],
    status: incident.status as Incident["status"],
    summary: incident.summary,
  };
}

export function mapDashboard(summary: BackendDashboard): DashboardSummary {
  return {
    callsToday: summary.recent_calls.length,
    missedCalls: summary.recent_calls.filter((call) => call.disposition === "missed_call").length,
    openCallbacks: summary.open_callback_tasks.length + summary.overdue_callback_tasks.length,
    incidents: summary.urgent_incidents.length,
    activeAutomations: 3,
  };
}

export function mapOperationalEvent(event: BackendOperationalEvent): ActivityEvent {
  const type =
    event.event_name.includes("callback")
      ? "callback_created"
      : event.event_name.includes("incident")
        ? "incident_created"
        : event.event_name.includes("sms")
          ? "sms_sent"
          : event.event_name.includes("integration")
            ? "integration_triggered"
            : "call_completed";

  return {
    id: event.id,
    type,
    title: event.title,
    subtitle: event.detail || event.event_name,
    practice: event.severity || "System",
    occurredAt: event.created_at,
  };
}

export function mapIntegration(setting: {
  id: string;
  capability_key: string;
  is_enabled: boolean;
  provider: string;
  config?: Record<string, unknown>;
}): Integration {
  return {
    id: setting.id,
    capabilityKey: setting.capability_key,
    name: setting.capability_key.replaceAll("_", " "),
    status: setting.is_enabled ? "connected" : "not_connected",
    provider: setting.provider,
    description: `Provider: ${setting.provider}`,
    config: setting.config || setting.config,
  };
}

export function mapRoutingRule(rule: {
  id: string;
  name: string;
  trigger_event: string;
  condition_json: Record<string, unknown> | null;
  action_json: Record<string, unknown>;
  is_enabled: boolean;
}): RoutingRule {
  return {
    id: rule.id,
    name: rule.name,
    trigger: rule.trigger_event,
    condition: rule.condition_json ? JSON.stringify(rule.condition_json) : "Always",
    action: JSON.stringify(rule.action_json),
    enabled: rule.is_enabled,
  };
}

export function mapSetupChecklistItem(item: {
  key: string;
  label: string;
  completed: boolean;
  detail: string;
}): SetupChecklistItem {
  return item;
}

export function mapSetupPhoneNumber(number: {
  id: string;
  phone_number: string;
  label: string;
  is_primary: boolean;
  routing_mode: string;
  forward_to_number: string | null;
  voice_enabled: boolean;
  sms_enabled: boolean;
}): SetupPhoneNumber {
  return {
    id: number.id,
    phoneNumber: number.phone_number,
    label: number.label,
    isPrimary: number.is_primary,
    routingMode: number.routing_mode,
    forwardToNumber: number.forward_to_number,
    voiceEnabled: number.voice_enabled,
    smsEnabled: number.sms_enabled,
  };
}
