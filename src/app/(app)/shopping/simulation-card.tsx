"use client";

import { useMemo } from "react";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import { todayIso } from "@/lib/domain/expiry";
import {
  itemDisplayName,
  type FridgeItem,
  type Preferences,
  type ShoppingItem,
} from "@/lib/domain/fridge";
import { applyPreferences, lookupWithPantry } from "@/lib/planner/preferences";
import { simulateShopping } from "@/lib/shopping/simulate";

const baseLookup = (id: string) => INGREDIENT_BY_ID.get(id);

/** 장보기 목록을 산 것으로 가정한 3일 플랜을 지금과 비교한다 (기획서 5.3절 4단계). */
export function SimulationCard({
  items,
  shopping,
  preferences,
}: {
  items: FridgeItem[];
  shopping: ShoppingItem[];
  preferences: Preferences;
}) {
  const pending = shopping.filter((s) => !s.checked);
  const today = todayIso();
  const result = useMemo(() => {
    if (pending.length === 0) return null;
    const lookup = lookupWithPantry(baseLookup, preferences.disabledPantry);
    return simulateShopping(items, pending, {
      today,
      horizon: 3,
      mealsPerDay: preferences.mealsPerDay,
      recipes: applyPreferences(RECIPES, preferences),
      lookup,
    });
  }, [items, pending, preferences, today]);

  if (!result) return null;
  const byId = new Map(items.map((i) => [i.id, i]));
  const { before, after } = result;

  return (
    <section
      aria-label="목록대로 사면"
      className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-950 dark:bg-sky-950 dark:text-sky-100"
    >
      <p className="font-semibold">목록대로 사면 (3일 기준)</p>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-xs text-sky-800 dark:text-sky-300">끼니</dt>
          <dd className="font-bold">
            {before.meals} → {after.meals}끼
          </dd>
        </div>
        <div>
          <dt className="text-xs text-sky-800 dark:text-sky-300">날짜</dt>
          <dd className="font-bold">
            {before.days} → {after.days}일
          </dd>
        </div>
        <div>
          <dt className="text-xs text-sky-800 dark:text-sky-300">버려질 재료</dt>
          <dd className="font-bold">
            {before.wasted} → {after.wasted}개
          </dd>
        </div>
      </dl>
      {result.rescuedItemIds.length > 0 && (
        <p className="mt-2">
          {result.rescuedItemIds.map((id) => itemDisplayName(byId.get(id)!, baseLookup)).join(", ")}
          을(를) 버리지 않게 돼요.
        </p>
      )}
    </section>
  );
}
