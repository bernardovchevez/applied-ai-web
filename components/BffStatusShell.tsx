"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { fetchHealth } from "@/lib/bff";
import type { BffStatus } from "@/lib/types";

export function BffStatusShell({ children }: { children: React.ReactNode }) {
  const [bffStatus, setBffStatus] = useState<BffStatus>("loading");

  useEffect(() => {
    fetchHealth()
      .then((h) => setBffStatus(h.status === "ok" ? "online" : "degraded"))
      .catch(() => setBffStatus("offline"));
  }, []);

  return <AppShell bffStatus={bffStatus}>{children}</AppShell>;
}
