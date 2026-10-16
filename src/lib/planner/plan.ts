import { planCookUsage, type CookUsage } from "@/lib/domain/cook";
import { addDays, daysLeft } from "@/lib/domain/expiry";
import type { FridgeItem, IsoDate } from "@/lib/domain/fridge";
import type { Ingredient, Recipe, Unit } from "@/lib/domain/types";
import { urgencyScore, type ScoredUse } from "./score";

/** 계획 기간: 3·5·7일 또는 버틸 수 있는 만큼 (기획서 F3) */
export type Horizon = 3 | 5 | 7 | "max";

export interface PlanOptions {
  today: IsoDate;
  horizon: Horizon;
  mealsPerDay: number;
  /** 사용자 설정을 반영한 레시피 (applyPreferences) */
  recipes: Recipe[];
  /** 끈 기본 양념을 반영한 재료 조회 (lookupWithPantry) */
  lookup: (id: string) => Ingredient | undefined;
  /** 같은 요리를 다시 내기까지의 최소 간격 (일). 기본 4 */
  repeatGapDays?: number;
  /** '버틸 수 있는 만큼'의 최대 일수. 기본 30 */
  maxDays?: number;
}

export interface PlannedMeal {
  day: number;
  date: IsoDate;
  mealIndex: number;
  recipeId: string;
  usages: CookUsage[];
  score: number;
}

export interface PlanDay {
  day: number;
  date: IsoDate;
  meals: PlannedMeal[];
}

export interface WastedItem {
  itemId: string;
  /** 기한 날짜 */
  expiresAt: IsoDate;
  quantity: number;
  unit: Unit;
  /** 계획을 시작하기 전에 이미 기한이 지난 재료 */
  alreadyExpired: boolean;
}

export interface Plan {
  days: PlanDay[];
  totalMeals: number;
  /** 한 끼 이상 배정된 날 수 ("N일 동안 M끼 가능"의 N) */
  plannedDays: number;
  /** 버려질 위험 재료 (계획대로 해도 기한 안에 다 못 먹는 재료) */
  wasted: WastedItem[];
  /** 기간을 다 채우지 못하고 만들 요리가 없어 멈췄는지 */
  stoppedEarly: boolean;
  /** 버려질 재료를 판단한 기간(일) */
  horizonDays: number;
}

interface Candidate {
  recipe: Recipe;
  usages: CookUsage[];
  score: number;
}

/**
 * 다일 식단 플랜 (기획서 5.2절, 그리디 + 재계산)
 * 1. 오늘부터 하루씩 진행한다. 그날 이전에 기한이 지난 재료는 '버려짐'으로 분리한다.
 * 2. 남은 재료로 만들 수 있는 레시피 후보를 모두 찾는다. 필수 재료 그룹마다 기한이 가장 급한 재료를 고른다.
 * 3. 후보마다 긴급도 점수를 매기고 가장 높은 요리를 그 끼니에 배정한다. 같은 요리는 4일 안에 반복하지 않는다.
 * 4. 배정된 요리의 사용량만큼 재료 수량을 차감하고, 끼니 수만큼 반복한다.
 * 5. 기간을 다 돌거나 만들 요리가 없으면 멈추고, 요약과 버려질 재료 목록을 낸다.
 *
 * 순수 함수다. 같은 입력이면 항상 같은 플랜이 나온다.
 */
