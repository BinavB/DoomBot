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

async function runBriefingIfDue(): Promise<void> {
  if (globalForScheduler.doombotBriefingRunning) {
    return;
  }
  if (currentClock() !== config.briefingTime) {
    return;
  }
  if (findBriefing(currentDay())) {
    return;
  }
  globalForScheduler.doombotBriefingRunning = true;
  try {
    await generateBriefing();
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
    startTask(bot, routine.instruction, "routine").completion.catch((error: unknown) => {
      console.error(`Routine for ${bot.name} failed:`, error);
    });
  }
}

export function startScheduler(): void {
  if (globalForScheduler.doombotSchedulerStarted) {
    return;
  }
  globalForScheduler.doombotSchedulerStarted = true;
  setInterval(() => {
    runBriefingIfDue().catch((error: unknown) => {
      console.error("Morning briefing failed:", error);
    });
    try {
      runDueRoutines(new Date());
    } catch (error) {
      console.error("Doombot routines failed:", error);
    }
  }, tickMilliseconds);
}
