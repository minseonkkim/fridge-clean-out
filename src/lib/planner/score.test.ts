import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID, RECIPES } from "@/data/recipes";
import { applyPreferences, lookupWithPantry } from "./preferences";
import { itemUrgency, urgencyScore } from "./score";

describe("긴급도 점수", () => {
  it("기획서 식 그대로 계산한다", () => {
    // 오늘(d=0) 기준 남은 0일: 10/1 + 0.4 = 10.4, 남은 4일: 10/5 + 0.4 = 2.4
    expect(itemUrgency(0, 0)).toBeCloseTo(10.4);
    expect(itemUrgency(4, 0)).toBeCloseTo(2.4);
    // 이틀 뒤(d=2)에 계획하면 남은 4일 재료는 남은 2일처럼 급해진다: 10/3 + 0.4
    expect(itemUrgency(4, 2)).toBeCloseTo(10 / 3 + 0.4);
    // 이미 지났으면 최대값
    expect(itemUrgency(1, 3)).toBeCloseTo(10.4);
  });

  it("필수 재료는 1.3, 선택 재료는 1.0 가중치", () => {
    expect(urgencyScore([{ daysLeft: 0, required: true }], 0)).toBeCloseTo(13.52);
    expect(urgencyScore([{ daysLeft: 0, required: false }], 0)).toBeCloseTo(10.4);
  });

  it("곧 상할 재료를 쓰는 요리가 더 높다", () => {
    const urgent = urgencyScore([{ daysLeft: 1, required: true }], 0);
    const relaxed = urgencyScore(
      [
        { daysLeft: 10, required: true },
        { daysLeft: 12, required: true },
      ],
      0,
    );
    expect(urgent).toBeGreaterThan(relaxed);
  });
});

describe("설정 반영", () => {
  const kimchiStew = RECIPE_BY_ID.get("kimchi_stew")!;

  it("못 먹는 재료가 대체 그룹에 있으면 그 재료만 뺀다", () => {
    const [recipe] = applyPreferences([kimchiStew], { excludedIngredientIds: ["pork"], tools: [] });
    expect(recipe.ingredients.map((i) => i.ingredientId)).not.toContain("pork");
    expect(recipe.ingredients.map((i) => i.ingredientId)).toContain("tuna_can");
  });

  it("필수 그룹이 비면 레시피를 뺀다", () => {
    expect(
      applyPreferences([kimchiStew], { excludedIngredientIds: ["kimchi"], tools: [] }),
    ).toEqual([]);
  });

  it("선택 재료는 빼고 레시피는 남긴다", () => {
    const [recipe] = applyPreferences([kimchiStew], { excludedIngredientIds: ["tofu"], tools: [] });
    expect(recipe.ingredients.map((i) => i.ingredientId)).not.toContain("tofu");
  });

  it("없는 조리도구가 필요한 레시피는 뺀다", () => {
    const withoutAirFryer = applyPreferences(RECIPES, { excludedIngredientIds: [], tools: [] });
    expect(withoutAirFryer.map((r) => r.id)).not.toContain("air_fryer_wings");
    const withAirFryer = applyPreferences(RECIPES, {
      excludedIngredientIds: [],
      tools: ["air_fryer"],
    });
    expect(withAirFryer.map((r) => r.id)).toContain("air_fryer_wings");
  });

  it("끈 기본 양념은 더 이상 있다고 가정하지 않는다", () => {
    const lookup = lookupWithPantry((id) => INGREDIENT_BY_ID.get(id), ["gochujang"]);
    expect(lookup("gochujang")?.isPantryStaple).toBe(false);
    expect(lookup("soy_sauce")?.isPantryStaple).toBe(true);
  });
});
