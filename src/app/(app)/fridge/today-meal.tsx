"use client";

import Link from "next/link";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID } from "@/data/recipes";
import { dDayLabel, daysLeft, todayIso } from "@/lib/domain/expiry";
import { itemDisplayName, type FridgeItem, type Preferences } from "@/lib/domain/fridge";
import { usePlan } from "@/lib/planner/use-plan";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

/**
 * 냉장고 홈 상단 "오늘의 한 끼" 카드 (기획서 4.1절 화면 목록).
 * 식단 탭의 기본 플랜(3일)에서 오늘 첫 끼를 그대로 보여 주므로 두 화면의 추천이 어긋나지 않는다.
 */
export function TodayMeal({
  items,
  preferences,
  onShowIngredients,
}: {
  items: FridgeItem[];
  preferences: Preferences;
  onShowIngredients: (recipeId: string) => void;
}) {
  const today = todayIso();
  const result = usePlan(items, preferences, { today, horizon: 3 });
  if (!result || items.length === 0) return null;

  const meal = result.plan.days.find((d) => d.date === today)?.meals[0];
  if (!meal) {
    return (
      <section
        aria-label="오늘의 한 끼"
        className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-50 p-4 text-sm dark:bg-neutral-900"
      >
        <span className="text-neutral-600 dark:text-neutral-300">
          지금 재료로 만들 수 있는 요리가 없어요.
        </span>
        <Link
          href="/shopping"
          className="min-h-11 shrink-0 content-center font-semibold text-emerald-700 dark:text-emerald-300"
        >
          장보기 보기
        </Link>
      </section>
    );
  }

  const recipe = RECIPE_BY_ID.get(meal.recipeId)!;
  const byId = new Map(items.map((i) => [i.id, i]));
  // 가장 급한 재료 하나를 이유로 보여 준다
  const urgent = meal.usages
    .map((u) => byId.get(u.itemId))
    .filter((i): i is FridgeItem => Boolean(i))
    .filter((i) => !lookup(i.ingredientId ?? "")?.isPantryStaple)
    .sort((a, b) => daysLeft(a.expiresAt, today) - daysLeft(b.expiresAt, today))[0];

  return (
    <section
      aria-label="오늘의 한 끼"
      className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-2 dark:bg-amber-950"
    >
      <Link href={`/recipes/${recipe.id}`} className="flex min-h-11 min-w-0 flex-1 flex-col">
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
          오늘의 한 끼 · {recipe.minutes}분
        </span>
        <span className="truncate font-bold text-amber-950 dark:text-amber-50">{recipe.name}</span>
        {urgent && (
          <span className="truncate text-xs text-amber-900 dark:text-amber-100">
            먼저 써야 할 재료: {itemDisplayName(urgent, lookup)} (
            {dDayLabel(daysLeft(urgent.expiresAt, today))})
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={() => onShowIngredients(recipe.id)}
        className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-600 dark:text-amber-100"
      >
        재료 보기
      </button>
    </section>
  );
}
