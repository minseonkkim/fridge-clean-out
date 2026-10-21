import { describe, expect, it } from "vitest";
import { RECIPE_BY_ID } from "@/data/recipes";
import { buyOneRanking } from "./buy-one";
import type { RecipeSuggestion } from "./suggest";

function suggestion(
  recipeId: string,
  buy: string,
  opts: { alternatives?: string[]; saves?: string[]; score?: number; missing?: number } = {},
): RecipeSuggestion {
  const missing = Array.from({ length: opts.missing ?? 1 }, (_, i) => ({
    groupNo: i + 1,
    ingredientId: i === 0 ? buy : `${buy}_${i}`,
    amount: 1,
    alternatives: i === 0 ? (opts.alternatives ?? []) : [],
  }));
  return {
    recipe: RECIPE_BY_ID.get(recipeId)!,
    missing,
    usesItemIds: [],
    savesItemIds: opts.saves ?? [],
    score: opts.score ?? 1,
  };
}

describe("딱 하나만 산다면", () => {
  it("버려질 재료를 많이 살리는 재료가 먼저다", () => {
    const ranking = buyOneRanking([
      suggestion("kimchi_stew", "pork", { score: 10 }),
      suggestion("jeyuk_bokkeum", "pork", { score: 10 }),
      suggestion("kongnamul_guk", "green_onion", { saves: ["sprouts"], score: 2 }),
    ]);
    expect(ranking.map((r) => r.ingredientId)).toEqual(["green_onion", "pork"]);
    expect(ranking[0].savesItemIds).toEqual(["sprouts"]);
  });

  it("살리는 재료 수가 같으면 새로 가능해지는 요리가 많은 재료가 먼저다", () => {
    const ranking = buyOneRanking([
      suggestion("kimchi_stew", "pork"),
      suggestion("jeyuk_bokkeum", "pork"),
      suggestion("egg_roll", "egg", { score: 50 }),
    ]);
    expect(ranking[0]).toMatchObject({ ingredientId: "pork" });
    expect(ranking[0].recipes).toHaveLength(2);
  });

  it("요리 수도 같으면 점수 합이 큰 재료가 먼저다", () => {
    const ranking = buyOneRanking([
      suggestion("kimchi_stew", "pork", { score: 3 }),
      suggestion("egg_roll", "egg", { score: 9 }),
    ]);
    expect(ranking.map((r) => r.ingredientId)).toEqual(["egg", "pork"]);
  });

  it("대체 재료를 사도 되면 그 재료로도 가능해진다", () => {
    const ranking = buyOneRanking([
      suggestion("kimchi_stew", "pork", { alternatives: ["tuna_can"] }),
    ]);
    expect(ranking.map((r) => r.ingredientId).sort()).toEqual(["pork", "tuna_can"]);
  });

  it("두 가지가 부족한 요리는 하나만 사서는 안 되므로 넣지 않는다", () => {
    expect(buyOneRanking([suggestion("japchae", "glass_noodles", { missing: 2 })])).toEqual([]);
  });

  it("같은 위험 재료를 여러 요리가 살려도 한 번만 센다", () => {
    const [option] = buyOneRanking([
      suggestion("kimchi_stew", "pork", { saves: ["kimchi"] }),
      suggestion("kimchi_jjim", "pork", { saves: ["kimchi"] }),
    ]);
    expect(option.savesItemIds).toEqual(["kimchi"]);
  });
});
