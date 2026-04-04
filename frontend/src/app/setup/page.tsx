"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, Copy, PhoneCall, ShieldCheck, Siren, MessageSquareMore } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

const HOUR_PRESETS = [
  "Mon-Fri, 8:00 AM - 5:00 PM",
  "Mon-Fri, 7:30 AM - 4:30 PM",
  "Mon-Thu, 8:00 AM - 6:00 PM",
  "Mon-Sat, 8:00 AM - 5:00 PM",
];

const TEST_TIME_PRESETS = [
  { label: "During hours", value: "2026-04-03T14:00:00-07:00" },
  { label: "After hours", value: "2026-04-03T21:00:00-07:00" },
  { label: "Weekend", value: "2026-04-04T11:00:00-07:00" },
];

const SERVICE_OPTIONS = [
  "General dentistry",
  "Cleanings",
  "Crowns",
  "Bridges",
  "Implants",
  "Root canals",
  "Extractions",
  "Whitening",
  "Veneers",
  "Pediatric dentistry",
  "Orthodontics",
  "Emergency care",
];

const INSURANCE_OPTIONS = [
  "We accept most major PPO plans.",
  "The office verifies exact coverage before treatment.",
  "Coverage questions are reviewed by the team during business hours.",
  "We can note your insurance questions for staff follow-up.",
];

const EMERGENCY_POLICIES = [
  {
    label: "Same-day urgent review",
    value: "Urgent pain, swelling, bleeding, or trauma should be escalated for same-day review.",
  },
  {
    label: "On-call triage",
    value: "After-hours urgent dental concerns should be sent to the on-call team for guidance.",
  },
  {
    label: "ER guidance when severe",
    value: "Severe swelling, uncontrolled bleeding, or breathing concerns should be escalated immediately and may require ER guidance.",
  },
];

const CALLBACK_SLA_OPTIONS = [
  { label: "15 minutes", value: 15, description: "Use when urgent follow-up should happen almost immediately." },
  { label: "30 minutes", value: 30, description: "Use for high-touch offices promising a quick callback." },
  { label: "60 minutes", value: 60, description: "Use for a standard same-morning or same-day callback promise." },
  { label: "120 minutes", value: 120, description: "Use when the office needs a wider response window." },
];

type PracticeUpdatePayload = {
  practice_name?: string;
  office_hours?: string;
  services_summary?: string;
  insurance_summary?: string;
  same_day_emergency_policy?: string;
  scheduling_mode?: string;
  insurance_mode?: string;
  missed_call_recovery_enabled?: boolean;
  missed_call_recovery_message?: string;
  callback_sla_minutes?: number;
};

