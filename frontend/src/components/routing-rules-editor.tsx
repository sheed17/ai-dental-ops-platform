"use client";

import { useState, useTransition } from "react";

import { RoutingRule, updateRoutingRule } from "@/lib/api";

export function RoutingRulesEditor({
  practiceId,
  initialRules,
}: {
  practiceId: string;
  initialRules: RoutingRule[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateRuleField = (ruleId: string, field: keyof RoutingRule, value: unknown) => {
    setRules((current) =>
      current.map((rule) => (rule.id === ruleId ? { ...rule, [field]: value } : rule)),
    );
  };

  const saveRule = (rule: RoutingRule) => {
    startTransition(async () => {
      try {
        const updated = await updateRoutingRule(practiceId, rule.id, {
          name: rule.name,
          trigger_event: rule.trigger_event,
          condition_json: rule.condition_json,
          action_json: rule.action_json,
          is_enabled: rule.is_enabled,
        });
        setRules((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setMessage(`Saved "${updated.name}"`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to save routing rule");
      }
    });
  };

  return (
    <div className="stack-list">
      {rules.map((rule) => (
        <div key={rule.id} className="stack-item">
          <div className="queue-card__header">
            <div>
              <span className="eyebrow">Routing Rule</span>
              <input
                className="inline-input"
                value={rule.name}
                onChange={(event) => updateRuleField(rule.id, "name", event.target.value)}
              />
            </div>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={rule.is_enabled}
                onChange={(event) => updateRuleField(rule.id, "is_enabled", event.target.checked)}
              />
              Enabled
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>When</span>
              <select
                value={rule.trigger_event}
                onChange={(event) => updateRuleField(rule.id, "trigger_event", event.target.value)}
              >
                <option value="call.completed">Call completed</option>
                <option value="callback.overdue">Callback overdue</option>
                <option value="missed_call.created">Missed call created</option>
              </select>
            </label>
            <label className="field">
              <span>Route to</span>
              <select
                value={String(rule.action_json.channel || "")}
                onChange={(event) =>
                  updateRuleField(rule.id, "action_json", { ...rule.action_json, channel: event.target.value })
                }
              >
                <option value="internal_alert">Internal alert</option>
                <option value="crm">CRM</option>
                <option value="sms">SMS</option>
              </select>
            </label>
          </div>

          <div className="action-bar">
            <button type="button" className="action-button action-button--accent" onClick={() => saveRule(rule)} disabled={isPending}>
              Save rule
            </button>
          </div>
        </div>
      ))}
      {message ? <span className="subtle">{message}</span> : null}
    </div>
  );
}
