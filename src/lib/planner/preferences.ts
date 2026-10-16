import type { Preferences } from "@/lib/domain/fridge";
import type { Ingredient, Recipe } from "@/lib/domain/types";

type Lookup = (id: string) => Ingredient | undefined;

/**
 * 사용자 설정을 레시피에 반영한다 (기획서 5.1절 사용자 설정).
 * - 못 먹는 재료: 대체 재료가 있으면 그 재료만 빼고, 필수 그룹이 비면 레시피를 뺀다. 선택 재료면 그냥 뺀다.
 * - 조리도구: 레시피에 필요한 도구가 하나라도 없으면 뺀다.
 */
export function applyPreferences(
  recipes: Recipe[],
  prefs: Pick<Preferences, "excludedIngredientIds" | "tools">,
): Recipe[] {
  const excluded = new Set(prefs.excludedIngredientIds);
  const tools = new Set(prefs.tools);
  const result: Recipe[] = [];

  for (const recipe of recipes) {
    if (!recipe.tools.every((t) => tools.has(t))) continue;
    if (excluded.size === 0) {
      result.push(recipe);
      continue;
    }
    const kept = recipe.ingredients.filter((ri) => !excluded.has(ri.ingredientId));
    const requiredGroups = new Set(
      recipe.ingredients.filter((ri) => ri.required).map((ri) => ri.groupNo),
    );
    const keptGroups = new Set(kept.map((ri) => ri.groupNo));
    if ([...requiredGroups].every((g) => keptGroups.has(g))) {
      result.push(
        kept.length === recipe.ingredients.length ? recipe : { ...recipe, ingredients: kept },
      );
    }
  }
  return result;
}

/**
 * 끈 기본 양념을 반영한 재료 조회. 끈 양념은 '있다고 가정'하지 않고 냉장고에 있어야 한다.
 */
export function lookupWithPantry(lookup: Lookup, disabledPantry: string[]): Lookup {
  if (disabledPantry.length === 0) return lookup;
  const disabled = new Set(disabledPantry);
  return (id) => {
    const ingredient = lookup(id);
    return ingredient && disabled.has(id) ? { ...ingredient, isPantryStaple: false } : ingredient;
  };
}