export function buildPlan(items: FridgeItem[], options: PlanOptions): Plan {
  const { today, horizon, mealsPerDay, recipes, lookup } = options;
  const repeatGap = options.repeatGapDays ?? 4;
  const dayLimit = horizon === "max" ? (options.maxDays ?? 30) : horizon;

  const active = items.filter((i) => i.status === "active" && i.quantity > 0);
  const byId = new Map(active.map((i) => [i.id, i]));
  const remaining = new Map(active.map((i) => [i.id, i.quantity]));
  const left = new Map(active.map((i) => [i.id, daysLeft(i.expiresAt, today)]));
  const wasted: WastedItem[] = [];
  const lastCooked = new Map<string, number>();
  const days: PlanDay[] = [];
  let stoppedEarly = false;

  const isStaple = (item: FridgeItem) =>
    item.ingredientId ? Boolean(lookup(item.ingredientId)?.isPantryStaple) : false;

  /** 그날 아침 기준, 기한이 지난 재료를 버려짐으로 뺀다. */
  function discardExpired(day: number) {
    for (const [id, qty] of remaining) {
      if (qty <= 0) continue;
      if (left.get(id)! < day) {
        const item = byId.get(id)!;
        wasted.push({
          itemId: id,
          expiresAt: item.expiresAt,
          quantity: qty,
          unit: item.unit,
          alreadyExpired: left.get(id)! < 0,
        });
        remaining.set(id, 0);
      }
    }
  }

  function bestCandidate(day: number): Candidate | null {
    const available = active
      .filter((i) => remaining.get(i.id)! > 0)
      .map((i) => ({ ...i, quantity: remaining.get(i.id)! }));

    let best: Candidate | null = null;
    for (const recipe of recipes) {
      const last = lastCooked.get(recipe.id);
      if (last !== undefined && day - last < repeatGap) continue;

      const cook = planCookUsage(recipe, available, lookup);
      if (cook.missingGroups.length > 0) continue;

      const requiredIngredients = new Set(
        recipe.ingredients.filter((ri) => ri.required).map((ri) => ri.ingredientId),
      );
      const uses: ScoredUse[] = [];
      for (const usage of cook.usages) {
        const item = byId.get(usage.itemId)!;
        if (isStaple(item)) continue;
        uses.push({
          daysLeft: left.get(item.id)!,
          required: requiredIngredients.has(item.ingredientId!),
        });
      }
      // 냉장고 재료를 하나도 쓰지 않는 요리는 소비에 도움이 안 된다.
      if (uses.length === 0) continue;

      const score = urgencyScore(uses, day);
      if (
        !best ||
        score > best.score + 1e-9 ||
        (Math.abs(score - best.score) <= 1e-9 &&
          (recipe.minutes < best.recipe.minutes ||
            (recipe.minutes === best.recipe.minutes && recipe.id < best.recipe.id)))
      ) {
        best = { recipe, usages: cook.usages, score };
      }
    }
    return best;
  }

  planning: for (let day = 0; day < dayLimit; day++) {
    discardExpired(day);
    const date = addDays(today, day);
    const meals: PlannedMeal[] = [];

    for (let mealIndex = 0; mealIndex < mealsPerDay; mealIndex++) {
      const best = bestCandidate(day);
      if (!best) {
        if (meals.length > 0) days.push({ day, date, meals });
        // '버틸 수 있는 만큼'은 원래 요리가 없을 때까지 가는 것이므로 일찍 멈춘 것이 아니다.
        stoppedEarly = horizon !== "max";
        break planning;
      }
      for (const u of best.usages) {
        const qty = remaining.get(u.itemId)!;
        remaining.set(u.itemId, u.amount === null ? 0 : Math.max(0, qty - u.amount));
      }
      lastCooked.set(best.recipe.id, day);
      meals.push({
        day,
        date,
        mealIndex,
        recipeId: best.recipe.id,
        usages: best.usages,
        score: Math.round(best.score * 100) / 100,
      });
    }
    days.push({ day, date, meals });
  }

  const plannedDays = days.filter((d) => d.meals.length > 0).length;
  // 버려질 위험을 보는 기간: 정한 기간, '버틸 수 있는 만큼'이면 계획한 날과 최소 일주일 중 긴 쪽
  const horizonDays = horizon === "max" ? Math.max(plannedDays, 7) : horizon;
  // 계획이 끝난 뒤에도 기간 안에 기한이 오는 남은 재료는 버려질 위험이다.
  // 만들 요리가 없어 멈췄다면, 3일 안에 기한이 오는 남은 재료도 쓸 길이 없으므로 포함한다.
  const SOON = 3;
  for (const [id, qty] of remaining) {
    if (qty <= 0) continue;
    const l = left.get(id)!;
    if (l < horizonDays || (stoppedEarly && l <= SOON)) {
      const item = byId.get(id)!;
      if (isStaple(item)) continue;
      wasted.push({
        itemId: id,
        expiresAt: item.expiresAt,
        quantity: qty,
        unit: item.unit,
        alreadyExpired: left.get(id)! < 0,
      });
    }
  }
  wasted.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.itemId.localeCompare(b.itemId));

  return {
    days,
    totalMeals: days.reduce((n, d) => n + d.meals.length, 0),
    plannedDays,
    wasted,
    stoppedEarly,
    horizonDays,
  };
}
