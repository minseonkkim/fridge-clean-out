import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID, RECIPES } from "@/data/recipes";
import { classifyStep, stepIngredients } from "./step-action";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

describe("조리 단계 동작 분류", () => {
  it.each([
    ["김치와 햄, 양파를 잘게 썬다.", "chop"],
    ["기름에 대파를 볶다가 김치·햄·양파를 넣고 3분 볶는다.", "stirfry"],
    ["멸치로 육수 400ml를 낸다.", "boil"],
    ["170도 기름에 두 번 튀긴다.", "fry"],
    ["껍질 쪽부터 굽는다.", "grill"],
    ["간장·식초·설탕으로 무친다.", "mix"],
    ["찹쌀을 4시간 이상 불린다.", "soak"],
    ["랩을 씌워 전자레인지에 돌린다.", "microwave"],
    ["에어프라이어 200도에서 굽는다.", "air_fryer"],
    ["밥 위에 낫또·노른자·무순을 올린다.", "serve"],
    ["두부·고추·마늘을 넣고 한소끔 끓인다.", "boil"],
  ])("%s → %s", (text, action) => {
    expect(classifyStep(text)).toBe(action);
  });

  it("레시피의 모든 단계가 어떤 장면으로든 분류된다", () => {
    for (const r of RECIPES) for (const s of r.steps) expect(classifyStep(s.text)).toBeTruthy();
  });
});

describe("단계에 나오는 재료", () => {
  it("문장에 나온 재료를 찾는다 (별칭 포함)", () => {
    const r = RECIPE_BY_ID.get("kimchi_fried_rice")!;
    expect(stepIngredients(r, "김치와 햄, 양파를 잘게 썬다.", lookup)).toEqual([
      "kimchi",
      "ham",
      "onion",
    ]);
  });

  it("한 글자 재료는 다른 낱말 속에 섞여 있으면 고르지 않는다", () => {
    const r = RECIPE_BY_ID.get("radish_rice")!;
    // '무'는 찾지만 '무쳐'의 '무'는 아니다
    expect(stepIngredients(r, "무는 굵게 채 썬다.", lookup)).toContain("radish");
    expect(stepIngredients(r, "양념에 무쳐 대파를 올린다.", lookup)).toEqual(["green_onion"]);
  });

  it("재료가 안 나오면 기본 양념이 아닌 필수 재료로 채운다", () => {
    const r = RECIPE_BY_ID.get("kimchi_fried_rice")!;
    const ids = stepIngredients(r, "참기름을 두르고 달걀프라이를 올린다.", lookup);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(lookup(id)?.isPantryStaple).toBeFalsy();
  });
});
