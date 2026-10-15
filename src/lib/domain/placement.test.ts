import { describe, expect, it } from "vitest";
import { INGREDIENTS } from "@/data/ingredients";
import { SLOT_STORAGE } from "./fridge";
import { defaultSlot } from "./placement";

describe("칸 자동 배치", () => {
  it.each([
    ["vegetable", "fridge", "onion", "veg_drawer"],
    ["fruit", "fridge", "apple", "veg_drawer"],
    ["meat", "fridge", "pork", "fridge_bottom"],
    ["seafood", "fridge", "squid", "fridge_bottom"],
    ["egg_dairy", "fridge", "egg", "fridge_door"],
    ["egg_dairy", "fridge", "milk", "fridge_top"],
    ["sauce", "fridge", "gochujang", "fridge_door"],
    ["side_kimchi", "fridge", "kimchi", "fridge_middle"],
    ["processed", "fridge", "ham", "fridge_middle"],
    ["meat", "freezer", "pork", "freezer_lower"],
    ["vegetable", "freezer", "garlic", "freezer_upper"],
    ["vegetable", "room", "potato", "pantry"],
  ] as const)("%s/%s(%s) → %s", (category, storage, id, slot) => {
    expect(defaultSlot(category, storage, id)).toBe(slot);
  });

  it("사전 외 재료(카테고리 없음)도 보관 방식에 맞는 칸으로 간다", () => {
    expect(defaultSlot(null, "fridge")).toBe("fridge_middle");
    expect(defaultSlot(null, "freezer")).toBe("freezer_upper");
  });

  it("모든 재료의 기본 칸은 기본 보관 방식과 같은 구역이다", () => {
    for (const i of INGREDIENTS) {
      expect(SLOT_STORAGE[defaultSlot(i.category, i.defaultStorage, i.id)], i.id).toBe(
        i.defaultStorage,
      );
    }
  });
});
