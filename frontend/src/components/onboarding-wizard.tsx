"use client";

import { useMemo, useState, useTransition } from "react";

import {
  OnboardingOverview,
  Practice,
  PracticeModule,
  updatePracticeModule,
  updatePracticeSettings,
} from "@/lib/api";

const steps = [
  { key: "modules", title: "Choose modules" },
  { key: "practice_profile", title: "Practice info" },
  { key: "workflow_modes", title: "Configure preferences" },
  { key: "integrations", title: "Connect systems" },
  { key: "go_live", title: "Go live" },
];

const moduleDescriptions: Record<string, string> = {
  after_hours: "Answer after-hours calls and turn them into operational work.",
  missed_calls: "Recover unanswered calls with automated outreach and callback workflows.",
  callback_manager: "Organize callback tasks, assignees, notes, and outcomes.",
  emergency_routing: "Escalate urgent dental issues and emergency-related activity.",
  booking: "Support booking request capture and future scheduling connectors.",
};

function prettifyModule(moduleKey: string) {
  return moduleKey.replaceAll("_", " ");
}

export function OnboardingWizard({
  practice,
  overview,
  modules,
}: {
  practice: Practice;
  overview: OnboardingOverview;
  modules: PracticeModule[];
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [moduleState, setModuleState] = useState(modules);
  const [schedulingMode, setSchedulingMode] = useState(practice.scheduling_mode);
  const [insuranceMode, setInsuranceMode] = useState(practice.insurance_mode);
  const [missedCallEnabled, setMissedCallEnabled] = useState(practice.missed_call_recovery_enabled);
  const [callbackSla, setCallbackSla] = useState(String(practice.callback_sla_minutes));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentStep = useMemo(() => steps[stepIndex], [stepIndex]);
  const enabledModules = moduleState.filter((module) => module.is_enabled);

  const saveWorkflowSettings = () => {
    startTransition(async () => {
      try {
        await updatePracticeSettings(practice.id, {
          scheduling_mode: schedulingMode,
          insurance_mode: insuranceMode,
          missed_call_recovery_enabled: missedCallEnabled,
          missed_call_recovery_message: practice.missed_call_recovery_message,
          callback_sla_minutes: Number(callbackSla),
        });
        setMessage("Preferences saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to save");
      }
    });
  };

  const toggleModule = (module: PracticeModule) => {
    startTransition(async () => {
      try {
        const updated = await updatePracticeModule(practice.id, module.module_key, {
          is_enabled: !module.is_enabled,
          config_json: module.config_json,
        });
        setModuleState((current) =>
          current.map((item) => (item.module_key === updated.module_key ? updated : item)),
        );
        setMessage(`${prettifyModule(module.module_key)} ${updated.is_enabled ? "enabled" : "disabled"}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to update module");
      }
    });
  };

  return (
    <div className="wizard">
      <div className="wizard__rail">
        {steps.map((step, index) => (
          <button
            key={step.key}
            type="button"
            className={`wizard__step ${index === stepIndex ? "wizard__step--active" : ""}`}
            onClick={() => setStepIndex(index)}
          >
            <span>{index + 1}</span>
            {step.title}
          </button>
        ))}
      </div>

      <div className="panel wizard__panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Step {stepIndex + 1}</span>
            <h2>{currentStep.title}</h2>
          </div>
        </div>

        {currentStep.key === "modules" ? (
          <div className="stack-list">
            <div className="stack-item">
              <strong>Choose what this practice wants the platform to do.</strong>
              <p>These modules shape onboarding, workflows, and which automation paths get turned on first.</p>
            </div>
            <div className="stack-list">
              {moduleState.map((module) => (
                <div key={module.id} className="stack-item">
                  <div className="stack-item__top">
                    <strong>{String(module.config_json?.label || prettifyModule(module.module_key))}</strong>
                    <span className={`pill pill--${module.is_enabled ? "routine" : "high"}`}>
                      {module.is_enabled ? "enabled" : "disabled"}
                    </span>
                  </div>
                  <p>{moduleDescriptions[module.module_key] || "Module configuration for this practice."}</p>
                  <div className="action-bar">
                    <button
                      type="button"
                      className={`action-button ${module.is_enabled ? "" : "action-button--accent"}`}
                      onClick={() => toggleModule(module)}
                      disabled={isPending}
                    >
                      {module.is_enabled ? "Disable module" : "Enable module"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {currentStep.key === "practice_profile" ? (
          <div className="stack-list">
            <div className="stack-item">
              <strong>{practice.practice_name}</strong>
              <p>{practice.address}</p>
              <p>{practice.office_hours}</p>
            </div>
            <div className="stack-item">
              <strong>Go-live profile</strong>
              <p>Website: {practice.website}</p>
              <p>Emergency number: {practice.emergency_number}</p>
              <p>Languages: {practice.languages}</p>
            </div>
          </div>
        ) : null}

        {currentStep.key === "workflow_modes" ? (
          <div className="stack-list">
            <div className="form-grid">
              <label className="field">
                <span>Scheduling mode</span>
                <select value={schedulingMode} onChange={(event) => setSchedulingMode(event.target.value)}>
                  <option value="message_only">Message only</option>
                  <option value="availability_assist">Availability assist</option>
                  <option value="full_scheduling">Full scheduling</option>
                </select>
              </label>
              <label className="field">
                <span>Insurance mode</span>
                <select value={insuranceMode} onChange={(event) => setInsuranceMode(event.target.value)}>
                  <option value="generic">Generic</option>
                  <option value="plan_lookup">Plan lookup</option>
                  <option value="eligibility_check">Eligibility check</option>
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Callback SLA (minutes)</span>
                <input value={callbackSla} onChange={(event) => setCallbackSla(event.target.value)} />
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={missedCallEnabled}
                  onChange={(event) => setMissedCallEnabled(event.target.checked)}
                />
                Enable missed-call recovery
              </label>
            </div>
            <div className="action-bar">
              <button
                type="button"
                className="action-button action-button--accent"
                onClick={saveWorkflowSettings}
                disabled={isPending}
              >
                Save preferences
              </button>
            </div>
          </div>
        ) : null}

        {currentStep.key === "integrations" ? (
          <div className="stack-list">
            <div className="stack-item">
              <strong>Platform-owned by default</strong>
              <p>Voice comes through Vapi, messaging through Twilio, and staff alerts default to email for low-friction rollout.</p>
            </div>
            <div className="stack-item">
              <strong>Optional connectors later</strong>
              <p>CRM, scheduling, insurance, and advanced alert connectors can be added after go-live without changing the core workflow model.</p>
            </div>
            {overview.checklist
              .filter((item) => ["messaging", "crm", "alerts"].includes(item.key))
              .map((item) => (
                <div key={item.key} className="stack-item">
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                  <span className={`pill pill--${item.completed ? "routine" : "high"}`}>
                    {item.completed ? "ready" : "needs setup"}
                  </span>
                </div>
              ))}
          </div>
        ) : null}

        {currentStep.key === "go_live" ? (
          <div className="stack-list">
            <div className="stack-item">
              <strong>{overview.practice_name} is almost live.</strong>
              <p>
                {overview.completed_steps} of {overview.total_steps} onboarding checkpoints are complete.
              </p>
            </div>
            <div className="stack-item">
              <strong>Enabled modules</strong>
              <p>{enabledModules.map((module) => String(module.config_json?.label || prettifyModule(module.module_key))).join(", ") || "No modules enabled yet."}</p>
            </div>
            {overview.checklist.map((item) => (
              <div key={item.key} className="stack-item">
                <div className="stack-item__top">
                  <strong>{item.label}</strong>
                  <span className={`pill pill--${item.completed ? "routine" : "high"}`}>
                    {item.completed ? "complete" : "needs setup"}
                  </span>
                </div>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        ) : null}

        {message ? <p className="subtle" style={{ marginTop: 12 }}>{message}</p> : null}

        <div className="wizard__actions">
          <button type="button" className="action-button" onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>
            Back
          </button>
          <button
            type="button"
            className="action-button action-button--accent"
            onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
