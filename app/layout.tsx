import type { Metadata } from "next";

import { BffStatusShell } from "@/components/BffStatusShell";

import "./globals.css";

export const metadata: Metadata = {
  title: "Media Ops Applied AI",
  description: "Next.js web client for the Media Ops Applied AI platform BFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BffStatusShell>{children}</BffStatusShell>
      </body>
    </html>
  );
}
