"use client";

import { useMemo, useState, useTransition } from "react";

import { OnboardingOverview, Practice, updatePracticeSettings } from "@/lib/api";

const steps = [
  { key: "practice_profile", title: "Practice info" },
  { key: "workflow_modes", title: "After-hours rules" },
  { key: "messaging", title: "Notifications" },
  { key: "crm", title: "Integrations" },
  { key: "alerts", title: "Go live" },
];

export function OnboardingWizard({
  practice,
  overview,
}: {
  practice: Practice;
  overview: OnboardingOverview;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [schedulingMode, setSchedulingMode] = useState(practice.scheduling_mode);
  const [insuranceMode, setInsuranceMode] = useState(practice.insurance_mode);
  const [missedCallEnabled, setMissedCallEnabled] = useState(practice.missed_call_recovery_enabled);
  const [callbackSla, setCallbackSla] = useState(String(practice.callback_sla_minutes));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentStep = useMemo(() => steps[stepIndex], [stepIndex]);

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
        setMessage("Workflow settings saved");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to save");
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

        {currentStep.key === "practice_profile" ? (
          <div className="stack-list">
            <div className="stack-item">
              <strong>{practice.practice_name}</strong>
              <p>{practice.address}</p>
              <p>{practice.office_hours}</p>
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
              <button type="button" className="action-button action-button--accent" onClick={saveWorkflowSettings} disabled={isPending}>
                Save workflow settings
              </button>
              {message ? <span className="subtle">{message}</span> : null}
            </div>
          </div>
        ) : null}

        {currentStep.key !== "practice_profile" && currentStep.key !== "workflow_modes" ? (
          <div className="stack-list">
            {overview.checklist
              .filter((item) => item.key === currentStep.key)
              .map((item) => (
                <div key={item.key} className="stack-item">
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                  <span className={`pill pill--${item.completed ? "routine" : "high"}`}>
                    {item.completed ? "complete" : "needs setup"}
                  </span>
                </div>
              ))}
          </div>
        ) : null}

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
