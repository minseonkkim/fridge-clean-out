"use client";

import { useMemo } from "react";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import type { FridgeItem, IsoDate, Preferences } from "@/lib/domain/fridge";
import { buildPlan, type Horizon, type Plan } from "./plan";
import { applyPreferences, lookupWithPantry } from "./preferences";
import { summarizePlan, type PlanSummary } from "./summary";

const baseLookup = (id: string) => INGREDIENT_BY_ID.get(id);

/**
 * 냉장고 재료·설정이 바뀔 때마다 플랜을 다시 계산한다 (기획서 5.2절: 재료가 등록·수정·요리 완료될 때마다 재계산).
 * 브라우저에서 계산하며 수십 ms 안에 끝난다.
 */
export function usePlan(
  items: FridgeItem[] | undefined,
  preferences: Preferences | undefined,
  options: { today: IsoDate; horizon: Horizon; mealsPerDay?: number },
): { plan: Plan; summary: PlanSummary } | null {
  const { today, horizon, mealsPerDay } = options;
  return useMemo(() => {
    if (!items || !preferences) return null;
    const lookup = lookupWithPantry(baseLookup, preferences.disabledPantry);
    const recipes = applyPreferences(RECIPES, preferences);
    const plan = buildPlan(items, {
      today,
      horizon,
      mealsPerDay: mealsPerDay ?? preferences.mealsPerDay,
      recipes,
      lookup,
    });
    return { plan, summary: summarizePlan(plan, items, lookup, today) };
  }, [items, preferences, today, horizon, mealsPerDay]);
}
