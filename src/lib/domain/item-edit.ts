import { calcExpiry } from "./expiry";
import type { FridgeItem, IsoDate, ItemPatch } from "./fridge";
import { defaultSlot } from "./placement";
import type { Ingredient, Storage, Unit } from "./types";

/**
 * 보관 방식을 바꿀 때의 변경 내용 (기획서 F1: 보관 방식을 바꾸면 기한 재계산).
 * - 기한은 오늘부터 새 보관 방식 기준으로 다시 잡는다 (예: 냉장 D-1 고기를 얼리면 냉동 90일).
 * - 사용자가 직접 정한 기한은 바꾸지 않는다.
 * - 칸은 새 보관 구역의 기본 칸으로 옮긴다.
 */
export function storageChangePatch(
  item: FridgeItem,
  storage: Storage,
  ingredient: Ingredient | undefined,
  today: IsoDate,
): ItemPatch {
  if (storage === item.storage) return {};
  const patch: ItemPatch = {
    storage,
    slot: defaultSlot(ingredient?.category ?? null, storage, ingredient?.id),
  };
  if (!item.expiresManual) patch.expiresAt = calcExpiry(ingredient, storage, today).expiresAt;
  return patch;
}

/** 수량 스테퍼 한 칸 */
export function quantityStep(unit: Unit, quantity: number): number {
  if (unit === "g" || unit === "ml") return quantity >= 1000 ? 100 : 50;
  // 개수 단위는 1씩. 반 개처럼 1보다 작은 소수가 남았을 때만 0.25씩.
  return quantity < 1 && !Number.isInteger(quantity) ? 0.25 : 1;
}

/** 스테퍼로 늘리거나 줄인 수량. 0 아래로 내려가지 않고, 칸 단위에 맞춰 반올림한다. */
export function stepQuantity(unit: Unit, quantity: number, direction: 1 | -1): number {
  const step = quantityStep(unit, quantity);
  const eps = 1e-9;
  const next =
    direction > 0
      ? Math.floor(quantity / step + eps) * step + step
      : Math.ceil(quantity / step - eps) * step - step;
  return Math.max(0, Math.round(next * 100) / 100);
}

/** 상세 시트에서 고친 내용 중 실제로 바뀐 것만 */
export function diffPatch(item: FridgeItem, draft: ItemPatch): ItemPatch {
  const patch: ItemPatch = {};
  for (const key of Object.keys(draft) as (keyof ItemPatch)[]) {
    if (draft[key] !== undefined && draft[key] !== item[key]) {
      (patch as Record<string, unknown>)[key] = draft[key];
    }
  }
  return patch;
}
