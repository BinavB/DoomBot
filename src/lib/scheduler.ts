import { runAsUser } from "@/lib/auth/context";
import { listActiveUserIds } from "@/lib/auth/users";
import { startTask } from "@/lib/bots/run";
import { listRoutineBots, markRoutineRan } from "@/lib/bots/store";
import { routinePeriod } from "@/lib/bots/schedule";
import { generateBriefing, findBriefing } from "@/lib/briefing/generate";
import { config } from "@/lib/config";
import { currentClock, currentDay } from "@/lib/time";

const tickMilliseconds = 60000;

const globalForScheduler = globalThis as unknown as {
  doombotSchedulerStarted?: boolean;
  doombotBriefingRunning?: boolean;
};

async function briefUser(userId: number): Promise<void> {
  await runAsUser(userId, async () => {
    if (findBriefing(currentDay())) {
      return;
    }
    try {
      await generateBriefing();
    } catch (error) {
      console.error(`Morning briefing failed for user ${userId}:`, error);
    }
  });
}

async function runBriefingsIfDue(): Promise<void> {
  if (globalForScheduler.doombotBriefingRunning || currentClock() !== config.briefingTime) {
    return;
  }
  globalForScheduler.doombotBriefingRunning = true;
  try {
    for (const userId of listActiveUserIds()) {
      await briefUser(userId);
    }
  } finally {
    globalForScheduler.doombotBriefingRunning = false;
  }
}

function runDueRoutines(at: Date): void {
  for (const bot of listRoutineBots()) {
    const routine = bot.routine;
    if (!routine) {
      continue;
    }
    const period = routinePeriod(routine, at);
    if (period === null || period === routine.lastRun) {
      continue;
    }
    markRoutineRan(bot.id, period);
    runAsUser(bot.userId, () =>
      startTask(bot, routine.instruction, "routine").completion.catch((error: unknown) => {
        console.error(`Routine for ${bot.name} failed:`, error);
      }),
    );
  }
}

export function startScheduler(): void {
  if (globalForScheduler.doombotSchedulerStarted) {
    return;
  }
  globalForScheduler.doombotSchedulerStarted = true;
  setInterval(() => {
    runBriefingsIfDue().catch((error: unknown) => {
      console.error("Morning briefings failed:", error);
    });
    try {
      runDueRoutines(new Date());
    } catch (error) {
      console.error("Doombot routines failed:", error);
    }
  }, tickMilliseconds);
}
