import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import type { FridgeItem } from "./fridge";
import { groupBySlot, urgencySummary } from "./fridge-view";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

function item(partial: Partial<FridgeItem>): FridgeItem {
  return {
    id: crypto.randomUUID(),
    ingredientId: null,
    customName: "x",
    slot: null,
    storage: "fridge",
    quantity: 1,
    unit: "ea",
    purchasedAt: "2026-10-10",
    expiresAt: "2026-10-20",
    expiresManual: false,
    memo: null,
    status: "active",
    closedAt: null,
    createdAt: "2026-10-10T00:00:00Z",
    updatedAt: "2026-10-10T00:00:00Z",
    ...partial,
  };
}

describe("목록 보기", () => {
  it("칸 순서대로 묶고, 칸 안에서는 기한이 급한 순이다", () => {
    const sections = groupBySlot(
      [
        item({ customName: "두부", slot: "fridge_middle", expiresAt: "2026-10-20" }),
        item({ customName: "양파", slot: "pantry", storage: "room" }),
        item({ customName: "김치", slot: "fridge_middle", expiresAt: "2026-10-16" }),
        item({ customName: "우유", slot: "fridge_top" }),
      ],
      lookup,
    );
    expect(sections.map((s) => [s.label, s.items.map((i) => i.customName)])).toEqual([
      ["위 선반", ["우유"]],
      ["가운데 선반", ["김치", "두부"]],
      ["팬트리 선반", ["양파"]],
    ]);
  });

  it("칸 정보가 없는 재료는 자동 배치 규칙의 칸에 넣는다", () => {
    const [section] = groupBySlot([item({ ingredientId: "pork", customName: null })], lookup);
    expect(section.slot).toBe("fridge_bottom");
  });

  it("급한 재료 수를 센다", () => {
    const today = "2026-10-15";
    expect(
      urgencySummary(
        [
          item({ expiresAt: "2026-10-14" }),
          item({ expiresAt: "2026-10-15" }),
          item({ expiresAt: "2026-10-15" }),
          item({ expiresAt: "2026-10-16" }),
          item({ expiresAt: "2026-10-18" }),
          item({ expiresAt: "2026-10-19" }),
        ],
        today,
      ),
    ).toEqual({ expired: 1, today: 2, soon: 2 });
  });
});
