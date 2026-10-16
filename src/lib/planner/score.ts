/**
 * 긴급도 점수 (기획서 5.2절)
 *
 *   score(r, d) = Σ_{i∈r} w_i · ( 10 / (max(dl_i − d, 0) + 1) + 0.4 )
 *
 * - d: 계획 중인 날 (오늘 = 0)
 * - dl_i: 재료 i의 오늘 기준 남은 일수
 * - w_i: 필수 재료 1.3, 선택 재료 1.0
 *
 * 남은 일수가 적을수록 크게 오르므로, 곧 상할 재료를 쓰는 요리가 먼저 뽑힌다.
 */

export const REQUIRED_WEIGHT = 1.3;
export const OPTIONAL_WEIGHT = 1.0;

export interface ScoredUse {
  /** 오늘 기준 남은 일수 */
  daysLeft: number;
  required: boolean;
}

export function itemUrgency(daysLeft: number, day: number): number {
  return 10 / (Math.max(daysLeft - day, 0) + 1) + 0.4;
}

export function urgencyScore(uses: ScoredUse[], day: number): number {
  return uses.reduce(
    (sum, u) =>
      sum + (u.required ? REQUIRED_WEIGHT : OPTIONAL_WEIGHT) * itemUrgency(u.daysLeft, day),
    0,
  );
}
