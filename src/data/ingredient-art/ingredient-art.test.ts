import { describe, expect, it } from "vitest";
import { INGREDIENTS } from "../ingredients";
import { CATEGORY_ART, INGREDIENT_ART, ingredientArtSvg, ingredientArtUrl } from ".";

describe("재료 일러스트", () => {
  it("사전의 모든 재료에 그림이 있다", () => {
    expect(INGREDIENTS.filter((i) => !INGREDIENT_ART[i.id]).map((i) => i.id)).toEqual([]);
  });

  it("사전에 없는 재료 그림은 두지 않는다", () => {
    const ids = new Set(INGREDIENTS.map((i) => i.id));
    expect(Object.keys(INGREDIENT_ART).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("그림마다 올바른 SVG다 (계산 실수로 NaN·undefined가 들어가지 않는다)", () => {
    const bad = INGREDIENTS.filter((i) => {
      const svg = ingredientArtSvg(i.id)!;
      return (
        !svg.startsWith("<svg") ||
        !svg.endsWith("</svg>") ||
        /NaN|undefined|Infinity/.test(svg) ||
        // 쓰는 그라데이션은 모두 정의되어 있다
        [...svg.matchAll(/url\(#(\w+)\)/g)].some(([, id]) => !svg.includes(`id="${id}"`))
      );
    }).map((i) => i.id);
    expect(bad).toEqual([]);
  });

  it("분류마다 대체 그림이 있고, 사전에 없는 재료는 분류 그림을 쓴다", () => {
    for (const c of new Set(INGREDIENTS.map((i) => i.category)))
      expect(CATEGORY_ART[c]).toBeDefined();
    expect(ingredientArtUrl(null, "seafood")).toBe(ingredientArtUrl("unknown", "seafood"));
    expect(ingredientArtUrl(null, null)).toMatch(/^data:image\/svg\+xml/);
  });

  it("같은 재료는 같은 주소를 돌려준다 (한 번만 만든다)", () => {
    expect(ingredientArtUrl("egg", "egg_dairy")).toBe(ingredientArtUrl("egg", "egg_dairy"));
  });
});
