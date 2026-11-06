import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { TodoView } from "@/app/todos/_components/todo-view";

export const metadata: Metadata = {
  title: "To-do",
  description: "Your DOOMBOT to-do list",
};

export default function TodosPage() {
  return (
    <AppShell title="To-do">
      <TodoView />
    </AppShell>
  );
}
