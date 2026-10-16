import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID } from "@/data/recipes";
import { planCookUsage } from "./cook";
import type { FridgeItem } from "./fridge";
import type { Unit } from "./types";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);
let seq = 0;

function item(
  ingredientId: string,
  quantity: number,
  unit: Unit,
  expiresAt = "2026-10-20",
): FridgeItem {
  seq++;
  return {
    id: `${ingredientId}-${seq}`,
    ingredientId,
    customName: null,
    slot: null,
    storage: "fridge",
    quantity,
    unit,
    purchasedAt: "2026-10-10",
    expiresAt,
    expiresManual: false,
    memo: null,
    status: "active",
    closedAt: null,
    createdAt: `2026-10-10T00:00:${String(seq).padStart(2, "0")}Z`,
    updatedAt: "2026-10-10T00:00:00Z",
  };
}

// 김치찌개: 김치 200g, [돼지고기 150g | 참치캔 1 | 캔햄 0.5], 두부 0.5(선택), 양파·대파(선택), 고춧가루·다진마늘(필수)
const kimchiStew = RECIPE_BY_ID.get("kimchi_stew")!;

describe("요리 완료 사용량", () => {
  it("대체 그룹에서 기한이 가장 급한 재료를 쓴다", () => {
    const kimchi = item("kimchi", 500, "g");
    const pork = item("pork", 600, "g", "2026-10-18");
    const tuna = item("tuna_can", 2, "ea", "2026-12-01");
    const plan = planCookUsage(kimchiStew, [kimchi, pork, tuna], lookup);
    expect(plan.usages).toEqual(
      expect.arrayContaining([
        { itemId: kimchi.id, amount: 200 },
        { itemId: pork.id, amount: 150 },
      ]),
    );
    expect(plan.usages.find((u) => u.itemId === tuna.id)).toBeUndefined();
    expect(plan.missingGroups).toEqual([]);
  });

  it("하나로 모자라면 같은 재료의 다음 것까지 급한 순으로 쓴다", () => {
    const old = item("kimchi", 120, "g", "2026-10-16");
    const fresh = item("kimchi", 500, "g", "2026-11-30");
    const plan = planCookUsage(kimchiStew, [fresh, old, item("pork", 600, "g")], lookup);
    expect(plan.usages).toEqual(
      expect.arrayContaining([
        { itemId: old.id, amount: 120 },
        { itemId: fresh.id, amount: 80 },
      ]),
    );
  });

  it("단위가 다르면 다 쓴 것으로 처리하고 알린다", () => {
    const tofuInGrams = item("tofu", 300, "g");
    const plan = planCookUsage(
      kimchiStew,
      [item("kimchi", 500, "g"), item("pork", 600, "g"), tofuInGrams],
      lookup,
    );
    expect(plan.usages).toContainEqual({ itemId: tofuInGrams.id, amount: null });
    expect(plan.mismatched).toEqual([tofuInGrams.id]);
  });

  it("인분에 비례해 사용량을 바꾼다", () => {
    const kimchi = item("kimchi", 1000, "g");
    const plan = planCookUsage(kimchiStew, [kimchi, item("pork", 600, "g")], lookup, 4);
    expect(plan.usages).toContainEqual({ itemId: kimchi.id, amount: 400 });
  });

  it("필수 재료가 없으면 알리고, 기본 양념은 없어도 된다", () => {
    const plan = planCookUsage(kimchiStew, [item("kimchi", 500, "g")], lookup);
    // 고기/참치/햄 그룹(2번)만 없음. 고춧가루·다진 마늘은 기본 양념이라 없어도 된다.
    expect(plan.missingGroups).toEqual([2]);
    const gochugaruGroup = kimchiStew.ingredients.find(
      (i) => i.ingredientId === "gochugaru",
    )!.groupNo;
    expect(plan.missingGroups).not.toContain(gochugaruGroup);
  });

  it("등록된 기본 양념은 차감한다", () => {
    const gochugaru = item("gochugaru", 100, "g");
    const plan = planCookUsage(
      kimchiStew,
      [item("kimchi", 500, "g"), item("pork", 600, "g"), gochugaru],
      lookup,
    );
    expect(plan.usages).toContainEqual({ itemId: gochugaru.id, amount: 5 });
  });
});
