import { calcExpiry } from "./expiry";
import type { FridgeItem, IsoDate, NewItemInput } from "./fridge";
import { defaultSlot } from "./placement";
import type { Ingredient } from "./types";

/** 최근에 산 재료 (원탭 재등록용, 기획서 F1-2) */
export type RecentPurchase = Pick<
  FridgeItem,
  "ingredientId" | "customName" | "storage" | "quantity" | "unit" | "slot"
>;

function keyOf(item: Pick<FridgeItem, "ingredientId" | "customName">): string {
  return item.ingredientId ?? `custom:${item.customName?.trim()}`;
}

/**
 * 등록 기록(다 쓰거나 버린 것 포함)에서 최근 산 재료를 중복 없이 뽑는다.
 * 같은 재료는 가장 최근에 넣었을 때의 수량·보관 방식을 쓴다.
 */
export function recentPurchases(
  items: Pick<FridgeItem, keyof RecentPurchase | "createdAt">[],
  limit = 12,
): RecentPurchase[] {
  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const seen = new Set<string>();
  const result: RecentPurchase[] = [];
  for (const item of sorted) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      ingredientId: item.ingredientId,
      customName: item.customName,
      storage: item.storage,
      quantity: item.quantity,
      unit: item.unit,
      slot: item.slot,
    });
    if (result.length >= limit) break;
  }
  return result;
}

/** 오늘 다시 산 것으로 등록할 입력. 기한은 오늘 기준으로 다시 계산한다. */
export function repurchaseInput(
  recent: RecentPurchase,
  ingredient: Ingredient | undefined,
  today: IsoDate,
): NewItemInput {
  return {
    ingredientId: recent.ingredientId,
    customName: recent.customName,
    slot: recent.slot ?? defaultSlot(ingredient?.category ?? null, recent.storage, ingredient?.id),
    storage: recent.storage,
    quantity: recent.quantity,
    unit: recent.unit,
    purchasedAt: today,
    expiresAt: calcExpiry(ingredient, recent.storage, today).expiresAt,
  };
}
