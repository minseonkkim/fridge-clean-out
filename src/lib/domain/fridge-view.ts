import { daysLeft } from "./expiry";
import { COMPARTMENT_SLOTS, type CompartmentSlot, type FridgeItem, type IsoDate } from "./fridge";
import { defaultSlot } from "./placement";
import type { Ingredient } from "./types";

export const SLOT_LABEL: Record<CompartmentSlot, string> = {
  fridge_top: "위 선반",
  fridge_middle: "가운데 선반",
  fridge_bottom: "아래 선반",
  veg_drawer: "채소칸",
  fridge_door: "문 선반",
  freezer_upper: "냉동 위 서랍",
  freezer_lower: "냉동 아래 서랍",
  pantry: "팬트리 선반",
};

type Lookup = (id: string) => Ingredient | undefined;

/** 칸이 비어 있는 재료(예: 칸 정보 없이 옮겨진 재료)는 자동 배치 규칙으로 칸을 정한다. */
export function slotOf(item: FridgeItem, lookup: Lookup): CompartmentSlot {
  if (item.slot) return item.slot;
  const ingredient = item.ingredientId ? lookup(item.ingredientId) : undefined;
  return defaultSlot(ingredient?.category ?? null, item.storage, ingredient?.id);
}

/** 기한이 급한 순. 같으면 먼저 넣은 것부터. */
export function byUrgency(a: FridgeItem, b: FridgeItem): number {
  return a.expiresAt.localeCompare(b.expiresAt) || a.createdAt.localeCompare(b.createdAt);
}

export interface SlotSection {
  slot: CompartmentSlot;
  label: string;
  items: FridgeItem[];
}

/** 칸별 목록 (칸 순서는 냉장고 위에서 아래, 그다음 냉동·팬트리). 빈 칸은 뺀다. */
export function groupBySlot(items: FridgeItem[], lookup: Lookup): SlotSection[] {
  const groups = new Map<CompartmentSlot, FridgeItem[]>();
  for (const item of items) {
    const slot = slotOf(item, lookup);
    groups.set(slot, [...(groups.get(slot) ?? []), item]);
  }
  return COMPARTMENT_SLOTS.filter((slot) => groups.has(slot)).map((slot) => ({
    slot,
    label: SLOT_LABEL[slot],
    items: groups.get(slot)!.sort(byUrgency),
  }));
}

export interface UrgencySummary {
  /** 기한이 지난 재료 */
  expired: number;
  /** 오늘까지 (D-day) */
  today: number;
  /** 3일 안에 (D-1 ~ D-3) */
  soon: number;
}

/** 냉장고 문 배지("오늘까지 2", "3일 안에 4")에 쓰는 요약 (기획서 3.2절) */
export function urgencySummary(items: FridgeItem[], today: IsoDate): UrgencySummary {
  const summary: UrgencySummary = { expired: 0, today: 0, soon: 0 };
  for (const item of items) {
    const left = daysLeft(item.expiresAt, today);
    if (left < 0) summary.expired++;
    else if (left === 0) summary.today++;
    else if (left <= 3) summary.soon++;
  }
  return summary;
}
