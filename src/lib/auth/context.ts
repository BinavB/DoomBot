import { AsyncLocalStorage } from "node:async_hooks";
import { AgentError } from "@/lib/errors";

const globalForContext = globalThis as unknown as {
  doombotUserContext?: AsyncLocalStorage<number>;
};

const storage = (globalForContext.doombotUserContext ??= new AsyncLocalStorage<number>());

export function runAsUser<T>(userId: number, work: () => T): T {
  return storage.run(userId, work);
}

export function currentUserId(): number {
  const userId = storage.getStore();
  if (userId === undefined) {
    throw new AgentError("Sign in to use DOOMBOT.");
  }
  return userId;
}
