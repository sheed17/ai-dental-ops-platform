export type Incident = {
  id: string;
  incident_type: string;
  severity: string;
  status: string;
  summary: string;
  details: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type CallbackTask = {
  id: string;
  status: string;
  priority: string;
  callback_name: string | null;
  callback_phone: string | null;
  reason: string;
  due_note: string | null;
  assigned_to: string | null;
  internal_notes: string | null;
  outcome: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type CallbackTaskUpdate = {
  status: string;
  assigned_to?: string | null;
  internal_notes?: string | null;
  outcome?: string | null;
};

export type CallArtifact = {
  id: string;
  artifact_type: string;
  url: string | null;
  metadata_json: Record<string, unknown> | null;
};

export type StructuredOutput = {
  id: string;
  field_name: string;
  value_text: string | null;
  value_bool: boolean | null;
  value_json: Record<string, unknown> | null;
};

export type Call = {
  id: string;
  practice_id: string;
  vapi_call_id: string | null;
  caller_name: string | null;
  caller_phone: string | null;
  disposition: string;
  urgency: string;
  reason_for_call: string | null;
  message_for_staff: string | null;
  call_summary: string | null;
  needs_callback: boolean;
  needs_incident: boolean;
  review_status: string;
  transcript: string | null;
  recording_url: string | null;
  duration_seconds: number | null;
  ended_reason: string | null;
  created_at: string;
  incidents: Incident[];
  callback_tasks: CallbackTask[];
  artifacts: CallArtifact[];
  structured_outputs: StructuredOutput[];
  repeat_caller_count?: number;
  recent_related_calls?: CallListItem[];
};

export type Practice = {
  id: string;
  practice_name: string;
  office_hours: string;
  address: string;
  website: string;
  emergency_number: string;
  services_summary: string;
  insurance_summary: string;
  same_day_emergency_policy: string;
  languages: string;
  scheduling_mode: string;
  insurance_mode: string;
  missed_call_recovery_enabled: boolean;
  missed_call_recovery_message: string | null;
  callback_sla_minutes: number;
};

export type CallListItem = {
  id: string;
  caller_name: string | null;
  caller_phone: string | null;
  disposition: string;
  urgency: string;
  call_summary: string | null;
  created_at: string;
};

export type DashboardSummary = {
  recent_calls: Call[];
  urgent_incidents: Incident[];
  open_callback_tasks: CallbackTask[];
  overdue_callback_tasks: CallbackTask[];
  repeat_callers: CallListItem[];
  practices: Practice[];
};

export type IntegrationCatalogItem = {
  key: string;
  label: string;
  ownership: string;
  description: string;
  supported_providers: string[];
  default_provider: string;
  onboarding_fields: string[];
};

export type PracticeIntegrationSetting = {
  id: string;
  practice_id: string;
  capability_key: string;
  is_enabled: boolean;
  provider: string;
  config: Record<string, unknown>;
};

export type OnboardingChecklistItem = {
  key: string;
  label: string;
  completed: boolean;
  detail: string;
};

export type OnboardingOverview = {
  practice_id: string;
  practice_name: string;
  completed_steps: number;
  total_steps: number;
  checklist: OnboardingChecklistItem[];
};

export type OperationFeedItem = {
  id: string;
  occurred_at: string;
  item_type: string;
  title: string;
  detail: string | null;
  status: string | null;
  severity: string | null;
  related_call_id: string | null;
};

export type RoutingRule = {
  id: string;
  practice_id: string;
  name: string;
  trigger_event: string;
  condition_json: Record<string, unknown> | null;
  action_json: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
};

export type RoutingRuleUpdate = {
  name: string;
  trigger_event: string;
  condition_json?: Record<string, unknown> | null;
  action_json: Record<string, unknown>;
  is_enabled: boolean;
};

export type PracticeSettingsUpdate = {
  scheduling_mode: string;
  insurance_mode: string;
  missed_call_recovery_enabled: boolean;
  missed_call_recovery_message?: string | null;
  callback_sla_minutes: number;
};

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function apiMutation<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function getCalls(): Promise<Call[]> {
  return apiFetch<Call[]>("/calls");
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>("/dashboard/summary");
}

export async function getCall(callId: string): Promise<Call> {
  return apiFetch<Call>(`/calls/${callId}`);
}

export async function getCallbackTasks(): Promise<CallbackTask[]> {
  return apiFetch<CallbackTask[]>("/callback-tasks");
}

export async function getIncidents(): Promise<Incident[]> {
  return apiFetch<Incident[]>("/incidents");
}

export async function getPracticeSettings(): Promise<Practice[]> {
  return apiFetch<Practice[]>("/practice-settings");
}

export async function getIntegrationCatalog(): Promise<IntegrationCatalogItem[]> {
  return apiFetch<IntegrationCatalogItem[]>("/integrations/catalog");
}

export async function getPracticeIntegrations(practiceId: string): Promise<PracticeIntegrationSetting[]> {
  return apiFetch<PracticeIntegrationSetting[]>(`/practices/${practiceId}/integrations`);
}

export async function getOnboardingOverview(practiceId: string): Promise<OnboardingOverview> {
  return apiFetch<OnboardingOverview>(`/practices/${practiceId}/onboarding`);
}

export async function getOperationsFeed(): Promise<OperationFeedItem[]> {
  return apiFetch<OperationFeedItem[]>("/operations/feed");
}

export async function getRoutingRules(practiceId: string): Promise<RoutingRule[]> {
  return apiFetch<RoutingRule[]>(`/practices/${practiceId}/routing-rules`);
}

export async function performCallAction(callId: string, action: string, note?: string): Promise<Record<string, unknown>> {
  return apiMutation<Record<string, unknown>>(`/calls/${callId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action, note }),
  });
}

export async function updateCallbackTask(taskId: string, payload: CallbackTaskUpdate): Promise<CallbackTask> {
  return apiMutation<CallbackTask>(`/callback-tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateRoutingRule(
  practiceId: string,
  ruleId: string,
  payload: RoutingRuleUpdate,
): Promise<RoutingRule> {
  return apiMutation<RoutingRule>(`/practices/${practiceId}/routing-rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updatePracticeSettings(
  practiceId: string,
  payload: PracticeSettingsUpdate,
): Promise<Practice> {
  return apiMutation<Practice>(`/practice-settings/${practiceId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
