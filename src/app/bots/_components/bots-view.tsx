"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BotAvatar } from "@/components/bot-avatar";
import { Icon } from "@/components/icon";
import { Markdown } from "@/components/markdown";
import { defaultLook, type BotLook } from "@/lib/bots/look";
import {
  describeSchedule,
  dayRules,
  frequencies,
  frequencyLabels,
  weekdayNames,
  type Frequency,
} from "@/lib/bots/frequency";
import { BotProfile } from "./bot-profile";
import { LookPicker } from "./look-picker";

interface BotActivity {
  running: number;
  total: number;
  failed: number;
  lastStatus: string | null;
  lastAt: string | null;
}

interface Bot {
  look: BotLook;
  activity: BotActivity;
  id: number;
  slug: string;
  name: string;
  instructions: string;
  toolNames: string[];
  builtIn: boolean;
  routine: { instruction: string; time: string; enabled: boolean; frequency: Frequency; day: number | null } | null;
}

interface BotTask {
  id: number;
  instruction: string;
  status: string;
  result: string | null;
  source: string;
  createdAt: string;
}

interface BotMemory {
  id: number;
  fact: string;
}

interface ToolInfo {
  name: string;
  description: string;
}

const jsonHeaders = { "Content-Type": "application/json" };
const pollMilliseconds = 3000;

const sourceLabels: Record<string, string> = {
  chat: "From chat",
  assigned: "Assigned",
  routine: "Routine",
};

const statusStyles: Record<string, string> = {
  running: "text-signal",
  done: "text-doom",
  failed: "text-danger",
};

async function fetchBotDetail(botId: number): Promise<{ tasks: BotTask[]; memories: BotMemory[] }> {
  const [taskResponse, memoryResponse] = await Promise.all([
    fetch(`/api/bots/${botId}/tasks`),
    fetch(`/api/bots/${botId}/memory`),
  ]);
  const taskData = (await taskResponse.json()) as { tasks: BotTask[] };
  const memoryData = (await memoryResponse.json()) as { memories: BotMemory[] };
  return { tasks: taskData.tasks, memories: memoryData.memories };
}

function formatTime(sqliteTime: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(`${sqliteTime.replace(" ", "T")}Z`));
}

function formatClock(sqliteTime: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", timeStyle: "short" }).format(
    new Date(`${sqliteTime.replace(" ", "T")}Z`),
  );
}

function activityLabel(activity: BotActivity): { text: string; style: string } {
  if (activity.running > 0) {
    return { text: "Working now", style: "text-signal" };
  }
  if (!activity.lastStatus || !activity.lastAt) {
    return { text: "No tasks yet", style: "text-muted" };
  }
  const when = formatClock(activity.lastAt);
  return activity.lastStatus === "failed"
    ? { text: `Failed at ${when}`, style: "text-danger" }
    : { text: `Done at ${when}`, style: "text-doom" };
}

