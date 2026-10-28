"use client";

import { createContext, use } from "react";
import type { CompartmentSlot, FridgeItem } from "@/lib/domain/fridge";

export interface DragState {
  item: FridgeItem;
  /** 원래 칸 */
  from: CompartmentSlot;
  x: number;
  y: number;
  /** 지금 손가락 아래 칸 */
  over: CompartmentSlot | null;
}

export interface DragApi {
  drag: DragState | null;
  start: (item: FridgeItem, from: CompartmentSlot, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  end: () => void;
  cancel: () => void;
}

export const DragContext = createContext<DragApi | null>(null);

export function useDrag() {
  return use(DragContext);
}

/** 화면 좌표 아래에 있는 칸 (data-slot) */
export function slotAt(x: number, y: number): CompartmentSlot | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  return (el?.closest("[data-slot]")?.getAttribute("data-slot") as CompartmentSlot | null) ?? null;
}

/** 길게 누르기 판정 시간과 허용 흔들림 */
export const LONG_PRESS_MS = 400;
export const MOVE_TOLERANCE_PX = 8;
