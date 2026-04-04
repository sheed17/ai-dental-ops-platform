"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Practice, SetupPhoneNumber } from "@/lib/types";

const HOUR_PRESETS = [
  "Mon-Fri, 8:00 AM - 5:00 PM",
  "Mon-Fri, 7:30 AM - 4:30 PM",
  "Mon-Thu, 8:00 AM - 6:00 PM",
  "Mon-Sat, 8:00 AM - 5:00 PM",
];

const SERVICE_OPTIONS = [
  "General dentistry",
  "Cleanings",
  "Exams",
  "Fillings",
  "Crowns",
  "Bridges",
  "Dentures",
  "Implants",
  "Whitening",
  "Veneers",
  "Emergency dental care",
  "Root canals",
];

const INSURANCE_OPTIONS = [
  {
    label: "Major PPO plans",
    detail: "Tell callers the office accepts most major PPO plans.",
    value: "We accept most major PPO plans.",
  },
  {
    label: "Coverage confirmed later",
    detail: "Explain that exact coverage is verified by staff before treatment.",
    value: "The office confirms exact coverage before treatment.",
  },
  {
    label: "Office-hours review",
    detail: "Set the expectation that detailed insurance questions are answered when the team is back.",
    value: "Insurance questions are reviewed by staff during office hours.",
  },
  {
    label: "Collect for follow-up",
    detail: "Let the receptionist capture insurance questions so the team can call back.",
    value: "We can take insurance questions for follow-up.",
  },
];

const EMERGENCY_POLICIES = [
  {
    label: "On-call team",
    detail: "Urgent pain or swelling should go to the on-call team for same-day guidance.",
    value: "Urgent pain or swelling should be escalated to the on-call team for same-day guidance.",
  },
  {
    label: "Emergency room for severe cases",
    detail: "Trouble breathing, severe swelling, or uncontrolled bleeding should be directed to the ER right away.",
    value: "Severe swelling, uncontrolled bleeding, or breathing issues should be directed to the ER immediately.",
  },
  {
    label: "Use the emergency line",
    detail: "After-hours urgent dental concerns should be directed to the practice emergency line.",
    value: "After-hours urgent dental concerns should be sent to the emergency line for guidance.",
  },
];

type FormState = {
  practiceName: string;
  officeHours: string;
  address: string;
  emergencyNumber: string;
  website: string;
  routingMode: string;
  services: string[];
  insuranceLines: string[];
  emergencyPolicy: string;
};

type UiState = "default" | "dirty" | "saving" | "saved" | "error";

export default function SetupPage() {
  const queryClient = useQueryClient();
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | undefined>(undefined);

  const practicesQuery = useQuery({ queryKey: ["practices"], queryFn: api.practices });
  const practiceId = selectedPracticeId || practicesQuery.data?.[0]?.id;
  const selectedPractice = practicesQuery.data?.find((practice) => practice.id === practiceId) || practicesQuery.data?.[0];

  const setupQuery = useQuery({
    queryKey: ["setup-workspace", practiceId],
    queryFn: () => api.setupWorkspace({ practiceId }),
    enabled: Boolean(practiceId),
  });

  const practiceMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.updatePracticeProfile(practiceId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setup-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["practices"] });
    },
  });

  const phoneMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.updatePhoneNumber(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setup-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["practices"] });
    },
  });

  const data = setupQuery.data;

  const primaryNumber = useMemo(() => {
    if (!data) {
      return undefined;
    }

    return (
      data.phoneNumbers.find((item) => item.isPrimary) ||
      data.phoneNumbers[0] ||
      (selectedPractice?.phoneNumbers[0]
        ? {
            id: "unavailable",
            phoneNumber: selectedPractice.phoneNumbers[0],
            label: "primary",
            isPrimary: true,
            routingMode: data.assistantContext.routingMode || "after_hours_only",
            forwardToNumber: null,
            voiceEnabled: true,
            smsEnabled: true,
          }
        : undefined)
    );
  }, [data, selectedPractice]);

  if (!data || !selectedPractice || !practiceId) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Setup"
        description="Configure the practice details the after-hours receptionist should actually use, then save them in one clear pass."
      />

      <Card className="border-[0.5px] border-slate-200 bg-white p-6 shadow-none">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current practice</div>
          <select
            value={practiceId}
            onChange={(event) => setSelectedPracticeId(event.target.value)}
            className="mt-2 h-11 min-w-[220px] rounded-xl border-[0.5px] border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            {practicesQuery.data?.map((practice) => (
              <option key={practice.id} value={practice.id}>
                {practice.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <SetupEditor
        key={`${selectedPractice.id}-${primaryNumber?.id || "no-number"}`}
        selectedPractice={selectedPractice}
        assistantRoutingMode={data.assistantContext.routingMode || "after_hours_only"}
        primaryNumber={primaryNumber}
        onSavePractice={practiceMutation.mutateAsync}
        onSavePhone={phoneMutation.mutateAsync}
      />
    </div>
  );
}