export function BotsView() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [tasks, setTasks] = useState<BotTask[]>([]);
  const [memories, setMemories] = useState<BotMemory[]>([]);
  const [instruction, setInstruction] = useState("");
  const [newName, setNewName] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newTools, setNewTools] = useState<string[]>([]);
  const [newLook, setNewLook] = useState<BotLook>(() => defaultLook(1));
  const [preferences, setPreferences] = useState("");
  const [designing, setDesigning] = useState(false);
  const [routineTime, setRoutineTime] = useState("");
  const [routineInstruction, setRoutineInstruction] = useState("");
  const [routineFrequency, setRoutineFrequency] = useState<Frequency>("daily");
  const [routineDay, setRoutineDay] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = bots.find((bot) => bot.id === selectedId) ?? null;
  const hasRunningTask = tasks.some((task) => task.status === "running");

  useEffect(() => {
    Promise.all([fetch("/api/bots"), fetch("/api/bot-tools")])
      .then(async ([botResponse, toolResponse]) => {
        const botData = (await botResponse.json()) as { bots: Bot[] };
        const toolData = (await toolResponse.json()) as { tools: ToolInfo[] };
        const first = botData.bots[0];
        setBots(botData.bots);
        setTools(toolData.tools);
        setRoutineTime(first?.routine?.time ?? "");
        setRoutineInstruction(first?.routine?.instruction ?? "");
        setRoutineFrequency(first?.routine?.frequency ?? "daily");
        setRoutineDay(first?.routine?.day ?? null);
        setSelectedId((current) => current ?? first?.id ?? null);
      })
      .catch(() => setError("Doombots could not load. Check that the server is running, then reload."));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      fetch("/api/bots")
        .then((response) => response.json() as Promise<{ bots: Bot[] }>)
        .then((data) => {
          setBots((current) =>
            current.map((bot) => ({ ...bot, activity: data.bots.find((fresh) => fresh.id === bot.id)?.activity ?? bot.activity })),
          );
        })
        .catch(() => undefined);
    }, pollMilliseconds);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      return;
    }
    let cancelled = false;
    fetchBotDetail(selectedId)
      .then((detail) => {
        if (!cancelled) {
          setTasks(detail.tasks);
          setMemories(detail.memories);
        }
      })
      .catch(() => setError("This Doombot's history could not load. Reload the page to try again."));
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (selectedId === null || !hasRunningTask) {
      return;
    }
    const timer = setInterval(() => {
      fetchBotDetail(selectedId)
        .then((detail) => {
          setTasks(detail.tasks);
          setMemories(detail.memories);
        })
        .catch(() => undefined);
    }, pollMilliseconds);
    return () => clearInterval(timer);
  }, [selectedId, hasRunningTask]);

  function select(bot: Bot) {
    setCreating(false);
    setError(null);
    setNotice(null);
    setTasks([]);
    setMemories([]);
    setRoutineTime(bot.routine?.time ?? "");
    setRoutineInstruction(bot.routine?.instruction ?? "");
    setRoutineFrequency(bot.routine?.frequency ?? "daily");
    setRoutineDay(bot.routine?.day ?? null);
    setSelectedId(bot.id);
  }

  function replaceBot(updated: Bot) {
    setBots((current) => current.map((bot) => (bot.id === updated.id ? updated : bot)));
  }

  async function design(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDesigning(true);
    setError(null);
    try {
      const response = await fetch("/api/bots/design", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ preferences }),
      });
      const data = (await response.json()) as { bots?: Bot[]; skipped?: string[]; error?: string };
      if (!response.ok || !data.bots || data.bots.length === 0) {
        setError(data.error ?? data.skipped?.join(" ") ?? "No Doombots could be designed.");
        return;
      }
      const designed = data.bots;
      setBots((current) => [...current, ...designed]);
      setPreferences("");
      select(designed[0]);
      setNotice(`Created ${designed.map((bot) => bot.name).join(", ")}.`);
    } catch {
      setError("DOOMBOT could not be reached. Check that the server is running.");
    } finally {
      setDesigning(false);
    }
  }

  async function saveRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null) {
      return;
    }
    setError(null);
    const response = await fetch(`/api/bots/${selectedId}/routine`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({
        time: routineTime,
        instruction: routineInstruction,
        frequency: routineFrequency,
        day: routineDay,
        enabled: true,
      }),
    });
    const data = (await response.json()) as { bot?: Bot; error?: string };
    if (!response.ok || !data.bot) {
      setError(data.error ?? "The routine could not be saved.");
      return;
    }
    replaceBot(data.bot);
    setNotice(
      data.bot.routine
        ? `Routine saved. It runs ${describeSchedule(data.bot.routine)} while DOOMBOT is running.`
        : "Routine saved.",
    );
  }

  async function setRoutineEnabled(bot: Bot, enabled: boolean) {
    if (!bot.routine) {
      return;
    }
    const response = await fetch(`/api/bots/${bot.id}/routine`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({
        time: bot.routine.time,
        instruction: bot.routine.instruction,
        frequency: bot.routine.frequency,
        day: bot.routine.day,
        enabled,
      }),
    });
    const data = (await response.json()) as { bot?: Bot; error?: string };
    if (data.bot) {
      replaceBot(data.bot);
    } else {
      setError(data.error ?? "The routine could not be changed.");
    }
  }

  async function removeRoutine(bot: Bot) {
    const response = await fetch(`/api/bots/${bot.id}/routine`, { method: "DELETE" });
    const data = (await response.json()) as { bot?: Bot };
    if (data.bot) {
      replaceBot(data.bot);
      setRoutineTime("");
      setRoutineInstruction("");
      setRoutineFrequency("daily");
      setRoutineDay(null);
    }
  }

  async function runRoutineNow(bot: Bot) {
    setError(null);
    const response = await fetch(`/api/bots/${bot.id}/routine/run`, { method: "POST" });
    const data = (await response.json()) as { task?: BotTask; error?: string };
    if (!response.ok || !data.task) {
      setError(data.error ?? "The routine could not be started.");
      return;
    }
    const task = data.task;
    setTasks((current) => [task, ...current]);
    setNotice("Routine started. The result appears in Alerts and in the task list.");
  }

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null) {
      return;
    }
    setError(null);
    const response = await fetch(`/api/bots/${selectedId}/tasks`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ instruction }),
    });
    const data = (await response.json()) as { task?: BotTask; error?: string };
    if (!response.ok || !data.task) {
      setError(data.error ?? "The task could not be assigned.");
      return;
    }
    const task = data.task;
    setTasks((current) => [task, ...current]);
    setInstruction("");
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/bots", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ name: newName, instructions: newInstructions, toolNames: newTools, ...newLook }),
    });
    const data = (await response.json()) as { bot?: Bot; error?: string };
    if (!response.ok || !data.bot) {
      setError(data.error ?? "The Doombot could not be created.");
      return;
    }
    const bot = data.bot;
    setBots((current) => [...current, bot]);
    setNewName("");
    setNewInstructions("");
    setNewTools([]);
    setNewLook(defaultLook(bots.length + 1));
    select(bot);
  }

  async function remove(bot: Bot) {
    const response = await fetch(`/api/bots/${bot.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "The Doombot could not be deleted.");
      return;
    }
    const remaining = bots.filter((item) => item.id !== bot.id);
    setBots(remaining);
    setSelectedId(remaining[0]?.id ?? null);
    setTasks([]);
    setMemories([]);
  }

  async function forget(memoryId: number) {
    if (selectedId === null) {
      return;
    }
    await fetch(`/api/bots/${selectedId}/memory`, {
      method: "DELETE",
      headers: jsonHeaders,
      body: JSON.stringify({ memoryId }),
    });
    setMemories((current) => current.filter((memory) => memory.id !== memoryId));
  }

  function toggleTool(name: string) {
    setNewTools((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:px-8 lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-2">
        <ul className="flex flex-col gap-1">
          {bots.map((bot) => (
            <li key={bot.id}>
              <button
                type="button"
                onClick={() => select(bot)}
                aria-current={!creating && bot.id === selectedId ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  !creating && bot.id === selectedId
                    ? "bg-raised font-medium ring-1 ring-line"
                    : "text-muted hover:bg-raised hover:text-ink"
                }`}
              >
                <BotAvatar look={bot.look} size={32} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{bot.name}</span>
                  <span className={`truncate text-xs ${activityLabel(bot.activity).style}`}>
                    {activityLabel(bot.activity).text}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setError(null);
            setNotice(null);
          }}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm font-medium hover:border-doom hover:text-doom"
        >
          <Icon name="add" className="text-[20px]" />
          New Doombot
        </button>
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        {error && (
          <p role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {notice && (
          <p role="status" className="rounded-xl border border-doom/50 px-4 py-3 text-sm">
            {notice}
          </p>
        )}

        {creating && (
          <form onSubmit={design} className="flex flex-col gap-4 rounded-2xl border border-doom/40 bg-panel p-6">
            <div className="flex items-center gap-2.5">
              <Icon name="auto_awesome" className="text-[22px] text-doom" />
              <h2 className="font-display text-lg font-semibold">Design Doombots for me</h2>
            </div>
            <label htmlFor="preferences" className="text-sm text-muted">
              Describe what you want help with, and when. DOOMBOT picks the jobs, tools and daily routines.
            </label>
            <textarea
              id="preferences"
              value={preferences}
              onChange={(event) => setPreferences(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Every morning at 7:30 tell me the weather and my calendar. Keep an eye on my unread email and tell me what is urgent."
              className="rounded-xl border border-line bg-canvas px-4 py-3 outline-none focus:border-doom"
            />
            <button
              type="submit"
              disabled={designing || preferences.trim().length < 10}
              className="h-10 w-fit rounded-xl bg-doom px-4 text-sm font-semibold text-canvas disabled:opacity-40"
            >
              {designing ? "Designing Doombots" : "Design and create"}
            </button>
          </form>
        )}

        {creating && (
          <form onSubmit={create} className="flex flex-col gap-5 rounded-2xl border border-line bg-panel p-6">
            <h2 className="font-display text-lg font-semibold">Or build one yourself</h2>
            <label className="flex flex-col gap-2 text-sm">
              Name
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                maxLength={40}
                placeholder="Doombot Scout"
                className="h-11 rounded-xl border border-line bg-canvas px-4 outline-none focus:border-doom"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              What is its job?
              <textarea
                value={newInstructions}
                onChange={(event) => setNewInstructions(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="You track my open tasks and tell me which one to do first, with a short reason."
                className="rounded-xl border border-line bg-canvas px-4 py-3 outline-none focus:border-doom"
              />
            </label>
            <div className="flex flex-col gap-3">
              <LookPicker look={newLook} onChange={(change) => setNewLook((current) => ({ ...current, ...change }))} />
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm">Tools it can use</legend>
              {tools.map((tool) => (
                <label key={tool.name} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={newTools.includes(tool.name)}
                    onChange={() => toggleTool(tool.name)}
                    className="mt-1 h-4 w-4 accent-[var(--doom)]"
                  />
                  <span>
                    <span className="font-medium">{tool.name}</span>
                    <span className="block text-muted">{tool.description}</span>
                  </span>
                </label>
              ))}
              <p className="text-xs text-muted">
                Doombots cannot send, delete or spend. Actions like that always go through your approvals.
              </p>
            </fieldset>
            <div className="flex gap-2">
              <button type="submit" className="h-10 rounded-xl bg-doom px-4 text-sm font-semibold text-canvas">
                Create Doombot
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="h-10 rounded-xl border border-line px-4 text-sm font-medium hover:bg-raised"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!creating && selected && (
          <>
            <BotProfile
              key={selected.id}
              bot={selected}
              onChange={replaceBot}
              onDelete={(bot) => void remove(bot)}
              onError={setError}
            />

            <form onSubmit={assign} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-6">
              <label htmlFor="assign" className="font-display text-base font-semibold">
                Assign a task
              </label>
              <textarea
                id="assign"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={`Tell ${selected.name} what to do`}
                className="rounded-xl border border-line bg-canvas px-4 py-3 outline-none focus:border-doom"
              />
              <button
                type="submit"
                disabled={instruction.trim().length === 0}
                className="h-10 w-fit rounded-xl bg-doom px-4 text-sm font-semibold text-canvas disabled:opacity-40"
              >
                Assign task
              </button>
            </form>

            <form onSubmit={saveRoutine} className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Icon name="schedule" className="text-[22px] text-doom" />
                  <h3 className="font-display text-base font-semibold">Routine</h3>
                </div>
                {selected.routine && (
                  <span className={`text-sm ${selected.routine.enabled ? "text-doom" : "text-muted"}`}>
                    {selected.routine.enabled ? `Runs ${describeSchedule(selected.routine)}` : "Paused"}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex flex-col gap-2 text-sm">
                  How often
                  <select
                    value={routineFrequency}
                    onChange={(event) => {
                      const next = event.target.value as Frequency;
                      setRoutineFrequency(next);
                      setRoutineDay(dayRules[next]?.fallback ?? null);
                    }}
                    className="h-11 rounded-xl border border-line bg-canvas px-3 outline-none focus:border-doom"
                  >
                    {frequencies.map((frequency) => (
                      <option key={frequency} value={frequency}>
                        {frequencyLabels[frequency]}
                      </option>
                    ))}
                  </select>
                </label>
                {routineFrequency === "weekly" && (
                  <label className="flex flex-col gap-2 text-sm">
                    Day
                    <select
                      value={routineDay ?? 1}
                      onChange={(event) => setRoutineDay(Number(event.target.value))}
                      className="h-11 rounded-xl border border-line bg-canvas px-3 outline-none focus:border-doom"
                    >
                      {weekdayNames.map((name, index) => (
                        <option key={name} value={index}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {routineFrequency === "monthly" && (
                  <label className="flex flex-col gap-2 text-sm">
                    Date
                    <select
                      value={routineDay ?? 1}
                      onChange={(event) => setRoutineDay(Number(event.target.value))}
                      className="h-11 rounded-xl border border-line bg-canvas px-3 outline-none focus:border-doom"
                    >
                      {Array.from({ length: dayRules.monthly?.max ?? 28 }, (_, index) => index + 1).map((date) => (
                        <option key={date} value={date}>
                          {date}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="flex flex-col gap-2 text-sm">
                  Time (Dubai)
                  <input
                    type="time"
                    value={routineTime}
                    onChange={(event) => setRoutineTime(event.target.value)}
                    className="h-11 rounded-xl border border-line bg-canvas px-3 outline-none focus:border-doom"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-2 text-sm">
                  What to do
                  <input
                    value={routineInstruction}
                    onChange={(event) => setRoutineInstruction(event.target.value)}
                    maxLength={1000}
                    placeholder="Check my calendar and list today's events"
                    className="h-11 rounded-xl border border-line bg-canvas px-4 outline-none focus:border-doom"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={routineTime.length === 0 || routineInstruction.trim().length === 0}
                  className="h-10 rounded-xl bg-doom px-4 text-sm font-semibold text-canvas disabled:opacity-40"
                >
                  Save routine
                </button>
                {selected.routine && (
                  <>
                    <button
                      type="button"
                      onClick={() => void runRoutineNow(selected)}
                      className="h-10 rounded-xl border border-line px-4 text-sm font-medium hover:bg-raised"
                    >
                      Run now
                    </button>
                    <button
                      type="button"
                      onClick={() => void setRoutineEnabled(selected, !selected.routine?.enabled)}
                      className="h-10 rounded-xl border border-line px-4 text-sm font-medium hover:bg-raised"
                    >
                      {selected.routine.enabled ? "Pause routine" : "Resume routine"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeRoutine(selected)}
                      className="h-10 rounded-xl px-4 text-sm text-muted hover:bg-raised hover:text-danger"
                    >
                      Remove routine
                    </button>
                  </>
                )}
              </div>
            </form>

            <section className="flex flex-col gap-3">
              <h3 className="font-display text-base font-semibold">Tasks</h3>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted">No tasks yet. Assign one above, or ask in Chat.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {tasks.map((task) => (
                    <li key={task.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span className={`font-medium ${statusStyles[task.status] ?? ""}`}>
                          {task.status === "running" ? "Working" : task.status === "done" ? "Done" : "Failed"}
                        </span>
                        <span>
                          {sourceLabels[task.source] ?? "Task"}, {formatTime(task.createdAt)}
                        </span>
                      </div>
                      <p className="font-medium">{task.instruction}</p>
                      {task.result && <Markdown text={task.result} />}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-6">
              <h3 className="font-display text-base font-semibold">Private memory</h3>
              <p className="text-sm text-muted">Only {selected.name} can see these facts. No other Doombot shares them.</p>
              {memories.length === 0 ? (
                <p className="text-sm text-muted">Nothing saved yet. It saves facts here as it works.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {memories.map((memory) => (
                    <li key={memory.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                      <span className="leading-relaxed">{memory.fact}</span>
                      <button
                        type="button"
                        onClick={() => void forget(memory.id)}
                        className="shrink-0 rounded-md px-2 py-1 text-xs text-muted hover:bg-raised hover:text-ink"
                      >
                        Forget
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
