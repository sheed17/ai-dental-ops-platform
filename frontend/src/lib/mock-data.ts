import {
  ActivityEvent,
  AnalyticsPoint,
  Automation,
  Call,
  Callback,
  DashboardSummary,
  Incident,
  Integration,
  MessageThread,
  Practice,
  RoutingRule,
} from "@/lib/types";

export const practices: Practice[] = [
  {
    id: "practice_1",
    name: "San Jose Dental",
    phoneNumbers: ["+1 (408) 555-1900", "+1 (408) 555-1901"],
    hours: "Mon-Fri, 8:00 AM - 5:00 PM",
    services: ["General", "Implants", "Emergency"],
    locations: 2,
  },
  {
    id: "practice_2",
    name: "Mission Peak Dental",
    phoneNumbers: ["+1 (510) 555-8821"],
    hours: "Mon-Sat, 7:30 AM - 6:00 PM",
    services: ["Ortho", "Pediatric", "Whitening"],
    locations: 1,
  },
];

export const calls: Call[] = [
  {
    id: "call_1",
    caller: "John Smith",
    phone: "+1 (408) 555-0199",
    practice: "San Jose Dental",
    practiceId: "practice_1",
    time: "2026-04-03T08:10:00.000Z",
    duration: "04:31",
    outcome: "Appointment request",
    callbackNeeded: true,
    incident: false,
    callbackStatus: "open",
    incidentStatus: "resolved",
    transcriptAvailable: true,
    transcript: "Patient called about a cracked molar and wanted to know if same-day availability existed. The AI captured symptoms and promised follow-up.",
    summary: "Same-day cracked tooth concern. Wants earliest available appointment.",
    staffNote: "Prioritize a same-day opening if one becomes available and confirm pain level when staff calls back.",
    recordingUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    recordingStatus: "available",
    structuredOutput: [
      { label: "urgency", value: "medium" },
      { label: "insurance verified", value: "false" },
      { label: "requested service", value: "Emergency exam" },
    ],
    automationEvents: ["Call logged for San Jose Dental", "Callback queue item opened for the front desk", "CRM sync triggered"],
    repeatCallerCount: 1,
    endedReason: "Customer ended call",
    recentRelatedCalls: [],
  },
  {
    id: "call_2",
    caller: "Maria Torres",
    phone: "+1 (510) 555-2222",
    practice: "Mission Peak Dental",
    practiceId: "practice_2",
    time: "2026-04-03T07:44:00.000Z",
    duration: "02:14",
    outcome: "Emergency",
    callbackNeeded: true,
    incident: true,
    callbackStatus: "open",
    incidentStatus: "open",
    transcriptAvailable: true,
    transcript: "Patient reported severe swelling and bleeding after a weekend procedure. The AI flagged emergency routing.",
    summary: "Urgent swelling after procedure. Needs immediate human review.",
    staffNote: "Escalate to the on-call team immediately and document whether the patient needs ER guidance.",
    recordingUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    recordingStatus: "available",
    structuredOutput: [
      { label: "urgency", value: "urgent" },
      { label: "insurance verified", value: "false" },
      { label: "requested service", value: "Post-op emergency" },
    ],
    automationEvents: ["Call logged for Mission Peak Dental", "Urgent incident escalated for human review", "Slack alert sent"],
    repeatCallerCount: 2,
    endedReason: "Assistant ended call",
    recentRelatedCalls: [
      {
        id: "call_2_prev",
        caller: "Maria Torres",
        phone: "+1 (510) 555-2222",
        createdAt: "2026-04-02T18:11:00.000Z",
        summary: "Follow-up question after oral surgery.",
      },
    ],
  },
  {
    id: "call_3",
    caller: "Ava Brooks",
    phone: "+1 (408) 555-3030",
    practice: "San Jose Dental",
    practiceId: "practice_1",
    time: "2026-04-03T06:58:00.000Z",
    duration: "01:22",
    outcome: "General question",
    callbackNeeded: false,
    incident: false,
    callbackStatus: "resolved",
    incidentStatus: "resolved",
    transcriptAvailable: true,
    transcript: "Patient wanted to confirm office hours and accepted an SMS follow-up.",
    summary: "Routine office hours inquiry.",
    staffNote: "No direct staff action needed unless the patient replies to the follow-up text.",
    recordingUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    recordingStatus: "available",
    structuredOutput: [
      { label: "urgency", value: "routine" },
      { label: "insurance verified", value: "false" },
      { label: "requested service", value: "Hours request" },
    ],
    automationEvents: ["Call logged for San Jose Dental", "SMS sent"],
    repeatCallerCount: 0,
    endedReason: "Assistant ended call",
    recentRelatedCalls: [],
  },
];

export const callbacks: Callback[] = [
  { id: "cb_1", caller: "John Smith", practice: "San Jose Dental", reason: "Cracked tooth follow-up", status: "open", priority: "high", createdAt: "2026-04-03T08:12:00.000Z" },
  { id: "cb_2", caller: "Elena Park", practice: "Mission Peak Dental", reason: "Missed call recovery", status: "open", priority: "medium", createdAt: "2026-04-03T07:30:00.000Z" },
  { id: "cb_3", caller: "Dylan White", practice: "San Jose Dental", reason: "Insurance verification callback", status: "escalated", priority: "low", createdAt: "2026-04-02T18:10:00.000Z" },
];

