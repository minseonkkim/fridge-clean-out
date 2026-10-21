import type { RecipeSuggestion } from "./suggest";

export interface BuyOneOption {
  /** 살 재료 */
  ingredientId: string;
  /** 이것만 사면 새로 만들 수 있는 요리 */
  recipes: RecipeSuggestion[];
  /** 그 요리들로 살릴 수 있는 버려질 위험 재료 (중복 없이) */
  savesItemIds: string[];
  scoreSum: number;
}

/**
 * "딱 하나만 산다면" 순위 (기획서 5.3절 3단계)
 * 재료 하나만 부족한 레시피를 그 재료별로 묶는다. 대체 재료를 사도 되면 그 재료에도 넣는다.
 * 기준: 살리는 위험 재료 수 → 새로 가능해지는 요리 수 → 점수 합.
 */
export function buyOneRanking(suggestions: RecipeSuggestion[]): BuyOneOption[] {
  const byIngredient = new Map<string, RecipeSuggestion[]>();
  for (const s of suggestions) {
    if (s.missing.length !== 1) continue;
    const [m] = s.missing;
    for (const id of [m.ingredientId, ...m.alternatives]) {
      byIngredient.set(id, [...(byIngredient.get(id) ?? []), s]);
    }
  }

  return [...byIngredient]
    .map(([ingredientId, recipes]) => ({
      ingredientId,
      recipes,
      savesItemIds: [...new Set(recipes.flatMap((r) => r.savesItemIds))],
      scoreSum: Math.round(recipes.reduce((sum, r) => sum + r.score, 0) * 100) / 100,
    }))
    .sort(
      (a, b) =>
        b.savesItemIds.length - a.savesItemIds.length ||
        b.recipes.length - a.recipes.length ||
        b.scoreSum - a.scoreSum ||
        a.ingredientId.localeCompare(b.ingredientId),
    );
}
