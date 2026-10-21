import { planCookUsage } from "@/lib/domain/cook";
import { daysLeft } from "@/lib/domain/expiry";
import type { FridgeItem, IsoDate } from "@/lib/domain/fridge";
import type { Ingredient, Recipe, RecipeIngredient } from "@/lib/domain/types";
import { urgencyScore, type ScoredUse } from "@/lib/planner/score";

type Lookup = (id: string) => Ingredient | undefined;

/** 버려질 재료를 하나 살릴 때마다 더하는 점수 (기획서 5.3절 가산점) */
export const RISK_BONUS = 5;
export const MAX_MISSING = 2;

export interface MissingGroup {
  groupNo: number;
  /** 사야 할 재료 (대체 재료가 있으면 첫 번째) */
  ingredientId: string;
  amount: number;
  /** 이것 대신 사도 되는 재료 */
  alternatives: string[];
}

export interface RecipeSuggestion {
  recipe: Recipe;
  missing: MissingGroup[];
  /** 이 요리가 쓰는 냉장고 재료 */
  usesItemIds: string[];
  /** 그중 버려질 위험 재료 */
  savesItemIds: string[];
  score: number;
}

export interface SuggestOptions {
  today: IsoDate;
  lookup: Lookup;
  /** 플랜에서 버려질 위험으로 나온 재료 id */
  riskItemIds?: Iterable<string>;
}

/**
 * 최소 장보기 추천 (기획서 5.3절 1~2단계)
 * 1. 필수 재료 그룹 중 1~2개만 부족한 레시피를 찾는다. 보유 재료(기본 양념 제외)를 하나 이상 써야 한다.
 * 2. 부족 개수가 적은 순, 같으면 긴급도 점수가 높은 순. 버려질 재료를 쓰면 가산점.
 */
export function suggestShopping(
  items: FridgeItem[],
  recipes: Recipe[],
  options: SuggestOptions,
): RecipeSuggestion[] {
  const { today, lookup } = options;
  const risk = new Set(options.riskItemIds ?? []);
  const active = items.filter((i) => i.status === "active" && i.quantity > 0);
  const byId = new Map(active.map((i) => [i.id, i]));
  const isStaple = (id: string | null) => Boolean(id && lookup(id)?.isPantryStaple);

  const result: RecipeSuggestion[] = [];
  for (const recipe of recipes) {
    const cook = planCookUsage(recipe, active, lookup);
    if (cook.missingGroups.length === 0 || cook.missingGroups.length > MAX_MISSING) continue;

    const usesItemIds = cook.usages
      .map((u) => u.itemId)
      .filter((id) => !isStaple(byId.get(id)!.ingredientId));
    if (usesItemIds.length === 0) continue;

    const requiredIds = new Set(
      recipe.ingredients.filter((ri) => ri.required).map((ri) => ri.ingredientId),
    );
    const uses: ScoredUse[] = usesItemIds.map((id) => {
      const item = byId.get(id)!;
      return {
        daysLeft: daysLeft(item.expiresAt, today),
        required: requiredIds.has(item.ingredientId!),
      };
    });
    const savesItemIds = usesItemIds.filter((id) => risk.has(id));
    const score = urgencyScore(uses, 0) + RISK_BONUS * savesItemIds.length;

    const groups = new Map<number, RecipeIngredient[]>();
    for (const ri of recipe.ingredients)
      groups.set(ri.groupNo, [...(groups.get(ri.groupNo) ?? []), ri]);
    const missing = cook.missingGroups.map((groupNo) => {
      const [first, ...rest] = groups.get(groupNo)!;
      return {
        groupNo,
        ingredientId: first.ingredientId,
        amount: first.amount,
        alternatives: rest.map((r) => r.ingredientId),
      };
    });

    result.push({
      recipe,
      missing,
      usesItemIds,
      savesItemIds,
      score: Math.round(score * 100) / 100,
    });
  }

  return result.sort(
    (a, b) =>
      a.missing.length - b.missing.length ||
      b.score - a.score ||
      a.recipe.minutes - b.recipe.minutes ||
      a.recipe.id.localeCompare(b.recipe.id),
  );
}
