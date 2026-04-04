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
  SetupWorkspace,
  SetupWorkspaceOptions,
} from "@/lib/types";

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }
  return response.json() as Promise<T>;
}

async function apiMutation<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Failed request ${path}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  dashboard: () => apiFetch<DashboardSummary>("/api/dashboard"),
  calls: () => apiFetch<Call[]>("/api/calls"),
  call: (id: string) => apiFetch<Call>(`/api/calls/${id}`),
  callbacks: () => apiFetch<Callback[]>("/api/callbacks"),
  updateCallback: (id: string, payload: Record<string, unknown>) =>
    apiMutation<Callback>(`/api/callbacks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  incidents: () => apiFetch<Incident[]>("/api/incidents"),
  resolveIncident: (id: string) =>
    apiMutation<Incident>(`/api/incidents/${id}/resolve`, {
      method: "POST",
    }),
  events: () => apiFetch<ActivityEvent[]>("/api/events"),
  practices: () => apiFetch<Practice[]>("/api/practices"),
  messages: () => apiFetch<MessageThread[]>("/api/messages"),
  automations: () => apiFetch<Automation[]>("/api/automation"),
  routingRules: () => apiFetch<RoutingRule[]>("/api/routing-rules"),
  integrations: () => apiFetch<Integration[]>("/api/integrations"),
  analytics: () => apiFetch<AnalyticsPoint[]>("/api/analytics"),
  setupWorkspace: (options?: SetupWorkspaceOptions) => {
    const query = new URLSearchParams();
    if (options?.practiceId) {
      query.set("practiceId", options.practiceId);
    }
    if (options?.currentTime) {
      query.set("currentTime", options.currentTime);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<SetupWorkspace>(`/api/setup/workspace${suffix}`);
  },
  updatePracticeProfile: (practiceId: string, payload: Record<string, unknown>) =>
    apiMutation(`/api/setup/practice/${practiceId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  updatePhoneNumber: (phoneNumberId: string, payload: Record<string, unknown>) =>
    apiMutation(`/api/setup/phone-numbers/${phoneNumberId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateIntegration: (capabilityKey: string, payload: Record<string, unknown>) =>
    apiMutation(`/api/setup/integrations/${capabilityKey}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updateRoutingRule: (ruleId: string, payload: Record<string, unknown>) =>
    apiMutation(`/api/setup/routing-rules/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
