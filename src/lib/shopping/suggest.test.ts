import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID, RECIPES } from "@/data/recipes";
import { addDays } from "@/lib/domain/expiry";
import type { FridgeItem } from "@/lib/domain/fridge";
import type { Unit } from "@/lib/domain/types";
import { suggestShopping } from "./suggest";

const TODAY = "2026-10-21";
const lookup = (id: string) => INGREDIENT_BY_ID.get(id);
const recipes = (...ids: string[]) => ids.map((id) => RECIPE_BY_ID.get(id)!);

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

describe("최소 장보기 추천", () => {
  it("1~2가지만 부족한 레시피를 찾고, 사야 할 재료를 알려 준다", () => {
    const items = [item("kimchi", "kimchi", 500, "g", 30)];
    const [s] = suggestShopping(items, recipes("kimchi_stew"), { today: TODAY, lookup });
    expect(s.recipe.id).toBe("kimchi_stew");
    expect(s.missing).toEqual([
      { groupNo: 2, ingredientId: "pork", amount: 150, alternatives: ["tuna_can", "canned_ham"] },
    ]);
    expect(s.usesItemIds).toEqual(["kimchi"]);
  });

  it("이미 만들 수 있거나 3가지 이상 부족한 레시피는 빼고, 냉장고 재료를 안 쓰는 레시피도 뺀다", () => {
    const items = [item("kimchi", "kimchi", 500, "g", 30), item("pork", "pork", 300, "g", 3)];
    const result = suggestShopping(items, recipes("kimchi_stew", "budae_jjigae", "japchae"), {
      today: TODAY,
      lookup,
    });
    // 김치찌개는 이미 가능, 잡채(당면·당근·양파)는 김치·돼지고기를 안 쓰거나 3가지 이상 부족
    expect(result.map((s) => s.recipe.id)).not.toContain("kimchi_stew");
    expect(result.map((s) => s.recipe.id)).not.toContain("japchae");
  });

  it("부족 개수가 적은 순, 같으면 급한 재료를 쓰는 순이다", () => {
    const items = [
      item("sprouts", "bean_sprouts", 200, "g", 1),
      item("egg", "egg", 10, "ea", 30),
      item("pork", "pork", 300, "g", 2),
    ];
    const result = suggestShopping(items, RECIPES, { today: TODAY, lookup });
    for (let i = 1; i < result.length; i++) {
      expect(result[i].missing.length).toBeGreaterThanOrEqual(result[i - 1].missing.length);
    }
    const oneMissing = result.filter((s) => s.missing.length === 1);
    for (let i = 1; i < oneMissing.length; i++) {
      expect(oneMissing[i].score).toBeLessThanOrEqual(oneMissing[i - 1].score);
    }
  });

  it("버려질 위험 재료를 쓰는 레시피에 가산점을 준다", () => {
    const items = [item("kimchi", "kimchi", 500, "g", 30)];
    const [plain] = suggestShopping(items, recipes("kimchi_stew"), { today: TODAY, lookup });
    const [rescued] = suggestShopping(items, recipes("kimchi_stew"), {
      today: TODAY,
      lookup,
      riskItemIds: ["kimchi"],
    });
    expect(rescued.savesItemIds).toEqual(["kimchi"]);
    expect(rescued.score - plain.score).toBeCloseTo(5);
  });
});