export default function SetupPage() {
  const queryClient = useQueryClient();
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState(TEST_TIME_PRESETS[1].value);
  const [customService, setCustomService] = useState("");

  const practicesQuery = useQuery({ queryKey: ["practices"], queryFn: api.practices });
  const practiceId = selectedPracticeId || practicesQuery.data?.[0]?.id;

  const setupQuery = useQuery({
    queryKey: ["setup-workspace", practiceId, selectedTime],
    queryFn: () => api.setupWorkspace({ practiceId, currentTime: selectedTime }),
    enabled: Boolean(practiceId),
  });

  const data = setupQuery.data;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["setup-workspace"] });
    queryClient.invalidateQueries({ queryKey: ["practices"] });
  };

  const practiceMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.updatePracticeProfile(data!.practice.id, payload),
    onSuccess: refresh,
  });

  const phoneMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.updatePhoneNumber(id, payload),
    onSuccess: refresh,
  });

  if (!data) {
    return null;
  }

  const primaryNumber = data.phoneNumbers.find((item) => item.isPrimary) || data.phoneNumbers[0];
  const selectedServices = data.practice.services;
  const currentInsuranceLines = splitSummary(data.practice.insuranceSummary);

  const callbackSla = CALLBACK_SLA_OPTIONS.find((item) => item.value === data.practice.callbackSlaMinutes);

  const savePractice = (payload: PracticeUpdatePayload) => practiceMutation.mutate(payload);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Setup"
        description="Switch between practices, preview the live voice behavior, and configure after-hours voice separately from missed-call recovery."
      />

      <Card className="p-6">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr_1.2fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Practice</div>
            <select
              value={practiceId}
              onChange={(event) => setSelectedPracticeId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              {practicesQuery.data?.map((practice) => (
                <option key={practice.id} value={practice.id}>
                  {practice.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Test this setup as if it were</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEST_TIME_PRESETS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedTime(item.value)}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    selectedTime === item.value
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Would the receptionist answer now?</div>
                <div className="mt-2 flex items-center gap-3">
                  <StatusBadge value={data.assistantContext.routingActive ? "connected" : "not_connected"} />
                  <div className="text-sm font-medium text-slate-900">
                    {data.assistantContext.routingActive ? "Yes, routing is active" : "No, routing is paused"}
                  </div>
                </div>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {data.assistantContext.routingMode?.replaceAll("_", " ") || "not set"}
              </div>
            </div>
            <div className="mt-3 text-sm leading-7 text-slate-600">{data.assistantContext.routingReason}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          icon={<PhoneCall className="h-5 w-5 text-slate-500" />}
          step="1. Live voice setup"
          title="Show the real number to forward to and when it should answer"
          description="This is the only number the practice needs for the after-hours receptionist."
        >
          {primaryNumber ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Forward after-hours calls to</div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="text-3xl font-semibold tracking-tight text-slate-950">{primaryNumber.phoneNumber}</div>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await navigator.clipboard.writeText(primaryNumber.phoneNumber);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy number
                  </Button>
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  You can call this number directly right now to hear the current practice setup without needing a real office number.
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <OptionCard
                  title="When should it answer?"
                  description="Choose the live voice behavior for this number."
                >
                  <select
                    value={primaryNumber.routingMode}
                    onChange={(event) =>
                      phoneMutation.mutate({
                        id: primaryNumber.id,
                        payload: {
                          label: primaryNumber.label,
                          is_primary: primaryNumber.isPrimary,
                          routing_mode: event.target.value,
                          forward_to_number: primaryNumber.forwardToNumber,
                          voice_enabled: primaryNumber.voiceEnabled,
                          sms_enabled: primaryNumber.smsEnabled,
                        },
                      })
                    }
                    className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  >
                    <option value="after_hours_only">After hours only</option>
                    <option value="always_forward">Always answer</option>
                    <option value="business_hours_only">Business hours only</option>
                  </select>
                </OptionCard>

                <OptionCard
                  title="Office number being forwarded"
                  description="Optional for now, but this is where the real office line would point later."
                >
                  <SaveField
                    defaultValue={primaryNumber.forwardToNumber || ""}
                    placeholder="Practice office number"
                    buttonLabel="Save office number"
                    saving={phoneMutation.isPending}
                    onSave={(value) =>
                      phoneMutation.mutate({
                        id: primaryNumber.id,
                        payload: {
                          label: primaryNumber.label,
                          is_primary: primaryNumber.isPrimary,
                          routing_mode: primaryNumber.routingMode,
                          forward_to_number: value,
                          voice_enabled: primaryNumber.voiceEnabled,
                          sms_enabled: primaryNumber.smsEnabled,
                        },
                      })
                    }
                  />
                </OptionCard>
              </div>
            </div>
          ) : (
            <EmptyState text="No managed receptionist number is assigned to this practice yet." />
          )}
        </SectionCard>

        <SectionCard
          icon={<Bot className="h-5 w-5 text-slate-500" />}
          step="2. What callers will hear"
          title="Use presets for common dental offices, then customize only what is unique"
          description="The assistant preview on the right is driven by these settings."
        >
          <div className="space-y-5">
            <OptionCard title="Office hours" description="Use a clean schedule format so routing and voice behavior stay predictable.">
              <select
                value={data.practice.hours}
                onChange={(event) => savePractice({ office_hours: event.target.value })}
                className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                {HOUR_PRESETS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </OptionCard>

            <OptionCard title="Language" description="For now the receptionist voice is English-only.">
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                English
              </div>
            </OptionCard>

            <OptionCard title="Services" description="Select the dental services this practice actually offers. Add one custom service if needed.">
              <div className="mt-3 flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((service) => (
                  <SelectableChip
                    key={service}
                    active={selectedServices.includes(service)}
                    label={service}
                    onClick={() => {
                      const next = toggleString(selectedServices, service);
                      savePractice({ services_summary: next.join(", ") });
                    }}
                  />
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  value={customService}
                  onChange={(event) => setCustomService(event.target.value)}
                  placeholder="Add custom service"
                  className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!customService.trim()) return;
                    const next = toggleString(selectedServices, customService.trim(), true);
                    savePractice({ services_summary: next.join(", ") });
                    setCustomService("");
                  }}
                >
                  Add
                </Button>
              </div>
            </OptionCard>

            <OptionCard title="Insurance guidance" description="Pick the statements the receptionist can safely repeat.">
              <div className="mt-3 space-y-2">
                {INSURANCE_OPTIONS.map((item) => (
                  <CheckboxRow
                    key={item}
                    checked={currentInsuranceLines.includes(item)}
                    label={item}
                    onChange={() => {
                      const next = toggleString(currentInsuranceLines, item);
                      savePractice({ insurance_summary: next.join(" ") });
                    }}
                  />
                ))}
              </div>
            </OptionCard>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          icon={<Siren className="h-5 w-5 text-slate-500" />}
          step="3. Urgent handling"
          title="Decide how after-hours urgency should be explained and escalated"
          description="This is the piece most practices will need help choosing, so keep it plain and prescriptive."
        >
          <OptionCard
            title="Same-day emergency policy"
            description="Choose the guidance that best matches the office’s real after-hours process."
          >
            <div className="mt-3 space-y-3">
              {EMERGENCY_POLICIES.map((policy) => (
                <ChoiceRow
                  key={policy.value}
                  active={data.practice.sameDayEmergencyPolicy === policy.value}
                  label={policy.label}
                  description={policy.value}
                  onClick={() => savePractice({ same_day_emergency_policy: policy.value })}
                />
              ))}
            </div>
          </OptionCard>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <OptionCard
              title="Scheduling behavior"
              description="This controls how assertive the receptionist is when callers ask to book."
            >
              <select
                value={data.practice.schedulingMode}
                onChange={(event) => savePractice({ scheduling_mode: event.target.value })}
                className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="message_only">Capture intent and promise a follow-up</option>
                <option value="availability_assist">Guide the request and collect booking details</option>
              </select>
            </OptionCard>

            <OptionCard
              title="Insurance behavior"
              description="Plan lookup is only a workflow label right now, so keep the guidance general until a live lookup exists."
            >
              <select
                value={data.practice.insuranceMode}
                onChange={(event) => savePractice({ insurance_mode: event.target.value })}
                className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="generic">General office guidance only</option>
                <option value="plan_lookup">Flag insurance questions for staff follow-up</option>
              </select>
            </OptionCard>
          </div>
        </SectionCard>

        <SectionCard
          icon={<MessageSquareMore className="h-5 w-5 text-slate-500" />}
          step="4. Missed-call recovery"
          title="Configure the daytime fallback separately from the live receptionist"
          description="This is a different service: someone missed the call, and the system follows up after the fact."
        >
          <OptionCard
            title="Missed-call recovery status"
            description="Turn this on if you want the system ready to send a recovery text once Twilio is live."
          >
            <div className="mt-3 flex items-center justify-between gap-4">
              <StatusBadge value={data.practice.missedCallRecoveryEnabled ? "connected" : "not_connected"} />
              <Button
                variant={data.practice.missedCallRecoveryEnabled ? "secondary" : "default"}
                onClick={() => savePractice({ missed_call_recovery_enabled: !data.practice.missedCallRecoveryEnabled })}
              >
                {data.practice.missedCallRecoveryEnabled ? "Enabled" : "Enable"}
              </Button>
            </div>
          </OptionCard>

          <OptionCard
            title="Recovery message"
            description="This is the message the system will use for missed-call follow-up once transport is active."
          >
            <SaveArea
              defaultValue={data.practice.missedCallRecoveryMessage}
              saving={practiceMutation.isPending}
              onSave={(value) => savePractice({ missed_call_recovery_message: value })}
            />
          </OptionCard>

          <OptionCard
            title="Callback SLA"
            description={callbackSla?.description || "How quickly the office promises to follow up on an open callback."}
          >
            <select
              value={String(data.practice.callbackSlaMinutes)}
              onChange={(event) => savePractice({ callback_sla_minutes: Number(event.target.value) })}
              className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              {CALLBACK_SLA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </OptionCard>
        </SectionCard>
      </div>

      <SectionCard
        icon={<CheckCircle2 className="h-5 w-5 text-slate-500" />}
        step="5. Test it now"
        title="Use the managed number directly"
        description="You do not need a real office number to hear the behavior. Just call the receptionist number itself."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TestStep
            title="Direct number test"
            body={`Call ${data.assistantContext.routingNumber || "the managed receptionist number"} directly. The agent should use the current practice identity and policies.`}
          />
          <TestStep
            title="Time-window test"
            body="Use the test-time selector at the top. If the preview says routing is paused, a real call at that time should not use the after-hours path."
          />
          <TestStep
            title="Multiple practices"
            body="Assign each practice its own managed number. Calling Number A should give Practice A behavior, and Number B should give Practice B behavior."
          />
          <TestStep
            title="Compliance reminder"
            body="Treat this as HIPAA-oriented setup, not a marketing claim. Keep office guidance factual and limit unnecessary patient detail."
          />
        </div>
      </SectionCard>

      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-100 p-2">
            <ShieldCheck className="h-5 w-5 text-slate-500" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Assistant preview</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">What this practice will actually send to the voice layer</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.assistantContext.variableValues.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-700">{item.value || "Not set"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SectionCard({
  icon,
  step,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-100 p-2">{icon}</div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{step}</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </Card>
  );
}

function OptionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-1 text-sm leading-7 text-slate-600">{description}</div>
      {children}
    </div>
  );
}

function SaveField({
  defaultValue,
  placeholder,
  buttonLabel,
  saving,
  onSave,
}: {
  defaultValue: string;
  placeholder?: string;
  buttonLabel: string;
  saving: boolean;
  onSave: (value: string) => void;
}) {
  return (
    <div className="mt-3 flex gap-2">
      <input
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
      />
      <Button
        variant="secondary"
        onClick={(event) => {
          const input = event.currentTarget.parentElement?.querySelector("input");
          onSave(input instanceof HTMLInputElement ? input.value : defaultValue);
        }}
        disabled={saving}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

function SaveArea({
  defaultValue,
  saving,
  onSave,
}: {
  defaultValue: string;
  saving: boolean;
  onSave: (value: string) => void;
}) {
  return (
    <>
      <textarea
        defaultValue={defaultValue}
        className="mt-3 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900"
      />
      <div className="mt-3">
        <Button
          variant="secondary"
          onClick={(event) => {
            const area = event.currentTarget.parentElement?.parentElement?.querySelector("textarea");
            onSave(area instanceof HTMLTextAreaElement ? area.value : defaultValue);
          }}
          disabled={saving}
        >
          Save message
        </Button>
      </div>
    </>
  );
}

function SelectableChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-sm transition ${
        active ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function CheckboxRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-1 h-4 w-4" />
      <span className="text-sm leading-6 text-slate-700">{label}</span>
    </label>
  );
}

function ChoiceRow({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
      }`}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className={`mt-2 text-sm leading-7 ${active ? "text-slate-100" : "text-slate-600"}`}>{description}</div>
    </button>
  );
}

function TestStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-600">{body}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">{text}</div>;
}

function toggleString(list: string[], value: string, forceAdd = false) {
  const normalized = value.trim();
  if (!normalized) return list;
  const exists = list.includes(normalized);
  if (exists && !forceAdd) {
    return list.filter((item) => item !== normalized);
  }
  if (exists) {
    return list;
  }
  return [...list, normalized];
}

function splitSummary(text: string) {
  return text
    .split(/(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
