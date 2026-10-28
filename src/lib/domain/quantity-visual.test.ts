import { describe, expect, it } from "vitest";
import { fillReference, quantityVisual } from "./quantity-visual";

describe("수량 표현", () => {
  it("셀 수 있는 재료는 개수만큼, 최대 6개까지 쌓는다", () => {
    expect(quantityVisual(3, "ea", 0)).toEqual({ kind: "stack", shown: 3, overflow: null });
    expect(quantityVisual(6, "ea", 0)).toEqual({ kind: "stack", shown: 6, overflow: null });
    expect(quantityVisual(8, "ea", 0)).toEqual({ kind: "stack", shown: 6, overflow: 8 });
    expect(quantityVisual(2, "pack", 0)).toEqual({ kind: "stack", shown: 2, overflow: null });
  });

  it("1보다 작으면 하나로 보이고, 0이면 비어 있다", () => {
    expect(quantityVisual(0.5, "ea", 0)).toEqual({ kind: "stack", shown: 1, overflow: null });
    expect(quantityVisual(0, "ea", 0)).toEqual({ kind: "stack", shown: 0, overflow: null });
  });

  it("무게·부피는 채움 정도로, 0~1 사이로 자른다", () => {
    expect(quantityVisual(300, "g", 600)).toEqual({ kind: "fill", ratio: 0.5 });
    expect(quantityVisual(900, "ml", 600)).toEqual({ kind: "fill", ratio: 1 });
    expect(quantityVisual(0, "g", 600)).toEqual({ kind: "fill", ratio: 0 });
  });

  it("가득 기준은 지금 양과 1회 사용량의 3배 중 큰 쪽", () => {
    expect(fillReference(600, 300)).toBe(900);
    expect(fillReference(1000, 200)).toBe(1000);
  });
});
