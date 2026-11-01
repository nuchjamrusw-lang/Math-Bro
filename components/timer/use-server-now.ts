"use client";
import { useEffect, useRef, useState } from "react";

/** Server-aligned clock: re-renders every `intervalMs` and returns Date.now() corrected by server skew. */
export function useServerNow(serverNow: number, version: unknown, intervalMs = 250) {
  const offset = useRef(0);
  useEffect(() => {
    offset.current = serverNow - Date.now();
  }, [serverNow, version]);
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return Date.now() + offset.current;
}