export const incidents: Incident[] = [
  { id: "inc_1", title: "Emergency", practice: "Mission Peak Dental", severity: "urgent", status: "open", summary: "Post-op swelling and bleeding requires immediate triage." },
  { id: "inc_2", title: "Angry Patient", practice: "San Jose Dental", severity: "high", status: "escalated", summary: "Patient upset about delayed callback after missed call." },
  { id: "inc_3", title: "Billing Issue", practice: "Mission Peak Dental", severity: "medium", status: "resolved", summary: "Coverage confusion resolved via support team." },
];

export const events: ActivityEvent[] = [
  { id: "evt_1", type: "call_completed", title: "Call completed", subtitle: "San Jose Dental", practice: "San Jose Dental", occurredAt: "2026-04-03T08:12:00.000Z" },
  { id: "evt_2", type: "callback_created", title: "Callback created", subtitle: "John Smith", practice: "San Jose Dental", occurredAt: "2026-04-03T08:13:00.000Z" },
  { id: "evt_3", type: "sms_sent", title: "SMS sent", subtitle: "Missed call recovery", practice: "Mission Peak Dental", occurredAt: "2026-04-03T07:31:00.000Z" },
  { id: "evt_4", type: "incident_created", title: "Incident created", subtitle: "Emergency", practice: "Mission Peak Dental", occurredAt: "2026-04-03T07:45:00.000Z" },
  { id: "evt_5", type: "integration_triggered", title: "Integration triggered", subtitle: "Slack alert", practice: "Mission Peak Dental", occurredAt: "2026-04-03T07:45:30.000Z" },
];

export const messages: MessageThread[] = [
  {
    id: "msg_1",
    patient: "John Smith",
    practice: "San Jose Dental",
    channel: "sms",
    messages: [
      { id: "m1", sender: "ai", body: "Hi, we missed your call and can help you schedule.", timestamp: "8:14 AM" },
      { id: "m2", sender: "patient", body: "Yes I need an appointment for a cracked tooth.", timestamp: "8:15 AM" },
      { id: "m3", sender: "ai", body: "Understood. A coordinator will follow up shortly.", timestamp: "8:15 AM" },
    ],
  },
];

export const automations: Automation[] = [
  { id: "auto_1", name: "Missed Call Recovery", description: "Sends follow-up SMS after missed inbound calls.", enabled: true, status: "healthy" },
  { id: "auto_2", name: "After Hours Receptionist", description: "Routes after-hours calls into intake and escalation workflows.", enabled: true, status: "healthy" },
  { id: "auto_3", name: "Callback Followups", description: "Creates reminders for open callbacks past SLA.", enabled: true, status: "warning" },
  { id: "auto_4", name: "Escalation Rules", description: "Escalates urgent signals to internal teams.", enabled: false, status: "warning" },
];

export const routingRules: RoutingRule[] = [
  { id: "rule_1", name: "Urgent call alert", trigger: "call.completed", condition: "urgency = urgent", action: "Send Slack alert", enabled: true },
  { id: "rule_2", name: "Callback creation", trigger: "call.completed", condition: "callbackNeeded = true", action: "Create callback task", enabled: true },
  { id: "rule_3", name: "After-hours reply escalation", trigger: "messaging.inbound_reply", condition: "business hours = false", action: "Escalate to operator", enabled: true },
];

export const integrations: Integration[] = [
  { id: "int_1", capabilityKey: "sms", name: "Twilio", status: "connected", provider: "twilio_managed", description: "Voice and SMS transport.", config: { sender_number: null, reply_to_phone: "+14085550100", brand_name: "San Jose Dental" } },
  { id: "int_2", capabilityKey: "internal_alert", name: "Slack", status: "connected", provider: "slack_webhook", description: "Internal alerts and escalation delivery.", config: { slack_webhook_url: "configured" } },
  { id: "int_3", capabilityKey: "crm", name: "Hubspot", status: "not_connected", provider: "hubspot", description: "CRM sync for leads and callback outcomes.", config: {} },
  { id: "int_4", capabilityKey: "crm", name: "GoHighLevel", status: "not_connected", provider: "go_high_level", description: "Alternative CRM and nurture workflows.", config: {} },
  { id: "int_5", capabilityKey: "internal_alert", name: "Email", status: "connected", provider: "email_digest", description: "Operational summaries and fallback alerts.", config: { alert_email: "ops@example.com" } },
];

export const analytics: AnalyticsPoint[] = [
  { label: "Mon", calls: 44, missed: 9, callbacks: 12, conversion: 48 },
  { label: "Tue", calls: 51, missed: 8, callbacks: 11, conversion: 53 },
  { label: "Wed", calls: 63, missed: 10, callbacks: 14, conversion: 57 },
  { label: "Thu", calls: 58, missed: 7, callbacks: 10, conversion: 59 },
  { label: "Fri", calls: 69, missed: 11, callbacks: 15, conversion: 61 },
];

export const dashboardSummary: DashboardSummary = {
  callsToday: 63,
  missedCalls: 8,
  openCallbacks: 12,
  incidents: 3,
  activeAutomations: 3,
};
