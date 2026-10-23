"use client";

import { useMemo } from "react";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import type { FridgeItem, IsoDate, Preferences } from "@/lib/domain/fridge";
import { buildPlan } from "@/lib/planner/plan";
import { applyPreferences, lookupWithPantry } from "@/lib/planner/preferences";
import { buyOneRanking, type BuyOneOption } from "./buy-one";
import { suggestShopping, type RecipeSuggestion } from "./suggest";

const baseLookup = (id: string) => INGREDIENT_BY_ID.get(id);

/**
 * 장보기 추천. 3일 플랜에서 버려질 위험으로 나온 재료를 살리는 요리에 가산점을 준다.
 * 냉장고 재료·설정이 바뀌면 다시 계산한다.
 */
export function useShoppingSuggestions(
  items: FridgeItem[] | undefined,
  preferences: Preferences | undefined,
  today: IsoDate,
): { suggestions: RecipeSuggestion[]; buyOne: BuyOneOption[] } | null {
  return useMemo(() => {
    if (!items || !preferences) return null;
    const lookup = lookupWithPantry(baseLookup, preferences.disabledPantry);
    const recipes = applyPreferences(RECIPES, preferences);
    const plan = buildPlan(items, {
      today,
      horizon: 3,
      mealsPerDay: preferences.mealsPerDay,
      recipes,
      lookup,
    });
    const riskItemIds = plan.wasted.filter((w) => !w.alreadyExpired).map((w) => w.itemId);
    const suggestions = suggestShopping(items, recipes, { today, lookup, riskItemIds });
    return { suggestions, buyOne: buyOneRanking(suggestions) };
  }, [items, preferences, today]);
}
