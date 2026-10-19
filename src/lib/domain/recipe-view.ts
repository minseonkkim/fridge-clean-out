import type { FridgeItem } from "./fridge";
import { byUrgency } from "./fridge-view";
import type { Ingredient, Recipe, RecipeIngredient } from "./types";

export type GroupStatus =
  /** 냉장고에 있다 */
  | "have"
  /** 기본 양념이라 있다고 본다 */
  | "staple"
  /** 없다 */
  | "missing";

export interface IngredientGroupView {
  groupNo: number;
  required: boolean;
  status: GroupStatus;
  /** 그룹의 재료들 (대체 재료면 여러 개) */
  options: (RecipeIngredient & { name: string })[];
  /** 냉장고에서 쓸 재료 (기한이 급한 순) */
  items: FridgeItem[];
  /** 냉장고에 있는 양이 필요한 양보다 적다 (같은 단위일 때만 판단) */
  short: boolean;
}

export interface RecipeAvailability {
  groups: IngredientGroupView[];
  /** 필수 재료 중 없는 그룹 수 */
  missingRequired: number;
  canCook: boolean;
}

/**
 * 레시피 재료를 냉장고와 맞춰 본다 (기획서 F3-3: 재료 보유/부족 표시).
 * servings로 인분을 바꾸면 필요한 양도 비례해서 바뀐다.
 */
export function recipeAvailability(
  recipe: Recipe,
  items: FridgeItem[],
  lookup: (id: string) => Ingredient | undefined,
  servings = recipe.servings,
): RecipeAvailability {
  const factor = servings / recipe.servings;
  const active = items.filter((i) => i.status === "active" && i.quantity > 0);
  const byGroup = new Map<number, RecipeIngredient[]>();
  for (const ri of recipe.ingredients) {
    byGroup.set(ri.groupNo, [...(byGroup.get(ri.groupNo) ?? []), ri]);
  }

  const groups: IngredientGroupView[] = [...byGroup].map(([groupNo, options]) => {
    const ids = new Set(options.map((o) => o.ingredientId));
    const matched = active.filter((i) => i.ingredientId && ids.has(i.ingredientId)).sort(byUrgency);
    const staple = options.every((o) => lookup(o.ingredientId)?.isPantryStaple);
    const status: GroupStatus = matched.length > 0 ? "have" : staple ? "staple" : "missing";

    let short = false;
    if (matched.length > 0) {
      const first = options.find((o) => o.ingredientId === matched[0].ingredientId)!;
      const sameKind = matched.filter(
        (i) => i.ingredientId === first.ingredientId && i.unit === first.unit,
      );
      if (sameKind.length === matched.filter((i) => i.ingredientId === first.ingredientId).length) {
        const total = sameKind.reduce((sum, i) => sum + i.quantity, 0);
        short = total + 1e-9 < first.amount * factor;
      }
    }

    return {
      groupNo,
      required: options[0].required,
      status,
      options: options.map((o) => ({
        ...o,
        amount: Math.round(o.amount * factor * 100) / 100,
        name: lookup(o.ingredientId)?.name ?? o.ingredientId,
      })),
      items: matched,
      short,
    };
  });

  const missingRequired = groups.filter((g) => g.required && g.status === "missing").length;
  return { groups, missingRequired, canCook: missingRequired === 0 };
}
