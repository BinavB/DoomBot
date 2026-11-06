export const frequencies = ["hourly", "daily", "weekdays", "weekly", "monthly"] as const;

export type Frequency = (typeof frequencies)[number];

export const frequencyLabels: Record<Frequency, string> = {
  hourly: "Every hour",
  daily: "Every day",
  weekdays: "Weekdays (Mon to Fri)",
  weekly: "Every week",
  monthly: "Every month",
};

export const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const dayRules: Partial<Record<Frequency, { min: number; max: number; fallback: number }>> = {
  weekly: { min: 0, max: 6, fallback: 1 },
  monthly: { min: 1, max: 28, fallback: 1 },
};

export function describeSchedule(schedule: { frequency: Frequency; time: string; day: number | null }): string {
  switch (schedule.frequency) {
    case "hourly":
      return `every hour at minute ${schedule.time.slice(3)}`;
    case "daily":
      return `every day at ${schedule.time}`;
    case "weekdays":
      return `on weekdays at ${schedule.time}`;
    case "weekly":
      return `every ${weekdayNames[schedule.day ?? 1]} at ${schedule.time}`;
    case "monthly":
      return `on day ${schedule.day ?? 1} of each month at ${schedule.time}`;
  }
}
