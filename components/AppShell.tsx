import Link from "next/link";

import { APP_ENV, BFF_URL } from "@/lib/bff";
import type { AppEnvironment, BffStatus } from "@/lib/types";

type Props = {
  children: React.ReactNode;
  bffStatus?: BffStatus;
  environment?: AppEnvironment;
};

const NAV = [
  { href: "/", label: "Chat" },
  { href: "/agent", label: "Agent" },
  { href: "/admin/evals", label: "Evals" },
];

const STATUS_LABEL: Record<BffStatus, string> = {
  loading: "...",
  online: "BFF online",
  degraded: "BFF degraded (pgvector/LLM)",
  offline: "BFF offline",
};

export function AppShell({ children, bffStatus = "loading", environment = APP_ENV }: Props) {
  const dotClass =
    bffStatus === "online" ? "ok" : bffStatus === "degraded" ? "warn" : bffStatus === "offline" ? "bad" : "";

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <Link href="/">Media Ops Applied AI</Link>
          <span className="tag">Platform BFF Client</span>
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="bff-pill">
          <span className={`env-badge env-${environment}`}>{environment}</span>
          <span className={`dot ${dotClass}`} />
          {STATUS_LABEL[bffStatus]}
          <span className="bff-url">{BFF_URL}</span>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
