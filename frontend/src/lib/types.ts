export type Practice = {
  id: string;
  name: string;
  phoneNumbers: string[];
  hours: string;
  services: string[];
  locations: number;
  address: string;
  website: string;
  emergencyNumber: string;
  insuranceSummary: string;
  sameDayEmergencyPolicy: string;
  languages: string;
  schedulingMode: string;
  insuranceMode: string;
  missedCallRecoveryEnabled: boolean;
  missedCallRecoveryMessage: string;
  callbackSlaMinutes: number;
};

export type AssistantContext = {
  practiceId: string;
  practiceName: string;
  routingNumber: string | null;
  routingMode: string | null;
  routingActive: boolean;
  routingReason: string;
  variableValues: Array<{ label: string; value: string }>;
};

export type SetupChecklistItem = {
  key: string;
  label: string;
  completed: boolean;
  detail: string;
};

export type SetupPhoneNumber = {
  id: string;
  phoneNumber: string;
  label: string;
  isPrimary: boolean;
  routingMode: string;
  forwardToNumber: string | null;
  voiceEnabled: boolean;
  smsEnabled: boolean;
};

export type ActivityEvent = {
  id: string;
  type: "call_completed" | "callback_created" | "incident_created" | "sms_sent" | "integration_triggered";
  title: string;
  subtitle: string;
  practice: string;
  occurredAt: string;
};

export type Call = {
  id: string;
  caller: string;
  phone: string;
  practice: string;
  practiceId: string;
  time: string;
  duration: string;
  outcome: string;
  callbackNeeded: boolean;
  incident: boolean;
  callbackStatus: "open" | "resolved";
  incidentStatus: "open" | "resolved";
  transcriptAvailable: boolean;
  transcript: string;
  summary: string;
  staffNote: string;
  recordingUrl: string;
  recordingStatus: "available" | "not_available";
  structuredOutput: Array<{ label: string; value: string }>;
  automationEvents: string[];
  repeatCallerCount: number;
  endedReason: string;
  recentRelatedCalls: Array<{
    id: string;
    caller: string;
    phone: string;
    createdAt: string;
    summary: string;
  }>;
};

export type Callback = {
  id: string;
  caller: string;
  phone: string;
  practice: string;
  reason: string;
  status: "open" | "completed" | "escalated";
  priority: "high" | "medium" | "low";
  createdAt: string;
  assignedTo?: string;
  internalNotes?: string;
  outcome?: string;
  dueNote?: string;
};

export type Incident = {
  id: string;
  title: string;
  practice: string;
  severity: "urgent" | "high" | "medium";
  status: "open" | "resolved" | "escalated";
  summary: string;
  details?: string;
  createdAt?: string;
  resolvedAt?: string | null;
};

export type MessageThread = {
  id: string;
  patient: string;
  phone?: string;
  practice: string;
  channel: "sms";
  lastMessageAt?: string;
  status?: "waiting" | "needs_reply" | "closed";
  triggerLabel?: string;
  messages: Array<{ id: string; sender: "ai" | "patient"; body: string; timestamp: string }>;
};

export type Automation = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  status: "healthy" | "warning";
};

export type RoutingRule = {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
};

export type Integration = {
  id: string;
  capabilityKey: string;
  name: string;
  status: "connected" | "not_connected";
  provider: string;
  description: string;
  config?: Record<string, unknown>;
};

export type AnalyticsPoint = {
  label: string;
  calls: number;
  missed: number;
  callbacks: number;
  conversion: number;
};

export type DashboardSummary = {
  callsToday: number;
  missedCalls: number;
  openCallbacks: number;
  incidents: number;
  activeAutomations: number;
};

export type SetupWorkspace = {
  practice: Practice;
  assistantContext: AssistantContext;
  checklist: SetupChecklistItem[];
  integrations: Integration[];
  routingRules: RoutingRule[];
  phoneNumbers: SetupPhoneNumber[];
  recentActivity: ActivityEvent[];
};

export type SetupWorkspaceOptions = {
  practiceId?: string;
  currentTime?: string;
};
