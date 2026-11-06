"use client";

import { useEffect, useRef } from "react";

type PointerListener = (x: number, y: number) => void;

const listeners = new Set<PointerListener>();
const fullTravelDistance = 200;
let pointerAttached = false;
let pendingFrame = 0;

function attachPointer(): void {
  if (pointerAttached) {
    return;
  }
  pointerAttached = true;
  window.addEventListener("pointermove", (event) => {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(() => {
      listeners.forEach((listener) => listener(event.clientX, event.clientY));
    });
  });
}

export function usePointerLook(travel: number) {
  const svgRef = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    attachPointer();

    const follow: PointerListener = (x, y) => {
      const svg = svgRef.current;
      const eyes = eyesRef.current;
      if (!svg || !eyes) {
        return;
      }
      const box = svg.getBoundingClientRect();
      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      const strength = Math.min(1, distance / fullTravelDistance);
      const moveX = (dx / distance) * strength * travel;
      const moveY = (dy / distance) * strength * travel;
      eyes.style.transform = `translate(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px)`;
    };

    listeners.add(follow);
    return () => {
      listeners.delete(follow);
    };
  }, [travel]);

  return { svgRef, eyesRef };
}
