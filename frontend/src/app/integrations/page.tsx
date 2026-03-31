import { RoutingRulesEditor } from "@/components/routing-rules-editor";
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
    <div className="app-shell">
      <section className="hero hero--compact">
        <div>
          <span className="eyebrow">Integrations</span>
          <h1>One abstraction layer, many practice stacks.</h1>
          <p>
            Messaging stays platform-owned. Everything else can plug into the practice’s
            real-world tools without changing your core workflow model.
          </p>
        </div>
      </section>

      <section className="queue-grid">
        {catalog.map((item) => {
          const setting = integrationMap.get(item.key);
          return (
            <article key={item.key} className="queue-card">
              <div className="queue-card__header">
                <div>
                  <span className="eyebrow">{item.ownership === "platform" ? "Platform-owned" : "Practice connector"}</span>
                  <h3>{item.label}</h3>
                </div>
                <span className={`pill pill--${setting?.is_enabled ? "routine" : "high"}`}>
                  {setting?.is_enabled ? "enabled" : "not live"}
                </span>
              </div>
              <p className="queue-card__reason">{item.description}</p>
              <div className="stack-list">
                <div className="stack-item">
                  <strong>Provider</strong>
                  <p>{setting?.provider || item.default_provider}</p>
                </div>
                <div className="stack-item">
                  <strong>Supported</strong>
                  <p>{item.supported_providers.join(", ")}</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel__header">
          <div>
            <span className="eyebrow">Routing Rules</span>
            <h2>Simple automation, not a Zapier clone</h2>
          </div>
        </div>
        {activePractice ? <RoutingRulesEditor practiceId={activePractice.id} initialRules={routingRules} /> : null}
      </section>
    </div>
  );
}
