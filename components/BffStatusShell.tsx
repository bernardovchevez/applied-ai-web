"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { APP_ENV, fetchHealth } from "@/lib/bff";
import type { AppEnvironment, BffStatus } from "@/lib/types";

export function BffStatusShell({ children }: { children: React.ReactNode }) {
  const [bffStatus, setBffStatus] = useState<BffStatus>("loading");
  const [bffEnv, setBffEnv] = useState<AppEnvironment>(APP_ENV);

  useEffect(() => {
    fetchHealth()
      .then((h) => {
        setBffStatus(h.status === "ok" ? "online" : "degraded");
        if (h.environment) setBffEnv(h.environment);
      })
      .catch(() => setBffStatus("offline"));
  }, []);

  return (
    <AppShell bffStatus={bffStatus} environment={bffEnv}>
      {children}
    </AppShell>
  );
}
