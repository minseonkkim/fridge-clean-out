import { diffDays } from "@/lib/domain/expiry";
import { itemDisplayName, type FridgeItem, type IsoDate } from "@/lib/domain/fridge";
import type { Ingredient } from "@/lib/domain/types";
import type { Plan } from "./plan";

export interface PlanSummary {
  /** "3일 동안 5끼 가능" */
  headline: string;
  /** 기간을 다 못 채웠을 때 등 보충 설명 */
  detail: string | null;
  /** 버려질 위험 재료 (이름과 언제까지인지) */
  risks: { itemId: string; name: string; when: string; alreadyExpired: boolean }[];
}

type Lookup = (id: string) => Ingredient | undefined;

function whenLabel(expiresAt: IsoDate, today: IsoDate): string {
  const left = diffDays(today, expiresAt);
  if (left < 0) return `${-left}일 지남`;
  if (left === 0) return "오늘까지";
  if (left === 1) return "내일까지";
  return `${left}일 뒤까지`;
}

/** 식단 플랜 요약 (기획서 F3: "N일 동안 M끼 가능", 버려질 위험 재료) */
export function summarizePlan(
  plan: Plan,
  items: FridgeItem[],
  lookup: Lookup,
  today: IsoDate,
): PlanSummary {
  const byId = new Map(items.map((i) => [i.id, i]));
  const risks = plan.wasted.map((w) => ({
    itemId: w.itemId,
    name: itemDisplayName(byId.get(w.itemId) ?? { ingredientId: null, customName: null }, lookup),
    when: whenLabel(w.expiresAt, today),
    alreadyExpired: w.alreadyExpired,
  }));

  if (plan.totalMeals === 0) {
    return {
      headline: "지금 재료로 만들 수 있는 요리가 없어요",
      detail: "장보기 탭에서 조금만 사면 만들 수 있는 요리를 확인해 보세요.",
      risks,
    };
  }

  const headline = `${plan.plannedDays}일 동안 ${plan.totalMeals}끼 가능`;
  let detail: string | null = null;
  if (plan.stoppedEarly && plan.plannedDays < plan.horizonDays) {
    detail = `${plan.plannedDays + 1}일째부터는 재료가 모자라요.`;
  }
  return { headline, detail, risks };
}
