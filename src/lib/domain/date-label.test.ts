import { describe, expect, it } from "vitest";
import { dayLabel } from "./date-label";

describe("dayLabel", () => {
  it.each([
    ["2026-10-16", "오늘"],
    ["2026-10-17", "내일"],
    ["2026-10-18", "모레"],
    ["2026-10-19", "10월 19일 (월)"],
    ["2026-11-01", "11월 1일 (일)"],
  ])("%s → %s", (date, label) => {
    expect(dayLabel(date, "2026-10-16")).toBe(label);
  });
});
