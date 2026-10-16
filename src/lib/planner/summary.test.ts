import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import type { FridgeItem } from "@/lib/domain/fridge";
import type { Plan } from "./plan";
import { summarizePlan } from "./summary";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);
const TODAY = "2026-10-15";

const basePlan: Plan = {
  days: [],
  totalMeals: 5,
  plannedDays: 3,
  wasted: [],
  stoppedEarly: false,
  horizonDays: 3,
};

const sprouts = { id: "s", ingredientId: "bean_sprouts", customName: null } as FridgeItem;
const jam = { id: "j", ingredientId: null, customName: "엄마 잼" } as FridgeItem;

describe("플랜 요약", () => {
  it("N일 동안 M끼 가능", () => {
    expect(summarizePlan(basePlan, [], lookup, TODAY).headline).toBe("3일 동안 5끼 가능");
  });

  it("기간을 다 못 채우면 언제부터 모자란지 알려 준다", () => {
    const summary = summarizePlan(
      { ...basePlan, plannedDays: 2, totalMeals: 3, stoppedEarly: true, horizonDays: 7 },
      [],
      lookup,
      TODAY,
    );
    expect(summary.detail).toBe("3일째부터는 재료가 모자라요.");
  });

  it("만들 요리가 없으면 장보기를 안내한다", () => {
    const summary = summarizePlan(
      { ...basePlan, totalMeals: 0, plannedDays: 0 },
      [],
      lookup,
      TODAY,
    );
    expect(summary.headline).toBe("지금 재료로 만들 수 있는 요리가 없어요");
  });

  it("버려질 재료를 이름과 기한으로 보여 준다", () => {
    const summary = summarizePlan(
      {
        ...basePlan,
        wasted: [
          { itemId: "s", expiresAt: "2026-10-16", quantity: 200, unit: "g", alreadyExpired: false },
          { itemId: "j", expiresAt: "2026-10-13", quantity: 1, unit: "ea", alreadyExpired: true },
        ],
      },
      [sprouts, jam],
      lookup,
      TODAY,
    );
    expect(summary.risks).toEqual([
      { itemId: "s", name: "콩나물", when: "내일까지", alreadyExpired: false },
      { itemId: "j", name: "엄마 잼", when: "2일 지남", alreadyExpired: true },
    ]);
  });
});
