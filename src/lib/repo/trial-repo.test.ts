import { describe, expect, it } from "vitest";
import { emptyTrial, type TrialData } from "@/lib/trial/trial-store";
import { TrialRepository } from "./trial-repo";

function memory() {
  let stored: TrialData = emptyTrial();
  return {
    load: () => stored,
    save: (d: TrialData) => {
      stored = d;
    },
    get stored() {
      return stored;
    },
  };
}

describe("TrialRepository", () => {
  it("변경할 때마다 저장하고 다시 불러오면 active 재료만 보인다", async () => {
    const persistence = memory();
    const repo = new TrialRepository(persistence);
    const [egg, milk] = await repo.addItems([
      {
        ingredientId: "egg",
        storage: "fridge",
        quantity: 10,
        unit: "ea",
        purchasedAt: "2026-10-15",
        expiresAt: "2026-11-19",
      },
      {
        ingredientId: "milk",
        storage: "fridge",
        quantity: 900,
        unit: "ml",
        purchasedAt: "2026-10-15",
        expiresAt: "2026-10-22",
      },
    ]);
    await repo.updateItem(egg.id, { quantity: 8 });
    await repo.closeItem(milk.id, "discarded");
    await repo.cook("steamed_egg", [{ itemId: egg.id, amount: 3 }]);

    expect(persistence.stored.items).toHaveLength(2);
    const fresh = await new TrialRepository(persistence).load();
    expect(fresh.items.map((i) => [i.ingredientId, i.quantity])).toEqual([["egg", 5]]);
  });

  it("설정을 저장한다", async () => {
    const repo = new TrialRepository(memory());
    expect((await repo.savePreferences({ mealsPerDay: 3 })).mealsPerDay).toBe(3);
    expect((await repo.load()).preferences.mealsPerDay).toBe(3);
  });
});
