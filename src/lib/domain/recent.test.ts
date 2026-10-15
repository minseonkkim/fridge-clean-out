import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import type { FridgeItem } from "./fridge";
import { recentPurchases, repurchaseInput } from "./recent";

function item(partial: Partial<FridgeItem>): FridgeItem {
  return {
    id: crypto.randomUUID(),
    ingredientId: null,
    customName: null,
    slot: null,
    storage: "fridge",
    quantity: 1,
    unit: "ea",
    purchasedAt: "2026-10-01",
    expiresAt: "2026-10-08",
    expiresManual: false,
    memo: null,
    status: "active",
    closedAt: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...partial,
  };
}

describe("최근 산 재료", () => {
  const history = [
    item({
      ingredientId: "onion",
      quantity: 3,
      storage: "room",
      createdAt: "2026-10-01T00:00:00Z",
    }),
    item({
      ingredientId: "egg",
      quantity: 10,
      createdAt: "2026-10-05T00:00:00Z",
      status: "used_up",
    }),
    item({
      ingredientId: "onion",
      quantity: 5,
      storage: "room",
      createdAt: "2026-10-10T00:00:00Z",
    }),
    item({ customName: "할머니 김치", createdAt: "2026-10-03T00:00:00Z", status: "discarded" }),
  ];

  it("최근 순으로, 같은 재료는 한 번만, 가장 최근 수량으로", () => {
    expect(
      recentPurchases(history).map((r) => [r.ingredientId ?? r.customName, r.quantity]),
    ).toEqual([
      ["onion", 5],
      ["egg", 10],
      ["할머니 김치", 1],
    ]);
  });

  it("개수를 제한한다", () => {
    expect(recentPurchases(history, 2)).toHaveLength(2);
  });

  it("다시 살 때는 오늘 기준으로 기한을 다시 계산한다", () => {
    const [onion] = recentPurchases(history);
    expect(repurchaseInput(onion, INGREDIENT_BY_ID.get("onion"), "2026-10-15")).toEqual({
      ingredientId: "onion",
      customName: null,
      slot: "pantry",
      storage: "room",
      quantity: 5,
      unit: "ea",
      purchasedAt: "2026-10-15",
      expiresAt: "2026-11-14",
    });
  });
});
