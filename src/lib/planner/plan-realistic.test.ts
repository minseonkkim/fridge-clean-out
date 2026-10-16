import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID, INGREDIENTS } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import { addDays, calcExpiry } from "@/lib/domain/expiry";
import type { FridgeItem } from "@/lib/domain/fridge";
import { buildPlan } from "./plan";

const TODAY = "2026-10-15";
const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

/** 사전 재료로 만든 냉장고. 일부는 며칠 전에 산 것으로 해서 기한을 다양하게 만든다. */
function fridge(ids: string[], boughtDaysAgo: (i: number) => number = (i) => i % 5): FridgeItem[] {
  return ids.map((id, i) => {
    const ingredient = INGREDIENT_BY_ID.get(id)!;
    const purchasedAt = addDays(TODAY, -boughtDaysAgo(i));
    return {
      id: `item-${i}-${id}`,
      ingredientId: id,
      customName: null,
      slot: null,
      storage: ingredient.defaultStorage,
      quantity: ingredient.usePerRecipe * 3,
      unit: ingredient.defaultUnit,
      purchasedAt,
      expiresAt: calcExpiry(ingredient, ingredient.defaultStorage, purchasedAt).expiresAt,
      expiresManual: false,
      memo: null,
      status: "active",
      closedAt: null,
      createdAt: `${purchasedAt}T00:00:00Z`,
      updatedAt: `${purchasedAt}T00:00:00Z`,
    };
  });
}

const TYPICAL = [
  "onion",
  "green_onion",
  "garlic",
  "potato",
  "carrot",
  "zucchini",
  "cabbage",
  "bean_sprouts",
  "spinach",
  "tofu",
  "egg",
  "pork",
  "chicken_thigh",
  "kimchi",
  "fish_cake",
  "rice_cake",
  "ramen",
  "cooked_rice",
  "milk",
  "cheese_slice",
  "ham",
  "tuna_can",
  "enoki",
  "cucumber",
  "king_oyster",
  "bread",
  "somyeon",
  "dumplings",
  "squid",
  "perilla_leaf",
];

function timed<T>(fn: () => T): [T, number] {
  const start = performance.now();
  const result = fn();
  return [result, performance.now() - start];
}

describe("현실적인 냉장고로 플래너 돌리기", () => {
  it("재료 30개·7일·하루 3끼를 수십 ms 안에 계산한다", () => {
    const items = fridge(TYPICAL);
    // 첫 실행(JIT 준비) 후 측정
    buildPlan(items, { today: TODAY, horizon: 7, mealsPerDay: 3, recipes: RECIPES, lookup });
    const [plan, ms] = timed(() =>
      buildPlan(items, { today: TODAY, horizon: 7, mealsPerDay: 3, recipes: RECIPES, lookup }),
    );
    expect(plan.totalMeals).toBeGreaterThan(5);
    // 기획서 목표는 수십 ms. 느린 CI 기계를 고려해 여유를 둔다.
    expect(ms).toBeLessThan(150);
  });

  it("재료 200개(기획서 성능 기준)도 1초 안에 계산한다", () => {
    const ids = Array.from({ length: 200 }, (_, i) => INGREDIENTS[i % INGREDIENTS.length].id);
    const items = fridge(ids, (i) => i % 7);
    const [, ms] = timed(() =>
      buildPlan(items, { today: TODAY, horizon: "max", mealsPerDay: 2, recipes: RECIPES, lookup }),
    );
    expect(ms).toBeLessThan(1000);
  });

  it("기한이 1~2일 남은 재료를 첫날 요리부터 쓴다", () => {
    const items = fridge(TYPICAL);
    const plan = buildPlan(items, {
      today: TODAY,
      horizon: 7,
      mealsPerDay: 2,
      recipes: RECIPES,
      lookup,
    });
    const urgentIds = new Set(
      items
        .filter((i) => i.expiresAt <= addDays(TODAY, 1) && !lookup(i.ingredientId!)!.isPantryStaple)
        .map((i) => i.id),
    );
    const firstDayUses = new Set(plan.days[0].meals.flatMap((m) => m.usages.map((u) => u.itemId)));
    const usedUrgent = [...urgentIds].filter((id) => firstDayUses.has(id));
    expect(urgentIds.size).toBeGreaterThan(0);
    expect(usedUrgent.length).toBeGreaterThan(0);
  });

  it("플랜이 실제 재고보다 많이 쓰지 않는다", () => {
    const items = fridge(TYPICAL);
    const plan = buildPlan(items, {
      today: TODAY,
      horizon: 7,
      mealsPerDay: 3,
      recipes: RECIPES,
      lookup,
    });
    const used = new Map<string, number>();
    for (const meal of plan.days.flatMap((d) => d.meals)) {
      for (const u of meal.usages) {
        const item = items.find((i) => i.id === u.itemId)!;
        used.set(u.itemId, (used.get(u.itemId) ?? 0) + (u.amount ?? item.quantity));
      }
    }
    for (const [id, amount] of used) {
      const item = items.find((i) => i.id === id)!;
      expect(amount, id).toBeLessThanOrEqual(item.quantity + 1e-9);
    }
  });
});