function SetupEditor({
  selectedPractice,
  assistantRoutingMode,
  primaryNumber,
  onSavePractice,
  onSavePhone,
}: {
  selectedPractice: Practice;
  assistantRoutingMode: string;
  primaryNumber: SetupPhoneNumber | undefined;
  onSavePractice: (payload: Record<string, unknown>) => Promise<unknown>;
  onSavePhone: (payload: { id: string; payload: Record<string, unknown> }) => Promise<unknown>;
}) {
  const initialFormState: FormState = {
    practiceName: selectedPractice.name || "",
    officeHours: selectedPractice.hours || HOUR_PRESETS[0],
    address: selectedPractice.address || "",
    emergencyNumber: selectedPractice.emergencyNumber || "",
    website: selectedPractice.website || "",
    routingMode: primaryNumber?.routingMode || assistantRoutingMode || "after_hours_only",
    services: selectedPractice.services || [],
    insuranceLines: normalizeInsuranceLines(splitInsuranceSummary(selectedPractice.insuranceSummary)),
    emergencyPolicy: selectedPractice.sameDayEmergencyPolicy || EMERGENCY_POLICIES[0].value,
  };

  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [initialState, setInitialState] = useState<FormState>(initialFormState);
  const [uiState, setUiState] = useState<UiState>("default");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [nameError, setNameError] = useState<string | null>(null);

  const selectedServiceCount = formState.services.length;
  const selectedInsuranceCount = formState.insuranceLines.length;
  const forwardingNumber = primaryNumber?.phoneNumber || "No number assigned";
  const hasUnsavedChanges = JSON.stringify(formState) !== JSON.stringify(initialState);
  const badgeState = getBadge(uiState, hasUnsavedChanges);
  const saveHint = getSaveHint(uiState, hasUnsavedChanges);
  const nameHasError = uiState === "error" && Boolean(nameError);

  const handleFieldChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((current) => ({ ...current, [key]: value }));
    if (uiState !== "saving") {
      setUiState("dirty");
    }
    if (key === "practiceName" && nameError) {
      setNameError(null);
      setUiState("dirty");
    }
  };

  const toggleSelectable = (key: "services" | "insuranceLines", value: string) => {
    setFormState((current) => {
      const items = current[key];
      const nextItems = items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
      return { ...current, [key]: nextItems };
    });
    if (uiState !== "saving") {
      setUiState("dirty");
    }
  };

  const handleCopy = async () => {
    if (!forwardingNumber || forwardingNumber === "No number assigned") {
      return;
    }
    await navigator.clipboard.writeText(forwardingNumber);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  const handleSave = async () => {
    if (!formState.practiceName.trim()) {
      setNameError("Practice name is required.");
      setUiState("error");
      return;
    }

    setNameError(null);
    setUiState("saving");
    const saveStart = Date.now();

    try {
      await Promise.all([
        onSavePractice({
          practice_name: formState.practiceName.trim(),
          office_hours: formState.officeHours,
          address: formState.address.trim(),
          emergency_number: formState.emergencyNumber.trim(),
          website: formState.website.trim(),
          services_summary: formState.services.join(", "),
          insurance_summary: formState.insuranceLines.join(" "),
          same_day_emergency_policy: formState.emergencyPolicy,
        }),
        primaryNumber && primaryNumber.id !== "unavailable"
          ? onSavePhone({
              id: primaryNumber.id,
              payload: {
                label: primaryNumber.label,
                is_primary: primaryNumber.isPrimary,
                routing_mode: formState.routingMode,
                forward_to_number: primaryNumber.forwardToNumber,
                voice_enabled: primaryNumber.voiceEnabled,
                sms_enabled: primaryNumber.smsEnabled,
              },
            })
          : Promise.resolve(),
      ]);

      const elapsed = Date.now() - saveStart;
      if (elapsed < 1400) {
        await new Promise((resolve) => window.setTimeout(resolve, 1400 - elapsed));
      }

      setInitialState(formState);
      setUiState("saved");
      window.setTimeout(() => setUiState("default"), 1800);
    } catch {
      setUiState("dirty");
    }
  };

  return (
    <>
      <Card className="border-[0.5px] border-slate-200 bg-white p-6 shadow-none">
        <SectionHeader title="Forwarding banner" badge={badgeState} />
        <div className="mt-4 rounded-2xl border-[0.5px] border-blue-200 bg-blue-50 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">After-hours forward number</div>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-3xl font-semibold tracking-tight text-slate-950">{forwardingNumber}</div>
              <p className="mt-2 text-sm text-slate-600">
                This is the managed receptionist number the practice should forward after-hours calls to.
              </p>
            </div>
            <Button variant="secondary" onClick={handleCopy}>
              {copyState === "copied" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copyState === "copied" ? "Copied" : "Copy number"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-[0.5px] border-slate-200 bg-white p-6 shadow-none">
        <SectionHeader title="Voice agent config" badge={badgeState} />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ReadOnlyTile label="Practice name" value={formState.practiceName || "Not set"} />
          <ReadOnlyTile label="Office hours" value={formState.officeHours || "Not set"} />
          <ReadOnlyTile label="Address" value={formState.address || "Not set"} />
          <ReadOnlyTile label="When it answers" value={formatRoutingLabel(formState.routingMode)} />
        </div>
        <div className="mt-4 max-w-sm">
          <FieldLabel label="When should it answer?" hint="Choose the live voice behavior for the managed receptionist number." />
          <select
            value={formState.routingMode}
            onChange={(event) => handleFieldChange("routingMode", event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border-[0.5px] border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="after_hours_only">After hours only</option>
            <option value="always_forward">Always</option>
            <option value="disabled">Never</option>
          </select>
        </div>
      </Card>

      <Card className="border-[0.5px] border-slate-200 bg-white p-6 shadow-none">
        <SectionHeader title="Core setup" badge={badgeState} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Practice name" hint="Use the exact office name callers should hear after hours." />
            <input
              value={formState.practiceName}
              onChange={(event) => handleFieldChange("practiceName", event.target.value)}
              className={`mt-2 h-11 w-full rounded-xl border-[0.5px] bg-white px-3 text-sm text-slate-900 outline-none transition ${
                nameHasError
                  ? "border-red-400"
                  : uiState === "saved"
                    ? "border-emerald-400"
                    : "border-slate-200 focus:border-slate-400"
              }`}
            />
            {nameHasError ? <div className="mt-2 text-sm text-red-600">{nameError}</div> : null}
          </div>

          <div>
            <FieldLabel label="Office hours" hint="Pick a standard schedule format so callers hear consistent hours." />
            <select
              value={formState.officeHours}
              onChange={(event) => handleFieldChange("officeHours", event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border-[0.5px] border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              {HOUR_PRESETS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel label="Address" hint="Give the main office address the receptionist should share." />
            <input
              value={formState.address}
              onChange={(event) => handleFieldChange("address", event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border-[0.5px] border-slate-200 bg-white px-3 text-sm text-slate-900"
            />
          </div>

          <div>
            <FieldLabel label="Emergency number" hint="Use the office emergency contact the assistant should reference for urgent follow-up." />
            <input
              value={formState.emergencyNumber}
              onChange={(event) => handleFieldChange("emergencyNumber", event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border-[0.5px] border-slate-200 bg-white px-3 text-sm text-slate-900"
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel label="Website" hint="Use the office website callers should be directed to for forms or general info." />
            <input
              value={formState.website}
              onChange={(event) => handleFieldChange("website", event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border-[0.5px] border-slate-200 bg-white px-3 text-sm text-slate-900"
            />
          </div>
        </div>
      </Card>

      <Card className="border-[0.5px] border-slate-200 bg-white p-6 shadow-none">
        <SectionHeader title="Services" badge={badgeState} />
        <div className="mt-2 text-sm text-slate-500">{selectedServiceCount} services selected</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SERVICE_OPTIONS.map((service) => {
            const active = formState.services.includes(service);
            return (
              <ChipButton
                key={service}
                active={active}
                label={service}
                onClick={() => toggleSelectable("services", service)}
              />
            );
          })}
        </div>
      </Card>

      <Card className="border-[0.5px] border-slate-200 bg-white p-6 shadow-none">
        <SectionHeader title="Insurance guidance" badge={badgeState} />
        <div className="mt-2 text-sm text-slate-500">
          {selectedInsuranceCount} insurance guidance {selectedInsuranceCount === 1 ? "option" : "options"} selected
        </div>
        <div className="mt-4 rounded-2xl border-[0.5px] border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">What the receptionist will say</div>
          {formState.insuranceLines.length > 0 ? (
            <div className="mt-3 space-y-2">
              {formState.insuranceLines.map((line) => (
                <div key={line} className="text-sm leading-7 text-slate-700">
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm leading-7 text-slate-700">No insurance guidance selected yet.</div>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {INSURANCE_OPTIONS.map((option) => {
            const active = formState.insuranceLines.includes(option.value);
            return (
              <ChipButton
                key={option.value}
                active={active}
                label={option.label}
                detail={option.detail}
                onClick={() => toggleSelectable("insuranceLines", option.value)}
              />
            );
          })}
        </div>
      </Card>

      <Card className="border-[0.5px] border-slate-200 bg-white p-6 shadow-none">
        <SectionHeader title="Emergency handling" badge={badgeState} />
        <div className="mt-2 text-sm text-slate-500">
          Keep this straightforward so the assistant knows when to route urgent callers to emergency help and when to capture a message.
        </div>
        <div className="mt-4 space-y-3">
          {EMERGENCY_POLICIES.map((policy) => {
            const active = formState.emergencyPolicy === policy.value;
            return (
              <button
                key={policy.value}
                type="button"
                onClick={() => handleFieldChange("emergencyPolicy", policy.value)}
                className={`flex w-full items-start gap-3 rounded-2xl border-[0.5px] px-4 py-4 text-left transition ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-[0.5px] transition ${
                    active ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white text-transparent"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <div>
                  <div className="text-sm font-medium">{policy.label}</div>
                  <div className={`mt-1 text-sm leading-6 ${active ? "text-blue-800" : "text-slate-500"}`}>{policy.detail}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="border-[0.5px] border-slate-200 bg-white p-6 shadow-none">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500">{saveHint}</div>
          <Button onClick={handleSave} disabled={uiState === "saving"}>
            {uiState === "saving" ? "Saving..." : "Save setup"}
          </Button>
        </div>
      </Card>
    </>
  );
}

function SectionHeader({ title, badge }: { title: string; badge: BadgeConfig | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      {badge ? <StateBadge label={badge.label} tone={badge.tone} /> : null}
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <>
      <div className="text-sm font-medium text-slate-900">{label}</div>
      <div className="mt-1 text-sm leading-6 text-slate-500">{hint}</div>
    </>
  );
}

function ReadOnlyTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-[0.5px] border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-3 text-sm font-medium leading-6 text-slate-900">{value}</div>
    </div>
  );
}

function ChipButton({
  active,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl border-[0.5px] px-4 py-4 text-left transition ${
        active
          ? "border-blue-300 bg-blue-50 text-blue-900"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border-[0.5px] transition ${
          active ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <div>
        <div className="text-sm font-medium">{label}</div>
        {detail ? <div className={`mt-1 text-sm leading-6 ${active ? "text-blue-800" : "text-slate-500"}`}>{detail}</div> : null}
      </div>
    </button>
  );
}

type BadgeConfig = {
  label: string;
  tone: "amber" | "green" | "red" | "slate";
};

function StateBadge({ label, tone }: BadgeConfig) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return <div className={`rounded-full border-[0.5px] px-3 py-1 text-xs font-semibold ${toneClass}`}>{label}</div>;
}

function getBadge(state: UiState, hasUnsavedChanges: boolean): BadgeConfig | null {
  if (state === "saving") {
    return { label: "Saving...", tone: "slate" };
  }
  if (state === "saved") {
    return { label: "Saved", tone: "green" };
  }
  if (state === "error") {
    return { label: "Fix errors to save", tone: "red" };
  }
  if (state === "dirty" || hasUnsavedChanges) {
    return { label: "Unsaved changes", tone: "amber" };
  }
  return null;
}

function getSaveHint(state: UiState, hasUnsavedChanges: boolean) {
  if (state === "saving") {
    return "Saving your setup changes...";
  }
  if (state === "saved") {
    return "All changes saved.";
  }
  if (state === "error") {
    return "Fix the errors above before saving.";
  }
  if (state === "dirty" || hasUnsavedChanges) {
    return "You have unsaved changes.";
  }
  return "Make changes here, then save once when you're ready.";
}

function formatRoutingLabel(value: string) {
  if (value === "after_hours_only") {
    return "After hours only";
  }
  if (value === "always_forward") {
    return "Always";
  }
  if (value === "disabled") {
    return "Never";
  }
  return value.replaceAll("_", " ");
}

function splitInsuranceSummary(text: string) {
  return text
    .split(/(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeInsuranceLines(lines: string[]) {
  const canonical = new Map(
    INSURANCE_OPTIONS.map((option) => [normalizeKey(option.value), option.value]),
  );

  const deduped = new Set<string>();

  for (const line of lines) {
    const normalized = normalizeKey(line);
    const canonicalMatch = canonical.get(normalized);
    if (canonicalMatch) {
      deduped.add(canonicalMatch);
    }
  }

  return Array.from(deduped);
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^\w]+/g, " ").trim();
}
