"use client";

import { usePointerLook } from "@/components/use-pointer-look";

const irisTravel = 10;

export function DoomMark({ size = 28 }: { size?: number }) {
  const { svgRef, eyesRef } = usePointerLook(irisTravel);

  return (
    <svg ref={svgRef} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className="shrink-0">
      <path d="M60 8L104 33V87L60 112L16 87V33Z" fill="var(--steel)" />
      <path d="M60 20L93 39V81L60 100L27 81V39Z" fill="var(--panel)" />
      <circle cx="60" cy="60" r="26" fill="var(--canvas)" stroke="var(--doom)" strokeWidth="3" />
      <g ref={eyesRef} style={{ transition: "transform 90ms linear" }}>
        <circle cx="60" cy="60" r="11" fill="var(--doom)" />
        <circle cx="60" cy="60" r="4" fill="var(--canvas)" />
      </g>
      <circle cx="60" cy="14" r="3" fill="var(--signal)" />
      <circle cx="60" cy="106" r="3" fill="var(--signal)" />
    </svg>
  );
}
