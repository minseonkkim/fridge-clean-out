import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID } from "@/data/recipes";
import { addDays } from "@/lib/domain/expiry";
import type { FridgeItem, ShoppingItem } from "@/lib/domain/fridge";
import type { Unit } from "@/lib/domain/types";
import { simulateShopping, withShopping } from "./simulate";

const TODAY = "2026-10-23";
const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

function item(
  id: string,
  ingredientId: string,
  quantity: number,
  unit: Unit,
  left: number,
): FridgeItem {
  return {
    id,
    ingredientId,
    customName: null,
    slot: null,
    storage: "fridge",
    quantity,
    unit,
    purchasedAt: TODAY,
    expiresAt: addDays(TODAY, left),
    expiresManual: false,
    memo: null,
    status: "active",
    closedAt: null,
    createdAt: `${TODAY}T00:00:00Z`,
    updatedAt: `${TODAY}T00:00:00Z`,
  };
}

function shopping(
  id: string,
  ingredientId: string,
  quantity: number,
  checked = false,
): ShoppingItem {
  return {
    id,
    ingredientId,
    name: lookup(ingredientId)!.name,
    quantity,
    unit: lookup(ingredientId)!.defaultUnit,
    checked,
    fromRecipeId: null,
    createdAt: `${TODAY}T00:00:00Z`,
  };
}

const options = {
  today: TODAY,
  horizon: 3 as const,
  mealsPerDay: 1,
  recipes: [RECIPE_BY_ID.get("kimchi_stew")!],
  lookup,
};

describe("장보기 시뮬레이션", () => {
  it("목록 재료를 오늘 산 것으로 더한다", () => {
    const sim = withShopping([], [shopping("s1", "pork", 150)], lookup, TODAY);
    expect(sim).toEqual([
      expect.objectContaining({
        id: "sim-s1",
        ingredientId: "pork",
        quantity: 150,
        expiresAt: addDays(TODAY, 3),
      }),
    ]);
  });

  it("돼지고기를 사면 김치찌개를 만들 수 있게 되고, 곧 상할 김치를 살린다", () => {
    const items = [item("kimchi", "kimchi", 200, "g", 1)];
    const result = simulateShopping(items, [shopping("s1", "pork", 150)], options);
    expect(result.before).toEqual({ days: 0, meals: 0, wasted: 1 });
    expect(result.after).toEqual({ days: 1, meals: 1, wasted: 0 });
    expect(result.rescuedItemIds).toEqual(["kimchi"]);
  });

  it("이미 산(체크한) 항목은 가정하지 않는다", () => {
    const items = [item("kimchi", "kimchi", 200, "g", 1)];
    const result = simulateShopping(items, [shopping("s1", "pork", 150, true)], options);
    expect(result.after.meals).toBe(0);
  });
});
