import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID } from "@/data/recipes";
import type { FridgeItem } from "./fridge";
import { recipeAvailability } from "./recipe-view";
import type { Unit } from "./types";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);
const kimchiStew = RECIPE_BY_ID.get("kimchi_stew")!;

function item(ingredientId: string, quantity: number, unit: Unit): FridgeItem {
  return {
    id: ingredientId,
    ingredientId,
    customName: null,
    slot: null,
    storage: "fridge",
    quantity,
    unit,
    purchasedAt: "2026-10-15",
    expiresAt: "2026-10-20",
    expiresManual: false,
    memo: null,
    status: "active",
    closedAt: null,
    createdAt: "2026-10-15T00:00:00Z",
    updatedAt: "2026-10-15T00:00:00Z",
  };
}

const statusOf = (a: ReturnType<typeof recipeAvailability>, ingredientId: string) =>
  a.groups.find((g) => g.options.some((o) => o.ingredientId === ingredientId))!;

describe("레시피 재료 보유/부족", () => {
  it("있음·기본 양념·없음을 구분한다", () => {
    const a = recipeAvailability(kimchiStew, [item("kimchi", 500, "g")], lookup);
    expect(statusOf(a, "kimchi").status).toBe("have");
    expect(statusOf(a, "gochugaru").status).toBe("staple");
    expect(statusOf(a, "pork").status).toBe("missing");
    expect(a.missingRequired).toBe(1);
    expect(a.canCook).toBe(false);
  });

  it("대체 재료 중 하나만 있어도 있음이다", () => {
    const a = recipeAvailability(
      kimchiStew,
      [item("kimchi", 500, "g"), item("tuna_can", 1, "ea")],
      lookup,
    );
    expect(statusOf(a, "pork").status).toBe("have");
    expect(statusOf(a, "pork").items.map((i) => i.ingredientId)).toEqual(["tuna_can"]);
    expect(a.canCook).toBe(true);
  });

  it("있지만 양이 모자라면 표시한다", () => {
    const a = recipeAvailability(
      kimchiStew,
      [item("kimchi", 100, "g"), item("pork", 300, "g")],
      lookup,
    );
    expect(statusOf(a, "kimchi").short).toBe(true);
    expect(statusOf(a, "pork").short).toBe(false);
  });

  it("없는 선택 재료는 요리를 막지 않는다", () => {
    const a = recipeAvailability(
      kimchiStew,
      [item("kimchi", 500, "g"), item("pork", 300, "g")],
      lookup,
    );
    expect(statusOf(a, "tofu").status).toBe("missing");
    expect(statusOf(a, "tofu").required).toBe(false);
    expect(a.canCook).toBe(true);
  });

  it("인분을 바꾸면 필요한 양이 비례한다", () => {
    const a = recipeAvailability(
      kimchiStew,
      [item("kimchi", 300, "g"), item("pork", 300, "g")],
      lookup,
      4,
    );
    expect(statusOf(a, "kimchi").options[0].amount).toBe(400);
    expect(statusOf(a, "kimchi").short).toBe(true);
  });
});
