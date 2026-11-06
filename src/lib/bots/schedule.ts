import { config } from "@/lib/config";
import type { Frequency } from "@/lib/bots/frequency";

interface DubaiMoment {
  day: string;
  hour: number;
  minute: number;
  weekday: number;
  dayOfMonth: number;
}

export interface ScheduleSpec {
  frequency: Frequency;
  time: string;
  day: number | null;
}

const weekdayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function dubaiMoment(at: Date): DubaiMoment {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(at);
  const read = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: `${read("year")}-${read("month")}-${read("day")}`,
    hour: Number(read("hour")),
    minute: Number(read("minute")),
    weekday: weekdayIndex[read("weekday")] ?? 0,
    dayOfMonth: Number(read("day")),
  };
}

export function routinePeriod(schedule: ScheduleSpec, at: Date): string | null {
  const now = dubaiMoment(at);
  const [hour, minute] = schedule.time.split(":").map(Number);
  const reached = now.hour * 60 + now.minute >= hour * 60 + minute;

  switch (schedule.frequency) {
    case "hourly":
      return now.minute >= minute ? `${now.day}T${String(now.hour).padStart(2, "0")}` : null;
    case "daily":
      return reached ? now.day : null;
    case "weekdays":
      return reached && now.weekday >= 1 && now.weekday <= 5 ? now.day : null;
    case "weekly":
      return reached && now.weekday === schedule.day ? now.day : null;
    case "monthly":
      return reached && now.dayOfMonth === schedule.day ? now.day : null;
  }
}
