"use client";

import { useEffect, useState, type FormEvent } from "react";

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const jsonHeaders = { "Content-Type": "application/json" };

export function TodoView() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/todos")
      .then((response) => response.json() as Promise<{ todos: Todo[] }>)
      .then((data) => setTodos(data.todos))
      .catch(() => setError("Your to-do list could not load. Reload the page to try again."))
      .finally(() => setLoaded(true));
  }, []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/todos", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ title }),
    });
    const data = (await response.json()) as { todo?: Todo; error?: string };
    if (!response.ok || !data.todo) {
      setError(data.error ?? "The task could not be added.");
      return;
    }
    const todo = data.todo;
    setTodos((current) => [...current.filter((item) => !item.done), todo, ...current.filter((item) => item.done)]);
    setTitle("");
    setError(null);
  }

  async function toggle(todo: Todo) {
    await fetch("/api/todos", {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ id: todo.id, done: !todo.done }),
    });
    setTodos((current) =>
      current
        .map((item) => (item.id === todo.id ? { ...item, done: !item.done } : item))
        .sort((a, b) => Number(a.done) - Number(b.done)),
    );
  }

  async function remove(todo: Todo) {
    await fetch("/api/todos", {
      method: "DELETE",
      headers: jsonHeaders,
      body: JSON.stringify({ id: todo.id }),
    });
    setTodos((current) => current.filter((item) => item.id !== todo.id));
  }

  const openCount = todos.filter((todo) => !todo.done).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:px-6">
      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="new-task" className="sr-only">
          New task
        </label>
        <input
          id="new-task"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a task"
          maxLength={200}
          className="h-11 flex-1 rounded-xl border border-line bg-panel px-4 outline-none placeholder:text-muted focus:border-doom"
        />
        <button
          type="submit"
          disabled={title.trim().length === 0}
          className="h-11 rounded-xl bg-doom px-5 text-sm font-semibold text-canvas disabled:opacity-40"
        >
          Add task
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {loaded && todos.length === 0 && !error && (
        <p className="text-muted">No tasks yet. Add one above, or ask DOOMBOT in chat to add it for you.</p>
      )}

      {todos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{openCount === 1 ? "1 open task" : `${openCount} open tasks`}</p>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-panel">
            {todos.map((todo) => (
              <li key={todo.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  id={`todo-${todo.id}`}
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => void toggle(todo)}
                  className="h-4 w-4 accent-[var(--doom)]"
                />
                <label
                  htmlFor={`todo-${todo.id}`}
                  className={todo.done ? "flex-1 text-muted line-through" : "flex-1"}
                >
                  {todo.title}
                </label>
                <button
                  type="button"
                  onClick={() => void remove(todo)}
                  className="rounded-md px-2 py-1 text-xs text-muted hover:bg-raised hover:text-ink"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
