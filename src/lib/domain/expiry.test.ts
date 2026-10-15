import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { addDays, calcExpiry, dDayLabel, daysLeft, diffDays, freshness, todayIso } from "./expiry";

const pork = INGREDIENT_BY_ID.get("pork")!; // 냉장 3, 냉동 90, 실온 0
const potato = INGREDIENT_BY_ID.get("potato")!; // 냉장 0, 냉동 0, 실온 30

describe("날짜 계산", () => {
  it("월·연도 경계와 윤년을 넘어간다", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(diffDays("2026-10-15", "2026-10-15")).toBe(0);
    expect(diffDays("2026-10-15", "2026-10-12")).toBe(-3);
  });

  it("오늘은 기기 시간대 기준 날짜다", () => {
    expect(todayIso(new Date(2026, 9, 15, 23, 59))).toBe("2026-10-15");
    expect(todayIso(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });
});

describe("calcExpiry", () => {
  it("보관 방식별 권장 일수로 계산한다", () => {
    expect(calcExpiry(pork, "fridge", "2026-10-15")).toEqual({
      expiresAt: "2026-10-18",
      days: 3,
      basis: "recommended",
    });
    expect(calcExpiry(pork, "freezer", "2026-10-15").expiresAt).toBe("2027-01-13");
  });

  it("권장하지 않는 보관 방식은 기본 보관 방식 일수로 대신하고 표시한다", () => {
    expect(calcExpiry(potato, "fridge", "2026-10-15")).toEqual({
      expiresAt: "2026-11-14",
      days: 30,
      basis: "not_recommended",
    });
  });

  it("사전에 없는 재료는 보관 방식별 기본값을 쓴다", () => {
    expect(calcExpiry(null, "fridge", "2026-10-15")).toMatchObject({ days: 7, basis: "custom" });
    expect(calcExpiry(undefined, "freezer", "2026-10-15")).toMatchObject({ days: 30 });
  });
});

describe("D-day와 신선도", () => {
  it.each([
    [10, "fresh", "D-10"],
    [4, "fresh", "D-4"],
    [3, "soon", "D-3"],
    [2, "soon", "D-2"],
    [1, "urgent", "D-1"],
    [0, "urgent", "D-day"],
    [-2, "expired", "D+2"],
  ] as const)("남은 %i일은 %s, %s", (left, level, label) => {
    expect(freshness(left)).toBe(level);
    expect(dDayLabel(left)).toBe(label);
  });

  it("daysLeft는 오늘 기준 남은 일수다", () => {
    expect(daysLeft("2026-10-18", "2026-10-15")).toBe(3);
  });
});
