import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { LoginCard } from "@/app/login/_components/login-card";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to DOOMBOT with your Google account",
};

export default function LoginPage() {
  return (
    <AppShell title="Sign in" bare>
      <LoginCard />
    </AppShell>
  );
}
