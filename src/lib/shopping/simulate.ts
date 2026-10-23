import type { FridgeItem, IsoDate, ShoppingItem } from "@/lib/domain/fridge";
import type { Ingredient } from "@/lib/domain/types";
import { buildPlan, type PlanOptions } from "@/lib/planner/plan";
import { shoppingToFridgeInputs } from "./to-fridge";

/** 장보기 목록을 오늘 산 것으로 가정한 가상의 냉장고 재료 */
export function withShopping(
  items: FridgeItem[],
  shopping: ShoppingItem[],
  lookup: (id: string) => Ingredient | undefined,
  today: IsoDate,
): FridgeItem[] {
  const now = `${today}T00:00:00.000Z`;
  const bought = shoppingToFridgeInputs(shopping, lookup, today).map((input, i): FridgeItem => ({
    id: `sim-${shopping[i].id}`,
    ingredientId: input.ingredientId,
    customName: input.customName ?? null,
    slot: input.slot ?? null,
    storage: input.storage,
    quantity: input.quantity,
    unit: input.unit,
    purchasedAt: input.purchasedAt,
    expiresAt: input.expiresAt,
    expiresManual: false,
    memo: null,
    status: "active",
    closedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
  return [...items, ...bought];
}

export interface PlanComparison {
  before: { days: number; meals: number; wasted: number };
  after: { days: number; meals: number; wasted: number };
  /** 목록대로 사면 버려지지 않게 되는 지금 냉장고 재료 */
  rescuedItemIds: string[];
}

/**
 * 장보기 목록을 산 것으로 가정해 플랜을 미리 본다 (기획서 5.3절 4단계).
 * 아직 안 산(체크 안 한) 항목만 가정한다. 이미 산 항목은 '냉장고에 넣기'로 반영된다.
 */
export function simulateShopping(
  items: FridgeItem[],
  shopping: ShoppingItem[],
  options: PlanOptions,
): PlanComparison {
  const pending = shopping.filter((s) => !s.checked);
  const before = buildPlan(items, options);
  const after = buildPlan(withShopping(items, pending, options.lookup, options.today), options);

  const wastedBefore = new Set(before.wasted.filter((w) => !w.alreadyExpired).map((w) => w.itemId));
  const wastedAfter = new Set(after.wasted.map((w) => w.itemId));
  // 새로 산(가상) 재료가 남는 것은 '버려질 위험'이 아니라 다음 장보기 몫이므로 비교에서 뺀다.
  const realWastedAfter = [...wastedAfter].filter((id) => !id.startsWith("sim-"));

  const count = (p: typeof before, wasted: number) => ({
    days: p.plannedDays,
    meals: p.totalMeals,
    wasted,
  });

  return {
    before: count(before, wastedBefore.size),
    after: count(after, realWastedAfter.length),
    rescuedItemIds: [...wastedBefore].filter((id) => !wastedAfter.has(id)),
  };
}
