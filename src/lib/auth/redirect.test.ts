import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("같은 사이트 상대 경로는 그대로 쓴다", () => {
    expect(safeNextPath("/plan")).toBe("/plan");
    expect(safeNextPath("/fridge?open=1")).toBe("/fridge?open=1");
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["plan"],
    ["https://evil.com"],
    ["//evil.com"],
    ["/\\evil.com"],
    ["/ok\\..\\evil"],
    ["/\nevil"],
  ])("위험하거나 빈 값 %j은 기본 경로로 바꾼다", (input) => {
    expect(safeNextPath(input)).toBe(DEFAULT_AFTER_LOGIN);
  });
});
