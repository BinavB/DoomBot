import { config } from "@/lib/config";

export function currentDay(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone }).format(
    new Date(),
  );
}

export function currentClock(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

export function describeNow(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timezone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());
}
