import { calcExpiry } from "@/lib/domain/expiry";
import type { IsoDate, NewItemInput, ShoppingItem } from "@/lib/domain/fridge";
import { defaultSlot } from "@/lib/domain/placement";
import type { Ingredient } from "@/lib/domain/types";

/**
 * 장 본 항목을 냉장고에 넣을 입력으로 바꾼다 (기획서 4장: 체크 후 '냉장고에 넣기').
 * - 오늘 산 것으로 보고 기본 보관 방식·권장 기한·자동 배치 칸을 쓴다.
 * - 수량을 적지 않았으면 개수 단위는 1, g·ml은 1회 사용량으로 넣는다.
 * - 사전에 없는 항목은 이름으로 냉장 보관한다.
 */
export function shoppingToFridgeInputs(
  shopping: ShoppingItem[],
  lookup: (id: string) => Ingredient | undefined,
  today: IsoDate,
): NewItemInput[] {
  return shopping.map((s) => {
    const ingredient = s.ingredientId ? lookup(s.ingredientId) : undefined;
    const storage = ingredient?.defaultStorage ?? "fridge";
    const unit = s.unit ?? ingredient?.defaultUnit ?? "ea";
    const fallback = ingredient && (unit === "g" || unit === "ml") ? ingredient.usePerRecipe : 1;
    return {
      ingredientId: ingredient?.id ?? null,
      customName: ingredient ? null : s.name,
      slot: defaultSlot(ingredient?.category ?? null, storage, ingredient?.id),
      storage,
      quantity: s.quantity && s.quantity > 0 ? s.quantity : fallback,
      unit,
      purchasedAt: today,
      expiresAt: calcExpiry(ingredient, storage, today).expiresAt,
    };
  });
}
