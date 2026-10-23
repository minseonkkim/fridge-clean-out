import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import type { ShoppingItem } from "@/lib/domain/fridge";
import { shoppingToFridgeInputs } from "./to-fridge";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

function shopping(partial: Partial<ShoppingItem>): ShoppingItem {
  return {
    id: "s",
    ingredientId: null,
    name: "",
    quantity: null,
    unit: null,
    checked: true,
    fromRecipeId: null,
    createdAt: "2026-10-23T00:00:00Z",
    ...partial,
  };
}

describe("장 본 재료를 냉장고에 넣기", () => {
  it("사전 재료는 기본 보관 방식·권장 기한·칸으로 넣는다", () => {
    const [pork] = shoppingToFridgeInputs(
      [shopping({ ingredientId: "pork", name: "돼지고기", quantity: 150, unit: "g" })],
      lookup,
      "2026-10-23",
    );
    expect(pork).toEqual({
      ingredientId: "pork",
      customName: null,
      slot: "fridge_bottom",
      storage: "fridge",
      quantity: 150,
      unit: "g",
      purchasedAt: "2026-10-23",
      expiresAt: "2026-10-26",
    });
  });

  it("수량이 없으면 개수 단위는 1, g 재료는 1회 사용량", () => {
    const [onion, kimchi] = shoppingToFridgeInputs(
      [
        shopping({ ingredientId: "onion", name: "양파" }),
        shopping({ ingredientId: "kimchi", name: "배추김치" }),
      ],
      lookup,
      "2026-10-23",
    );
    expect([onion.quantity, onion.unit, onion.storage]).toEqual([1, "ea", "room"]);
    expect([kimchi.quantity, kimchi.unit]).toEqual([200, "g"]);
  });

  it("사전에 없는 항목은 이름으로 냉장 보관한다", () => {
    const [x] = shoppingToFridgeInputs([shopping({ name: "고수 한 줌" })], lookup, "2026-10-23");
    expect(x).toMatchObject({
      ingredientId: null,
      customName: "고수 한 줌",
      storage: "fridge",
      quantity: 1,
      expiresAt: "2026-10-30",
    });
  });
});
