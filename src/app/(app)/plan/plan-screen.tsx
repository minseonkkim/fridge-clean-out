"use client";

import Link from "next/link";
import { useState } from "react";
import { Segmented } from "@/components/segmented";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID } from "@/data/recipes";
import { dayLabel } from "@/lib/domain/date-label";
import { dDayLabel, daysLeft, todayIso } from "@/lib/domain/expiry";
import { itemDisplayName, type FridgeItem } from "@/lib/domain/fridge";
import type { Horizon, PlannedMeal } from "@/lib/planner/plan";
import { usePlan } from "@/lib/planner/use-plan";
import { useFridge } from "@/lib/repo/fridge-context";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

const HORIZON_OPTIONS = [
  { value: "3", label: "3일" },
  { value: "5", label: "5일" },
  { value: "7", label: "7일" },
  { value: "max", label: "버틸 만큼" },
] as const;
type HorizonValue = (typeof HORIZON_OPTIONS)[number]["value"];

const MEAL_OPTIONS = [
  { value: "1", label: "하루 1끼" },
  { value: "2", label: "2끼" },
  { value: "3", label: "3끼" },
] as const;

const MEAL_NAME = ["첫 끼", "두 번째 끼", "세 번째 끼"];

export function PlanScreen() {
  const { snapshot, status, error } = useFridge();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-6 pb-28">
      <h1 className="text-xl font-bold">식단 플랜</h1>
      {status === "loading" && !snapshot && <p className="text-neutral-500">계산하는 중…</p>}
      {status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {/* snapshot은 브라우저에서만 채워지므로 오늘 날짜를 읽는 계산은 prerender되지 않는다. */}
      {snapshot && <PlanBody items={snapshot.items} />}
    </main>
  );
}

/** 식단 본문. 데스크톱 냉장고 홈의 오른쪽 칸에서도 쓴다. */
export function PlanBody({ items }: { items: FridgeItem[] }) {
  const { snapshot } = useFridge();
  const [horizon, setHorizon] = useState<HorizonValue>("3");
  const [meals, setMeals] = useState<"1" | "2" | "3" | null>(null);
  const today = todayIso();
  const mealsPerDay = meals ? Number(meals) : snapshot!.preferences.mealsPerDay;

  const result = usePlan(items, snapshot!.preferences, {
    today,
    horizon: (horizon === "max" ? "max" : Number(horizon)) as Horizon,
    mealsPerDay,
  });
  if (!result) return null;
  const { plan, summary } = result;
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <>
      <div className="flex flex-col gap-2">
        <Segmented label="기간" value={horizon} options={HORIZON_OPTIONS} onChange={setHorizon} />
        <Segmented
          label="하루 끼니"
          value={String(mealsPerDay) as "1" | "2" | "3"}
          options={MEAL_OPTIONS}
          onChange={setMeals}
        />
      </div>

      <section aria-label="요약" className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950">
        <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
          {summary.headline}
        </p>
        {summary.detail && (
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">{summary.detail}</p>
        )}
      </section>

      {summary.risks.length > 0 && (
        <section
          aria-label="버려질 위험 재료"
          className="rounded-2xl bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950 dark:text-red-100"
        >
          <p className="font-semibold">이대로면 버려질 재료 {summary.risks.length}개</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.risks.map((r) => (
              <li key={r.itemId} className="rounded-full bg-white/70 px-3 py-1 dark:bg-black/30">
                {r.name} · {r.when}
              </li>
            ))}
          </ul>
          <Link href="/shopping" className="mt-3 inline-block underline underline-offset-4">
            조금 사서 살릴 수 있는지 보기
          </Link>
        </section>
      )}

      <ol className="flex flex-col gap-3">
        {plan.days.map((day) => (
          <li
            key={day.date}
            className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <h2 className="mb-2 font-semibold">
              {dayLabel(day.date, today)}
              {day.day > 2 && (
                <span className="ml-2 text-sm font-normal text-neutral-500">{day.day}일 뒤</span>
              )}
            </h2>
            <ul className="flex flex-col gap-2">
              {day.meals.map((meal) => (
                <MealRow
                  key={meal.mealIndex}
                  meal={meal}
                  byId={byId}
                  showMealName={mealsPerDay > 1}
                />
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="text-xs text-neutral-400">
        재료를 넣거나 고치거나 요리를 마치면 플랜이 바로 다시 계산돼요.
      </p>
    </>
  );
}

function MealRow({
  meal,
  byId,
  showMealName,
}: {
  meal: PlannedMeal;
  byId: Map<string, FridgeItem>;
  showMealName: boolean;
}) {
  const recipe = RECIPE_BY_ID.get(meal.recipeId)!;
  const today = todayIso();
  // 이 요리가 살리는 재료: 기한이 3일 이내인 재료
  const saves = meal.usages
    .map((u) => byId.get(u.itemId))
    .filter((i): i is FridgeItem => Boolean(i))
    .filter((i) => !lookup(i.ingredientId ?? "")?.isPantryStaple)
    .map((i) => ({ item: i, left: daysLeft(i.expiresAt, today) }))
    .sort((a, b) => a.left - b.left);

  return (
    <li>
      <Link
        href={`/recipes/${recipe.id}`}
        className="flex min-h-14 flex-col gap-1 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">
            {showMealName && (
              <span className="mr-2 text-xs text-neutral-500">{MEAL_NAME[meal.mealIndex]}</span>
            )}
            {recipe.name}
          </span>
          <span className="shrink-0 text-xs text-neutral-500">{recipe.minutes}분</span>
        </span>
        <span className="flex flex-wrap gap-1 text-xs">
          {saves.map(({ item, left }) => (
            <span
              key={item.id}
              className={`rounded-full px-2 py-0.5 ${
                left <= 1
                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                  : left <= 3
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {itemDisplayName(item, lookup)} {dDayLabel(left)}
            </span>
          ))}
        </span>
      </Link>
      <Link
        href={`/fridge#cook=${recipe.id}`}
        className="mt-1 inline-flex min-h-11 items-center px-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
      >
        🧊 냉장고에서 재료 보기
      </Link>
    </li>
  );
}
