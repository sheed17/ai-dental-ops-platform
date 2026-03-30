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
