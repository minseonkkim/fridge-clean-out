import type { Unit } from "./types";

export const MAX_STACK = 6;

export type QuantityVisual =
  { kind: "stack"; shown: number; overflow: number | null } | { kind: "fill"; ratio: number };

/**
 * 수량 표현 (기획서 3.3절)
 * - 셀 수 있는 재료(개·팩·단): 개수만큼 쌓되 최대 6개, 넘으면 "×N" 뱃지
 *   (0.5개처럼 1보다 작으면 하나를 반만 채운 것으로 본다)
 * - 무게·부피(g·ml): 용기 채움 정도. reference는 '가득'으로 볼 양.
 */
export function quantityVisual(quantity: number, unit: Unit, reference: number): QuantityVisual {
  if (unit === "g" || unit === "ml") {
    const ratio = reference > 0 ? quantity / reference : 0;
    return { kind: "fill", ratio: Math.max(0, Math.min(1, Math.round(ratio * 100) / 100)) };
  }
  // Math.ceil(0 - 작은 값)은 -0이 되므로 0으로 맞춘다.
  const count = Math.max(0, Math.ceil(quantity - 1e-9));
  return {
    kind: "stack",
    shown: Math.min(count, MAX_STACK),
    overflow: count > MAX_STACK ? count : null,
  };
}

/** 냉장고 화면에서 '가득'으로 볼 양: 지금 양과 1회 사용량의 3배 중 큰 쪽 */
export function fillReference(quantity: number, usePerRecipe: number | undefined): number {
  return Math.max(quantity, (usePerRecipe ?? quantity) * 3);
}
