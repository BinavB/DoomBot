"use client";

import { BotAvatar } from "@/components/bot-avatar";
import { avatarOptions, colorOptions, type BotLook } from "@/lib/bots/look";

const selectedRing = "ring-2 ring-doom";
const idleRing = "ring-1 ring-line hover:ring-muted";

export function LookPicker({ look, onChange }: { look: BotLook; onChange: (change: Partial<BotLook>) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Robot</legend>
        <div className="flex flex-wrap gap-2">
          {avatarOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ avatar: option.id })}
              aria-pressed={look.avatar === option.id}
              aria-label={option.label}
              title={option.label}
              className={`rounded-2xl bg-raised p-2 transition-transform hover:-translate-y-0.5 ${
                look.avatar === option.id ? selectedRing : idleRing
              }`}
            >
              <BotAvatar look={{ ...look, avatar: option.id }} size={38} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2.5">
          {colorOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ color: option.id })}
              aria-pressed={look.color === option.id}
              aria-label={option.label}
              title={option.label}
              style={{ backgroundColor: option.hex }}
              className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-panel transition-transform hover:scale-110 ${
                look.color === option.id ? "ring-2 ring-ink" : ""
              }`}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
