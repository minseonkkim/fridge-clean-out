import type { FridgeItem } from "./fridge";
import { byUrgency } from "./fridge-view";
import type { Ingredient, Recipe } from "./types";

export interface CookUsage {
  itemId: string;
  /** null이면 남은 양을 모두 쓴다 */
  amount: number | null;
}

export interface CookPlan {
  usages: CookUsage[];
  /** 단위가 레시피와 달라 '한 번에 다 씀'으로 처리한 재료 (사용자에게 수정 유도) */
  mismatched: string[];
  /** 냉장고에 없어 요리할 수 없는 필수 재료 그룹 번호 */
  missingGroups: number[];
}

type Lookup = (id: string) => Ingredient | undefined;

/**
 * 요리 완료 시 어떤 재료를 얼마나 쓸지 정한다 (기획서 F3-2, 9장 수량 단위 불일치).
 * - 대체 그룹마다 기한이 가장 급한 재료부터 쓴다. 하나로 모자라면 같은 그룹의 다음 재료까지 쓴다.
 * - 단위가 레시피와 같으면 필요한 양만큼, 다르면 그 재료를 다 쓴 것으로 처리하고 mismatched에 담는다.
 * - 기본 양념은 냉장고에 등록돼 있으면 차감하고, 없으면 있다고 가정한다.
 * - 선택 재료는 있으면 쓴다.
 * - 인분을 바꾸면 사용량을 비례해서 늘리거나 줄인다.
 */
export function planCookUsage(
  recipe: Recipe,
  items: FridgeItem[],
  lookup: Lookup,
  servings = recipe.servings,
): CookPlan {
  const factor = servings / recipe.servings;
  const remaining = new Map(
    items.filter((i) => i.status === "active").map((i) => [i.id, i.quantity]),
  );
  const usages = new Map<string, number | null>();
  const mismatched: string[] = [];
  const missingGroups: number[] = [];

  const groups = new Map<number, Recipe["ingredients"]>();
  for (const ri of recipe.ingredients)
    groups.set(ri.groupNo, [...(groups.get(ri.groupNo) ?? []), ri]);

  for (const [groupNo, options] of groups) {
    const required = options[0].required;
    const byIngredient = new Map(options.map((o) => [o.ingredientId, o]));
    const candidates = items
      .filter(
        (i) => i.ingredientId && byIngredient.has(i.ingredientId) && (remaining.get(i.id) ?? 0) > 0,
      )
      .sort(byUrgency);

    if (candidates.length === 0) {
      const staple = options.every((o) => lookup(o.ingredientId)?.isPantryStaple);
      if (required && !staple) missingGroups.push(groupNo);
      continue;
    }

    // 가장 급한 재료의 종류로 필요한 양을 정하고, 같은 종류 재료로 채운다.
    const first = candidates[0];
    const option = byIngredient.get(first.ingredientId!)!;
    let need = option.amount * factor;

    for (const item of candidates.filter((c) => c.ingredientId === first.ingredientId)) {
      if (need <= 0) break;
      const left = remaining.get(item.id)!;
      if (item.unit !== option.unit) {
        usages.set(item.id, null);
        remaining.set(item.id, 0);
        mismatched.push(item.id);
        need = 0;
        break;
      }
      const use = Math.min(left, need);
      usages.set(item.id, (usages.get(item.id) ?? 0) + use);
      remaining.set(item.id, left - use);
      need -= use;
    }
  }

  return {
    usages: [...usages].map(([itemId, amount]) => ({
      itemId,
      amount: amount === null ? null : Math.round(amount * 100) / 100,
    })),
    mismatched,
    missingGroups,
  };
}
