import type { ReactNode } from "react";
import { SidebarNav } from "@/components/sidebar-nav";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <SidebarNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-line px-4 md:px-8">
          <h1 className="font-display text-base font-semibold">{title}</h1>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
