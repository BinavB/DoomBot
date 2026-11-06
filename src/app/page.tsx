import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ChatView } from "@/app/_components/chat-view";

export const metadata: Metadata = {
  title: "Chat",
  description: "Talk to DOOMBOT about your day, inbox, tasks and weather",
};

export default function ChatPage() {
  return (
    <AppShell title="Chat">
      <ChatView />
    </AppShell>
  );
}
