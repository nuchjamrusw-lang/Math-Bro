"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type DragFrom = "rack" | "board";
export type DropTarget = { type: "cell"; row: number; col: number } | { type: "rack"; index: number } | null;

interface DragState { tileId: string; from: DragFrom; x: number; y: number; startX: number; startY: number; active: boolean; pointerId: number }

/**
 * Unified mouse + touch drag for tiles using Pointer Events. A press without movement is a click.
 * Drop targets are discovered via data-cell / data-rack-index attributes under the pointer.
 */
export function useTileDrag(handlers: {
  onDrop: (tileId: string, from: DragFrom, target: DropTarget) => void;
  onClick: (tileId: string, from: DragFrom) => void;
  onDragStart?: (tileId: string, from: DragFrom) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const ref = useRef<DragState | null>(null);
  const h = useRef(handlers);
  h.current = handlers;

  const begin = useCallback((e: React.PointerEvent, tileId: string, from: DragFrom) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    const s: DragState = { tileId, from, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, active: false, pointerId: e.pointerId };
    ref.current = s;
    setDrag(s);
  }, []);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const s = ref.current;
      if (!s || e.pointerId !== s.pointerId) return;
      const dist = Math.hypot(e.clientX - s.startX, e.clientY - s.startY);
      const next = { ...s, x: e.clientX, y: e.clientY, active: s.active || dist > 6 };
      if (!s.active && next.active) h.current.onDragStart?.(s.tileId, s.from);
      ref.current = next;
      setDrag(next);
    };
    const up = (e: PointerEvent) => {
      const s = ref.current;
      if (!s || e.pointerId !== s.pointerId) return;
      ref.current = null;
      setDrag(null);
      if (!s.active) return h.current.onClick(s.tileId, s.from);
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const cell = el?.closest("[data-cell]") as HTMLElement | null;
      const slot = el?.closest("[data-rack-index]") as HTMLElement | null;
      let target: DropTarget = null;
      if (cell) {
        const [row, col] = cell.dataset.cell!.split(",").map(Number);
        target = { type: "cell", row, col };
      } else if (slot) target = { type: "rack", index: Number(slot.dataset.rackIndex) };
      h.current.onDrop(s.tileId, s.from, target);
    };
    const cancel = () => { ref.current = null; setDrag(null); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  return { drag: drag?.active ? drag : null, draggingId: drag?.active ? drag.tileId : null, begin };
}
