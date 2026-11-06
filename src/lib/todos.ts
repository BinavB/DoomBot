import { currentUserId } from "@/lib/auth/context";
import { getDatabase } from "@/lib/database";

export interface Todo {
  id: number;
  title: string;
  done: boolean;
}

interface TodoRow {
  id: number;
  title: string;
  done: number;
}

function toTodo(row: TodoRow): Todo {
  return { id: row.id, title: row.title, done: row.done === 1 };
}

export function listTodos(): Todo[] {
  const rows = getDatabase()
    .prepare("SELECT id, title, done FROM todos WHERE user_id = ? ORDER BY done, id")
    .all(currentUserId()) as unknown as TodoRow[];
  return rows.map(toTodo);
}

export function addTodo(title: string): Todo {
  const row = getDatabase()
    .prepare("INSERT INTO todos (user_id, title) VALUES (?, ?) RETURNING id, title, done")
    .get(currentUserId(), title) as unknown as TodoRow;
  return toTodo(row);
}

export function setTodoDone(id: number, done: boolean): void {
  getDatabase().prepare("UPDATE todos SET done = ? WHERE id = ? AND user_id = ?").run(done ? 1 : 0, id, currentUserId());
}

export function deleteTodo(id: number): void {
  getDatabase().prepare("DELETE FROM todos WHERE id = ? AND user_id = ?").run(id, currentUserId());
}
