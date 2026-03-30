import Link from "next/link";

export function TopNav() {
  return (
    <header className="top-nav">
      <div className="top-nav__brand">
        <span className="top-nav__eyebrow">Dental Ops Platform</span>
        <strong>Front Desk Command Center</strong>
      </div>
      <nav className="top-nav__links" aria-label="Primary">
        <Link href="/">Dashboard</Link>
        <Link href="/callbacks">Callback Queue</Link>
      </nav>
    </header>
  );
}
