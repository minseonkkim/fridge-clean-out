import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import type { FridgeItem } from "./fridge";
import { diffPatch, stepQuantity, storageChangePatch } from "./item-edit";

const pork = INGREDIENT_BY_ID.get("pork")!;

const item: FridgeItem = {
  id: "1",
  ingredientId: "pork",
  customName: null,
  slot: "fridge_bottom",
  storage: "fridge",
  quantity: 600,
  unit: "g",
  purchasedAt: "2026-10-14",
  expiresAt: "2026-10-17",
  expiresManual: false,
  memo: null,
  status: "active",
  closedAt: null,
  createdAt: "2026-10-14T00:00:00Z",
  updatedAt: "2026-10-14T00:00:00Z",
};

describe("보관 방식 변경", () => {
  it("얼리면 오늘부터 냉동 기한, 냉동 서랍으로 옮긴다", () => {
    expect(storageChangePatch(item, "freezer", pork, "2026-10-16")).toEqual({
      storage: "freezer",
      slot: "freezer_lower",
      expiresAt: "2027-01-14",
    });
  });

  it("직접 정한 기한은 유지한다", () => {
    const patch = storageChangePatch(
      { ...item, expiresManual: true },
      "freezer",
      pork,
      "2026-10-16",
    );
    expect(patch).toEqual({ storage: "freezer", slot: "freezer_lower" });
  });

  it("같은 보관 방식이면 바꿀 것이 없다", () => {
    expect(storageChangePatch(item, "fridge", pork, "2026-10-16")).toEqual({});
  });
});

describe("수량 스테퍼", () => {
  it.each([
    ["ea", 3, 1, 4],
    ["ea", 3, -1, 2],
    ["ea", 1, -1, 0],
    ["ea", 0, -1, 0],
    ["ea", 0.5, 1, 0.75],
    ["ea", 0.5, -1, 0.25],
    ["g", 600, -1, 550],
    ["g", 620, -1, 600],
    ["g", 620, 1, 650],
    ["g", 1200, 1, 1300],
    ["ml", 30, -1, 0],
  ] as const)("%s %d 에서 %d → %d", (unit, quantity, direction, expected) => {
    expect(stepQuantity(unit, quantity, direction)).toBe(expected);
  });
});

describe("diffPatch", () => {
  it("실제로 바뀐 값만 남긴다", () => {
    expect(diffPatch(item, { quantity: 600, memo: "반 남음", storage: "fridge" })).toEqual({
      memo: "반 남음",
    });
  });
});
