import type { IsoDate } from "./fridge";
import type { Ingredient, Storage } from "./types";

/**
 * 날짜는 모두 'YYYY-MM-DD' 문자열로 다룬다. 시간대에 따라 하루가 밀리지 않도록
 * 내부 계산은 UTC 자정 기준으로 한다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(date: IsoDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 사용자 기기 기준 오늘 */
export function todayIso(now: Date = new Date()): IsoDate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** to - from (일). 오늘이 기한이면 0, 지났으면 음수. */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** 사전에 없는 재료의 보관 방식별 기본 일수 */
export const CUSTOM_ITEM_DAYS: Record<Storage, number> = { fridge: 7, freezer: 30, room: 7 };

export interface ExpiryResult {
  expiresAt: IsoDate;
  days: number;
  /**
   * recommended: 사전 권장 일수
   * not_recommended: 사전에서 권장하지 않는 보관 방식이라 기본 보관 방식 일수로 대신 계산
   * custom: 사전에 없는 재료라 보관 방식별 기본값
   */
  basis: "recommended" | "not_recommended" | "custom";
}

/**
 * 보관 방식별 권장 기한을 계산한다 (기획서 F1, 7.2절 calcExpiry).
 * 기한은 '권장'이며 사용자가 직접 고칠 수 있다.
 */
export function calcExpiry(
  ingredient: Pick<Ingredient, "shelfDays" | "defaultStorage"> | null | undefined,
  storage: Storage,
  purchasedAt: IsoDate,
): ExpiryResult {
  if (!ingredient) {
    const days = CUSTOM_ITEM_DAYS[storage];
    return { expiresAt: addDays(purchasedAt, days), days, basis: "custom" };
  }
  const days = ingredient.shelfDays[storage];
  if (days > 0) {
    return { expiresAt: addDays(purchasedAt, days), days, basis: "recommended" };
  }
  const fallback = ingredient.shelfDays[ingredient.defaultStorage];
  return { expiresAt: addDays(purchasedAt, fallback), days: fallback, basis: "not_recommended" };
}

/** 오늘 기준 남은 일수 */
export function daysLeft(expiresAt: IsoDate, today: IsoDate = todayIso()): number {
  return diffDays(today, expiresAt);
}

/** 신선도 단계 (기획서 3.3절) */
export type Freshness = "fresh" | "soon" | "urgent" | "expired";

export function freshness(left: number): Freshness {
  if (left < 0) return "expired";
  if (left <= 1) return "urgent";
  if (left <= 3) return "soon";
  return "fresh";
}

/** 'D-3', 'D-day', 'D+2' */
export function dDayLabel(left: number): string {
  if (left === 0) return "D-day";
  return left > 0 ? `D-${left}` : `D+${-left}`;
}
