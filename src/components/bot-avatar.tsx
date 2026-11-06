"use client";

import type { ReactNode } from "react";
import { usePointerLook } from "@/components/use-pointer-look";
import { colorHex, type BotLook } from "@/lib/bots/look";

const eyeTravel = 4;
const screen = "var(--canvas)";
const glow = "var(--ink)";
const accent = "#cfd8d4";
const signal = "var(--signal)";

interface Eye {
  x: number;
  y: number;
  r: number;
}

interface RobotStyle {
  body: (fill: string) => ReactNode;
  eyes: Eye[];
}

const robotStyles: Record<string, RobotStyle> = {
  visor: {
    body: (fill) => (
      <>
        <rect x="14" y="26" width="92" height="80" rx="26" fill={fill} />
        <rect x="24" y="46" width="72" height="34" rx="16" fill={screen} />
      </>
    ),
    eyes: [
      { x: 44, y: 63, r: 8 },
      { x: 76, y: 63, r: 8 },
    ],
  },
  boxy: {
    body: (fill) => (
      <>
        <line x1="60" y1="24" x2="60" y2="12" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        <circle cx="60" cy="9" r="5.5" fill={signal} />
        <rect x="18" y="24" width="84" height="82" rx="12" fill={fill} />
        <rect x="30" y="44" width="60" height="42" rx="8" fill={screen} />
      </>
    ),
    eyes: [
      { x: 46, y: 65, r: 7 },
      { x: 74, y: 65, r: 7 },
    ],
  },
  round: {
    body: (fill) => (
      <>
        <circle cx="60" cy="64" r="42" fill={fill} />
        <circle cx="16" cy="64" r="8" fill={accent} />
        <circle cx="104" cy="64" r="8" fill={accent} />
        <rect x="36" y="82" width="48" height="6" rx="3" fill={screen} />
      </>
    ),
    eyes: [
      { x: 45, y: 58, r: 9 },
      { x: 75, y: 58, r: 9 },
    ],
  },
  antenna: {
    body: (fill) => (
      <>
        <line x1="44" y1="30" x2="36" y2="12" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        <line x1="76" y1="30" x2="84" y2="12" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        <circle cx="35" cy="10" r="6" fill={signal} />
        <circle cx="85" cy="10" r="6" fill={signal} />
        <rect x="20" y="30" width="80" height="72" rx="28" fill={fill} />
      </>
    ),
    eyes: [
      { x: 44, y: 62, r: 10 },
      { x: 76, y: 62, r: 10 },
    ],
  },
  twin: {
    body: (fill) => (
      <>
        <rect x="22" y="26" width="76" height="76" rx="22" fill={fill} />
        <rect x="10" y="50" width="14" height="28" rx="7" fill={accent} />
        <rect x="96" y="50" width="14" height="28" rx="7" fill={accent} />
        <rect x="32" y="46" width="56" height="34" rx="10" fill={screen} />
      </>
    ),
    eyes: [
      { x: 47, y: 63, r: 6 },
      { x: 73, y: 63, r: 6 },
    ],
  },
  cyclops: {
    body: (fill) => (
      <>
        <rect x="30" y="12" width="60" height="96" rx="28" fill={fill} />
        <circle cx="60" cy="48" r="18" fill={screen} />
        <rect x="46" y="86" width="28" height="6" rx="3" fill={screen} />
      </>
    ),
    eyes: [{ x: 60, y: 48, r: 9 }],
  },
};

export function BotAvatar({ look, size = 40 }: { look: BotLook; size?: number }) {
  const { svgRef, eyesRef } = usePointerLook(eyeTravel);
  const robot = robotStyles[look.avatar] ?? robotStyles.visor;

  return (
    <svg ref={svgRef} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className="shrink-0">
      {robot.body(colorHex(look.color))}
      <g ref={eyesRef} style={{ transition: "transform 90ms linear" }}>
        {robot.eyes.map((eye, index) => (
          <g key={index}>
            <circle cx={eye.x} cy={eye.y} r={eye.r} fill={glow} />
            <circle cx={eye.x + eye.r * 0.25} cy={eye.y - eye.r * 0.3} r={eye.r * 0.3} fill="#fff" opacity="0.85" />
          </g>
        ))}
      </g>
    </svg>
  );
}
