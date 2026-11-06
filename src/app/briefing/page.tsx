import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { BriefingView } from "@/app/briefing/_components/briefing-view";

export const metadata: Metadata = {
  title: "Briefing",
  description: "Your morning briefing with weather, calendar, email and news",
};

export default function BriefingPage() {
  return (
    <AppShell title="Briefing">
      <BriefingView />
    </AppShell>
  );
}
