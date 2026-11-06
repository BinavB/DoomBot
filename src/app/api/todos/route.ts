import { NextResponse } from "next/server";
import { addTodo, deleteTodo, listTodos, setTodoDone } from "@/lib/todos";
import { withUser } from "@/lib/auth/route";

export const GET = withUser(async () => {
  return NextResponse.json({ todos: listTodos() });
});

export const POST = withUser(async (request: Request) => {
  const body = (await request.json()) as { title?: unknown };
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length === 0 || title.length > 200) {
    return NextResponse.json({ error: "Enter a title up to 200 characters." }, { status: 400 });
  }
  return NextResponse.json({ todo: addTodo(title) }, { status: 201 });
});

export const PATCH = withUser(async (request: Request) => {
  const body = (await request.json()) as { id?: unknown; done?: unknown };
  if (typeof body.id !== "number" || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "Send a numeric id and a done flag." }, { status: 400 });
  }
  setTodoDone(body.id, body.done);
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser(async (request: Request) => {
  const body = (await request.json()) as { id?: unknown };
  if (typeof body.id !== "number") {
    return NextResponse.json({ error: "Send a numeric id." }, { status: 400 });
  }
  deleteTodo(body.id);
  return NextResponse.json({ ok: true });
});
