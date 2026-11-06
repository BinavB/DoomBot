import { readLook, type BotLook } from "@/lib/bots/look";
import { dayRules, frequencies, type Frequency } from "@/lib/bots/frequency";

export interface BotRoutineInput {
  instruction: string;
  time: string;
  frequency: Frequency;
  day: number | null;
}

export interface BotInput {
  name: string;
  instructions: string;
  toolNames: string[];
  routine: BotRoutineInput | null;
  look: Partial<BotLook>;
}

const nameLimits = { min: 2, max: 40 };
const instructionLimits = { min: 10, max: 2000 };
const routineLimit = 1000;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFrequency(value: unknown): Frequency | null {
  if (value === undefined || value === null || value === "") {
    return "daily";
  }
  return frequencies.find((frequency) => frequency === value) ?? null;
}

function normalizeDay(frequency: Frequency, value: unknown): number | null | undefined {
  const rule = dayRules[frequency];
  if (!rule) {
    return null;
  }
  if (value === undefined || value === null || value === "") {
    return rule.fallback;
  }
  const day = Number(value);
  return Number.isInteger(day) && day >= rule.min && day <= rule.max ? day : undefined;
}

export function normalizeRoutine(
  instructionValue: unknown,
  timeValue: unknown,
  frequencyValue?: unknown,
  dayValue?: unknown,
): BotRoutineInput | string | null {
  const instruction = readText(instructionValue);
  const time = readText(timeValue);
  if (instruction.length === 0 && time.length === 0) {
    return null;
  }
  if (!timePattern.test(time)) {
    return "Give the routine a time like 07:30 (24-hour, Dubai time).";
  }
  if (instruction.length === 0 || instruction.length > routineLimit) {
    return `Describe the routine in up to ${routineLimit} characters.`;
  }
  const frequency = normalizeFrequency(frequencyValue);
  if (frequency === null) {
    return `Pick a frequency: ${frequencies.join(", ")}.`;
  }
  const day = normalizeDay(frequency, dayValue);
  if (day === undefined) {
    return "Pick a weekday for a weekly routine, or a date from 1 to 28 for a monthly one.";
  }
  return { instruction, time, frequency, day };
}

export function normalizeBotInput(raw: Record<string, unknown>, allowedTools: Set<string>): BotInput | string {
  const name = readText(raw.name);
  const instructions = readText(raw.instructions);
  const requestedTools = Array.isArray(raw.toolNames) ? raw.toolNames : [];

  if (name.length < nameLimits.min || name.length > nameLimits.max) {
    return `Give the bot a name of ${nameLimits.min} to ${nameLimits.max} characters.`;
  }
  if (instructions.length < instructionLimits.min || instructions.length > instructionLimits.max) {
    return `Describe the bot's job in ${instructionLimits.min} to ${instructionLimits.max} characters.`;
  }

  const routine = normalizeRoutine(raw.routineInstruction, raw.routineTime, raw.routineFrequency, raw.routineDay);
  if (typeof routine === "string") {
    return routine;
  }

  const toolNames = [
    ...new Set(requestedTools.filter((tool): tool is string => typeof tool === "string" && allowedTools.has(tool))),
  ];

  return { name, instructions, toolNames, routine, look: readLook(raw) };
}

export function normalizeBotInstructions(value: unknown): string | null {
  const instructions = readText(value);
  return instructions.length >= instructionLimits.min && instructions.length <= instructionLimits.max
    ? instructions
    : null;
}

export function normalizeBotName(value: unknown): string | null {
  const name = readText(value);
  return name.length >= nameLimits.min && name.length <= nameLimits.max ? name : null;
}
