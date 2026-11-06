import { config } from "@/lib/config";
import { AgentError } from "@/lib/errors";
import { getAccessToken } from "@/lib/google/oauth";
import { currentDay } from "@/lib/time";

const dubaiOffset = "+04:00";
const dayMilliseconds = 24 * 60 * 60 * 1000;

interface CalendarEvent {
  summary?: string;
  start?: { dateTime?: string; date?: string };
}

interface MessageHeaders {
  payload?: { headers?: { name: string; value: string }[] };
}

async function googleGet<T>(url: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new AgentError(`Google request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

function formatClock(isoTime: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(isoTime));
}

function todayBounds(): { start: string; end: string } {
  const start = new Date(`${currentDay()}T00:00:00${dubaiOffset}`);
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + dayMilliseconds).toISOString(),
  };
}

export async function todaysCalendarEvents(): Promise<string[]> {
  const bounds = todayBounds();
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", bounds.start);
  url.searchParams.set("timeMax", bounds.end);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "20");

  const data = await googleGet<{ items?: CalendarEvent[] }>(url.toString());
  return (data.items ?? []).map((event) => {
    const when = event.start?.dateTime ? formatClock(event.start.dateTime) : "all day";
    return `${when} - ${event.summary ?? "(no title)"}`;
  });
}

export async function unreadEmails(): Promise<string[]> {
  const list = await googleGet<{ messages?: { id: string }[] }>(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is%3Aunread&maxResults=5",
  );
  const messages = await Promise.all(
    (list.messages ?? []).map((message) =>
      googleGet<MessageHeaders>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
      ),
    ),
  );
  return messages.map((message) => {
    const headers = message.payload?.headers ?? [];
    const read = (name: string) =>
      headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
    return `From ${read("From") || "unknown"}: ${read("Subject") || "(no subject)"}`;
  });
}

export async function openGoogleTasks(): Promise<string[]> {
  const lists = await googleGet<{ items?: { id: string; title?: string }[] }>(
    "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=10",
  );
  const groups = await Promise.all(
    (lists.items ?? []).map(async (list) => {
      const tasks = await googleGet<{ items?: { title?: string }[] }>(
        `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(list.id)}/tasks?showCompleted=false&maxResults=20`,
      );
      return (tasks.items ?? []).map((task) => `${task.title ?? "(untitled)"} (${list.title ?? "list"})`);
    }),
  );
  return groups.flat();
}
