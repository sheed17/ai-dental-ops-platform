"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, ChevronRight, PhoneCall, Send, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

function routingModeLabel(value: string) {
  if (value === "always_forward") return "Always forward";
  if (value === "business_hours_only") return "Business hours only";
  if (value === "after_hours_only") return "After hours only";
  return value.replaceAll("_", " ");
}

export default function SetupPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["setup-workspace"], queryFn: api.setupWorkspace });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["setup-workspace"] });

  const phoneMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.updatePhoneNumber(id, payload),
    onSuccess: refresh,
  });

  const integrationMutation = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: Record<string, unknown> }) => api.updateIntegration(key, payload),
    onSuccess: refresh,
  });

  const ruleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.updateRoutingRule(id, payload),
    onSuccess: refresh,
  });

  if (!data) return null;

  const smsIntegration = data.integrations.find((item) => item.capabilityKey === "sms");
  const alertIntegration = data.integrations.find((item) => item.capabilityKey === "internal_alert");
  const primaryNumber = data.phoneNumbers.find((item) => item.isPrimary) || data.phoneNumbers[0];
  const completedChecks = data.checklist.filter((item) => item.completed).length;

  return (
    <div>
      <PageHeader
        title="Setup"
        description="This is the go-live control room. The goal is to make after-hours calling behavior obvious now, so when Twilio approval lands the system is already ready."
      />

      <div className="grid gap-6">
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#93c5fd_100%)] p-0 text-white shadow-lg">
            <div className="grid gap-8 p-8 lg:grid-cols-[1fr_360px]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80">Step 3</div>
                <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight">
                  Forward your calls and go live.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-50/90">
                  The business line forwards to your AI number, the receptionist answers after hours, callback and incident workflows run automatically, and the team stays in the loop.
                </p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3 text-sm text-blue-50">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Get your AI number configured before Twilio approval completes.</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-blue-50">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Decide when forwarding happens: always, during business hours, or after hours only.</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-blue-50">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Make sure SMS and internal alerts are ready so no urgent call disappears into the void.</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] bg-white/90 p-5 text-slate-900 shadow-xl backdrop-blur">
                <div className="rounded-[22px] bg-[linear-gradient(135deg,#c7f9cc_0%,#60a5fa_100%)] p-5 text-white">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-white/80">Your AI Number</div>
                  <div className="mt-3 text-3xl font-semibold">{primaryNumber?.phoneNumber || "Not assigned"}</div>
                  <div className="mt-2 text-sm text-white/90">
                    {primaryNumber ? `${routingModeLabel(primaryNumber.routingMode)} routing` : "Add and configure a primary number"}
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Forwarding flow</div>
                  <div className="mt-4 grid gap-3">
                    <div className="flex items-center justify-between rounded-xl bg-white p-3">
                      <div>
                        <div className="text-xs text-slate-500">Your Business</div>
                        <div className="font-medium text-slate-950">{primaryNumber?.forwardToNumber || "(set your business line)"}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                      <div className="text-right">
                        <div className="text-xs text-slate-500">AI Receptionist</div>
                        <div className="font-medium text-slate-950">{primaryNumber?.phoneNumber || "Not assigned"}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                      <div className="rounded-xl bg-white p-3">AI answers</div>
                      <div className="rounded-xl bg-white p-3">Summaries & callbacks</div>
                      <div className="rounded-xl bg-white p-3">Alerts if urgent</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Go-live readiness</div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {completedChecks}/{data.checklist.length || 0}
            </div>
            <div className="mt-2 text-sm text-slate-500">checks complete for {data.practice.name}</div>
            <div className="mt-6 space-y-3">
              {data.checklist.map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                  <div>
                    <div className="font-medium text-slate-950">{item.label}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</div>
                  </div>
                  <StatusBadge value={item.completed ? "connected" : "not_connected"} />
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <PhoneCall className="h-5 w-5 text-slate-500" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Number routing</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">Forwarding plan</div>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-500">Set the exact calling behavior before carrier review finishes.</div>
            <div className="mt-5 space-y-4">
              {data.phoneNumbers.map((number) => (
                <div key={number.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-950">{number.phoneNumber}</div>
                      <div className="mt-1 text-sm text-slate-500">{number.label}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {number.isPrimary ? <StatusBadge value="connected" /> : null}
                      <StatusBadge value={number.voiceEnabled ? "healthy" : "warning"} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      <div className="mb-2 font-medium">Routing mode</div>
                      <select
                        value={number.routingMode}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                        onChange={(event) =>
                          phoneMutation.mutate({
                            id: number.id,
                            payload: {
                              label: number.label,
                              is_primary: number.isPrimary,
                              routing_mode: event.target.value,
                              forward_to_number: number.forwardToNumber,
                              voice_enabled: number.voiceEnabled,
                              sms_enabled: number.smsEnabled,
                            },
                          })
                        }
                      >
                        <option value="always_forward">{routingModeLabel("always_forward")}</option>
                        <option value="business_hours_only">{routingModeLabel("business_hours_only")}</option>
                        <option value="after_hours_only">{routingModeLabel("after_hours_only")}</option>
                      </select>
                    </label>
                    <label className="text-sm text-slate-600">
                      <div className="mb-2 font-medium">Business line to forward</div>
                      <input
                        defaultValue={number.forwardToNumber || ""}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                        onBlur={(event) =>
                          phoneMutation.mutate({
                            id: number.id,
                            payload: {
                              label: number.label,
                              is_primary: number.isPrimary,
                              routing_mode: number.routingMode,
                              forward_to_number: event.target.value,
                              voice_enabled: number.voiceEnabled,
                              sms_enabled: number.smsEnabled,
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        phoneMutation.mutate({
                          id: number.id,
                          payload: {
                            label: number.label,
                            is_primary: true,
                            routing_mode: number.routingMode,
                            forward_to_number: number.forwardToNumber,
                            voice_enabled: number.voiceEnabled,
                            sms_enabled: number.smsEnabled,
                          },
                        })
                      }
                    >
                      Make primary
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        phoneMutation.mutate({
                          id: number.id,
                          payload: {
                            label: number.label,
                            is_primary: number.isPrimary,
                            routing_mode: number.routingMode,
                            forward_to_number: number.forwardToNumber,
                            voice_enabled: !number.voiceEnabled,
                            sms_enabled: number.smsEnabled,
                          },
                        })
                      }
                    >
                      Voice {number.voiceEnabled ? "on" : "off"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        phoneMutation.mutate({
                          id: number.id,
                          payload: {
                            label: number.label,
                            is_primary: number.isPrimary,
                            routing_mode: number.routingMode,
                            forward_to_number: number.forwardToNumber,
                            voice_enabled: number.voiceEnabled,
                            sms_enabled: !number.smsEnabled,
                          },
                        })
                      }
                    >
                      SMS {number.smsEnabled ? "on" : "off"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Twilio & messaging readiness</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950">Plug-in checklist</div>
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-medium text-slate-950">SMS provider</div>
                  <div className="mt-2 text-sm text-slate-500">{smsIntegration?.provider || "Not configured"}</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      <div className="mb-2 font-medium">Reply-to phone</div>
                      <input
                        defaultValue={String(smsIntegration?.config?.reply_to_phone || "")}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                        onBlur={(event) =>
                          smsIntegration &&
                          integrationMutation.mutate({
                            key: smsIntegration.capabilityKey,
                            payload: {
                              is_enabled: true,
                              provider: smsIntegration.provider,
                              config: { ...(smsIntegration.config || {}), reply_to_phone: event.target.value },
                            },
                          })
                        }
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      <div className="mb-2 font-medium">Approved sender number</div>
                      <input
                        defaultValue={String(smsIntegration?.config?.sender_number || "")}
                        placeholder="Add once Twilio approval completes"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                        onBlur={(event) =>
                          smsIntegration &&
                          integrationMutation.mutate({
                            key: smsIntegration.capabilityKey,
                            payload: {
                              is_enabled: true,
                              provider: smsIntegration.provider,
                              config: { ...(smsIntegration.config || {}), sender_number: event.target.value || null },
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div>
                      <div className="text-sm font-medium text-slate-950">Twilio transport</div>
                      <div className="mt-1 text-sm text-slate-500">Ready for the approved number to be plugged in.</div>
                    </div>
                    <StatusBadge value={smsIntegration?.status || "not_connected"} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div>
                      <div className="text-sm font-medium text-slate-950">Alert path</div>
                      <div className="mt-1 text-sm text-slate-500">Urgent messages and escalations have a configured destination.</div>
                    </div>
                    <StatusBadge value={alertIntegration?.status || "not_connected"} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Routing and oversight</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950">Rules + live activity</div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {data.routingRules.map((rule) => (
                  <div key={rule.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-950">{rule.name}</div>
                        <div className="mt-2 text-sm text-slate-500">When {rule.trigger}</div>
                        <div className="mt-1 text-sm text-slate-500">If {rule.condition}</div>
                        <div className="mt-1 text-sm text-slate-500">Then {rule.action}</div>
                      </div>
                      <Button
                        variant={rule.enabled ? "secondary" : "default"}
                        onClick={() =>
                          ruleMutation.mutate({
                            id: rule.id,
                            payload: {
                              name: rule.name,
                              trigger_event: rule.trigger,
                              condition_json: rule.condition === "Always" ? null : JSON.parse(rule.condition),
                              action_json: JSON.parse(rule.action),
                              is_enabled: !rule.enabled,
                            },
                          })
                        }
                      >
                        {rule.enabled ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-slate-200 pt-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Bot className="h-4 w-4" />
                  Recent after-hours activity
                </div>
                <div className="space-y-3">
                  {data.recentActivity.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                      <div className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-900" />
                      <div>
                        <div className="text-sm font-medium text-slate-950">{item.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{item.subtitle}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
