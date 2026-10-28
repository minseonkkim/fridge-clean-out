import { describe, expect, it } from "vitest";
import { INGREDIENTS } from "./ingredients";
import { CATEGORY_ICON, INGREDIENT_ICON, ingredientIcon } from "./ingredient-icons";

describe("재료 아이콘", () => {
  it("사전의 모든 재료에 아이콘이 있다", () => {
    const missing = INGREDIENTS.filter((i) => !INGREDIENT_ICON[i.id]).map((i) => i.id);
    expect(missing).toEqual([]);
  });

  it("사전에 없는 아이콘 키는 쓰지 않는다", () => {
    const ids = new Set(INGREDIENTS.map((i) => i.id));
    expect(Object.keys(INGREDIENT_ICON).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("사전에 없는 재료는 카테고리 아이콘, 카테고리도 없으면 장바구니", () => {
    expect(ingredientIcon(null, "seafood")).toBe(CATEGORY_ICON.seafood);
    expect(ingredientIcon(null, null)).toBe("🛒");
    expect(ingredientIcon("egg", "egg_dairy")).toBe("🥚");
  });
});
