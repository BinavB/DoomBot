import { connection, NextResponse } from "next/server";
import { addTodo, deleteTodo, listTodos, setTodoDone } from "@/lib/todos";

export async function GET() {
  await connection();
  return NextResponse.json({ todos: listTodos() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { title?: unknown };
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length === 0 || title.length > 200) {
    return NextResponse.json({ error: "Enter a title up to 200 characters." }, { status: 400 });
  }
  return NextResponse.json({ todo: addTodo(title) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: unknown; done?: unknown };
  if (typeof body.id !== "number" || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "Send a numeric id and a done flag." }, { status: 400 });
  }
  setTodoDone(body.id, body.done);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { id?: unknown };
  if (typeof body.id !== "number") {
    return NextResponse.json({ error: "Send a numeric id." }, { status: 400 });
  }
  deleteTodo(body.id);
  return NextResponse.json({ ok: true });
}
