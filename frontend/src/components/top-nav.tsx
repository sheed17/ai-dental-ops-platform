import Link from "next/link";

export function TopNav() {
  return (
    <>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">N</span>
          <div>
            <span className="top-nav__eyebrow">Dental Ops</span>
            <strong>Command Center</strong>
          </div>
        </div>

        <label className="sidebar__search">
          <span>Search</span>
          <input type="text" placeholder="Calls, callers, tasks" readOnly />
        </label>

        <nav className="sidebar__nav" aria-label="Primary">
          <div className="sidebar__group">
            <span className="sidebar__label">Operations</span>
            <Link href="/">Dashboard</Link>
            <Link href="/callbacks">Callback Queue</Link>
          </div>
          <div className="sidebar__group">
            <span className="sidebar__label">Control</span>
            <Link href="/settings">Settings</Link>
            <Link href="/integrations">Integrations</Link>
            <Link href="/onboarding">Onboarding</Link>
          </div>
        </nav>

        <div className="sidebar__footer">
          <span className="sidebar__label">Status</span>
          <div className="sidebar__status">
            <span className="sidebar__dot" />
            Platform online
          </div>
        </div>
      </aside>

      <header className="top-nav">
        <div className="top-nav__brand">
          <span className="top-nav__eyebrow">Operator View</span>
          <strong>After-hours calls, missed-call recovery, and front desk follow-through</strong>
        </div>
        <div className="top-nav__actions">
          <span className="top-nav__chip">Live backend</span>
          <span className="top-nav__chip">Twilio pending</span>
        </div>
      </header>
    </>
  );
}
