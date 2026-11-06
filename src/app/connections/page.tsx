import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { GoogleConnection } from "@/app/connections/_components/google-connection";

export const metadata: Metadata = {
  title: "Connections",
  description: "Accounts DOOMBOT can read",
};

export default function ConnectionsPage() {
  return (
    <AppShell title="Connections">
      <GoogleConnection />
    </AppShell>
  );
}
