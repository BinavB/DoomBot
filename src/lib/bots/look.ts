export interface BotLook {
  avatar: string;
  color: string;
}

export interface LookOption {
  id: string;
  label: string;
}

export const avatarOptions: LookOption[] = [
  { id: "visor", label: "Visor" },
  { id: "boxy", label: "Boxy" },
  { id: "round", label: "Round" },
  { id: "antenna", label: "Antenna" },
  { id: "twin", label: "Twin" },
  { id: "cyclops", label: "Cyclops" },
];

export const colorOptions: (LookOption & { hex: string })[] = [
  { id: "mint", label: "Doom green", hex: "#3f9e68" },
  { id: "steel", label: "Steel", hex: "#aab4b0" },
  { id: "gold", label: "Gold", hex: "#cfa84d" },
  { id: "sky", label: "Sky", hex: "#6fb4e0" },
  { id: "lilac", label: "Violet", hex: "#9a86e0" },
  { id: "coral", label: "Ember", hex: "#e8857a" },
];

export const builtInLooks: Record<string, BotLook> = {
  calendar: { avatar: "visor", color: "sky" },
  email: { avatar: "antenna", color: "gold" },
};

export function colorHex(colorId: string): string {
  return (colorOptions.find((color) => color.id === colorId) ?? colorOptions[0]).hex;
}

export function defaultLook(index: number): BotLook {
  return {
    avatar: avatarOptions[(index + 2) % avatarOptions.length].id,
    color: colorOptions[index % colorOptions.length].id,
  };
}

function isOption(options: LookOption[], value: unknown): value is string {
  return typeof value === "string" && options.some((option) => option.id === value);
}

export function readLook(raw: Record<string, unknown>): Partial<BotLook> {
  const look: Partial<BotLook> = {};
  if (isOption(avatarOptions, raw.avatar)) {
    look.avatar = raw.avatar;
  }
  if (isOption(colorOptions, raw.color)) {
    look.color = raw.color;
  }
  return look;
}
