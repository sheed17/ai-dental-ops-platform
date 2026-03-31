import { CommandShell } from "@/components/command-shell";
import { getIntegrationCatalog, getPracticeIntegrations, getPracticeSettings, getRoutingRules } from "@/lib/api";

export default async function IntegrationsPage() {
  const practices = await getPracticeSettings();
  const activePractice = practices[0] ?? null;
  const [catalog, integrations, routingRules] = activePractice
    ? await Promise.all([
        getIntegrationCatalog(),
        getPracticeIntegrations(activePractice.id),
        getRoutingRules(activePractice.id),
      ])
    : [[], [], []];

  const integrationMap = new Map(integrations.map((setting) => [setting.capability_key, setting]));

  return (
    <CommandShell title="Integrations" activeHref="/integrations">
      <div className="grid gap-4">
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">System model</div>
          <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.4px] text-[var(--text-primary)]">
            One abstraction layer, many practice stacks.
          </h2>
          <p className="mt-2 max-w-[720px] text-[13px] leading-6 text-[var(--text-secondary)]">
            Messaging stays platform-owned. Everything else plugs into the practice&apos;s real tools
            without changing the workflow model.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {catalog.map((item) => {
            const setting = integrationMap.get(item.key);
            return (
              <article key={item.key} className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
                      {item.ownership === "platform" ? "Platform-owned" : "Practice connector"}
                    </div>
                    <h3 className="mt-2 text-[16px] font-semibold">{item.label}</h3>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                      setting?.is_enabled
                        ? "bg-[var(--green-bg)] text-[var(--green)]"
                        : "bg-[var(--amber-bg)] text-[var(--amber)]"
                    }`}
                  >
                    {setting?.is_enabled ? "Enabled" : "Needs setup"}
                  </span>
                </div>
                <p className="mt-3 text-[12.5px] leading-6 text-[var(--text-secondary)]">{item.description}</p>
                <div className="mt-4 grid gap-2">
                  <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Provider</div>
                    <div className="mt-1 text-[12px] text-[var(--text-primary)]">{setting?.provider || item.default_provider}</div>
                  </div>
                  <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Supported</div>
                    <div className="mt-1 text-[12px] text-[var(--text-primary)]">{item.supported_providers.join(", ")}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Routing rules</div>
            <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.4px]">Current workflow rules</h2>
          </div>
          <div className="grid gap-3 p-4">
            {routingRules.map((rule) => (
              <div key={rule.id} className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-[13px]">{rule.name}</strong>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                      rule.is_enabled ? "bg-[var(--green-bg)] text-[var(--green)]" : "bg-[var(--surface2)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {rule.is_enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="mt-2 text-[12px] text-[var(--text-secondary)]">
                  When <span className="text-[var(--text-primary)]">{rule.trigger_event}</span> route to{" "}
                  <span className="text-[var(--text-primary)]">{String(rule.action_json.channel || "internal_alert")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CommandShell>
  );
}
