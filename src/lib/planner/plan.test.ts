import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID, RECIPES } from "@/data/recipes";
import { addDays } from "@/lib/domain/expiry";
import type { FridgeItem } from "@/lib/domain/fridge";
import type { Unit } from "@/lib/domain/types";
import { buildPlan, type PlanOptions } from "./plan";

const TODAY = "2026-10-15";
const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

function item(
  id: string,
  ingredientId: string,
  quantity: number,
  unit: Unit,
  daysLeft: number,
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
    expiresAt: addDays(TODAY, daysLeft),
    expiresManual: false,
    memo: null,
    status: "active",
    closedAt: null,
    createdAt: `${TODAY}T00:00:00Z`,
    updatedAt: `${TODAY}T00:00:00Z`,
  };
}

const recipes = (...ids: string[]) => ids.map((id) => RECIPE_BY_ID.get(id)!);

function options(partial: Partial<PlanOptions> = {}): PlanOptions {
  return { today: TODAY, horizon: 3, mealsPerDay: 1, recipes: RECIPES, lookup, ...partial };
}

describe("buildPlan", () => {
  it("기한이 급한 재료를 쓰는 요리를 먼저 배정한다", () => {
    const items = [
      item("sprouts", "bean_sprouts", 200, "g", 1), // 콩나물 D-1
      item("egg", "egg", 10, "ea", 30),
    ];
    const plan = buildPlan(items, options({ recipes: recipes("kongnamul_muchim", "egg_roll") }));
    expect(plan.days[0].meals[0].recipeId).toBe("kongnamul_muchim");
    expect(plan.days[1].meals[0].recipeId).toBe("egg_roll");
  });

  it("배정한 요리만큼 재료를 차감하고, 다 쓰면 그 재료가 필요한 요리는 더 못 만든다", () => {
    const items = [item("tofu", "tofu", 1, "pack", 5)]; // 두부부침은 두부 1모를 다 쓴다
    const plan = buildPlan(items, options({ recipes: recipes("tofu_buchim") }));
    expect(plan.totalMeals).toBe(1);
    expect(plan.days[0].meals[0].usages).toEqual([{ itemId: "tofu", amount: 1 }]);
  });

  it("같은 요리는 4일 안에 반복하지 않는다", () => {
    const items = [item("egg", "egg", 30, "ea", 30)];
    const plan = buildPlan(
      items,
      options({ horizon: 7, recipes: recipes("egg_roll", "steamed_egg") }),
    );
    const sequence = plan.days.flatMap((d) => d.meals.map((m) => m.recipeId));
    for (let i = 0; i < sequence.length; i++) {
      for (let j = i + 1; j < Math.min(i + 4, sequence.length); j++) {
        expect(sequence[i] === sequence[j], `${i}일차와 ${j}일차`).toBe(false);
      }
    }
    // 두 요리를 번갈아 쓰다가 4일 간격이 안 되면 멈춘다
    expect(plan.totalMeals).toBe(2);
    expect(plan.stoppedEarly).toBe(true);
  });

  it("하루 끼니 수만큼 배정한다", () => {
    const items = [item("egg", "egg", 30, "ea", 30), item("tofu", "tofu", 2, "pack", 5)];
    const plan = buildPlan(
      items,
      options({ mealsPerDay: 2, recipes: recipes("egg_roll", "tofu_buchim", "steamed_egg") }),
    );
    expect(plan.days[0].meals).toHaveLength(2);
  });

  it("기한 전에 못 먹는 재료는 버려질 재료로 알려 준다", () => {
    const items = [
      item("sprouts", "bean_sprouts", 200, "g", 0), // 오늘까지인데 레시피가 없음
      item("egg", "egg", 10, "ea", 30),
    ];
    const plan = buildPlan(items, options({ recipes: recipes("egg_roll") }));
    expect(plan.wasted.map((w) => w.itemId)).toEqual(["sprouts"]);
  });

  it("이미 기한이 지난 재료는 계획에 쓰지 않고 표시한다", () => {
    const items = [item("old", "bean_sprouts", 200, "g", -2), item("egg", "egg", 10, "ea", 30)];
    const plan = buildPlan(items, options({ recipes: recipes("kongnamul_muchim", "egg_roll") }));
    expect(plan.days[0].meals[0].recipeId).toBe("egg_roll");
    expect(plan.wasted).toEqual([
      expect.objectContaining({ itemId: "old", alreadyExpired: true, quantity: 200 }),
    ]);
  });

  it("계획 도중 기한이 지나는 재료는 그날 버려짐으로 분리된다", () => {
    // 1끼/일, 김치찌개용 재료가 오늘만 유효 → 첫날 다른 요리가 더 급하면 버려진다
    const items = [
      item("sprouts", "bean_sprouts", 200, "g", 0),
      item("pork", "pork", 150, "g", 1), // 김치찌개 1번 분량
      item("kimchi", "kimchi", 400, "g", 60),
    ];
    const plan = buildPlan(items, options({ recipes: recipes("kongnamul_muchim", "kimchi_stew") }));
    expect(plan.days[0].meals[0].recipeId).toBe("kongnamul_muchim");
    expect(plan.days[1].meals[0].recipeId).toBe("kimchi_stew");
    expect(plan.wasted).toEqual([]);
  });

  it("'버틸 수 있는 만큼'은 요리가 없을 때까지 간다", () => {
    const items = [
      item("egg", "egg", 60, "ea", 40),
      item("onion", "green_onion", 10, "ea", 40),
      item("bread", "bread", 20, "ea", 40),
      item("mayo", "mayonnaise", 500, "g", 40),
    ];
    const plan = buildPlan(
      items,
      options({
        horizon: "max",
        recipes: recipes("egg_roll", "steamed_egg", "mayak_egg", "egg_mayo_sandwich"),
      }),
    );
    expect(plan.plannedDays).toBeGreaterThan(3);
    expect(plan.stoppedEarly).toBe(false);
  });

  it("냉장고 재료를 하나도 안 쓰는 요리는 배정하지 않는다", () => {
    const plan = buildPlan([], options());
    expect(plan.totalMeals).toBe(0);
  });

  it("같은 입력이면 같은 플랜이다", () => {
    const items = [
      item("a", "kimchi", 500, "g", 10),
      item("b", "pork", 600, "g", 2),
      item("c", "egg", 10, "ea", 20),
      item("d", "onion", 3, "ea", 25),
      item("e", "tofu", 1, "pack", 4),
      item("f", "green_onion", 2, "ea", 7),
    ];
    const a = buildPlan(items, options({ horizon: 7, mealsPerDay: 2 }));
    const b = buildPlan([...items].reverse(), options({ horizon: 7, mealsPerDay: 2 }));
    expect(b).toEqual(a);
  });
});
