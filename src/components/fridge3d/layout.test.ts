import { describe, expect, it } from "vitest";
import type { CompartmentSlot } from "@/lib/domain/fridge";
import { SLOT_AREAS, fitDistance, placeItems } from "./layout";

const SLOTS = Object.keys(SLOT_AREAS) as CompartmentSlot[];

describe("3D 냉장고 칸 배치", () => {
  it("재료가 몇 개든 칸 안에 들어가고 서로 겹치지 않는다", () => {
    for (const slot of SLOTS) {
      for (const n of [1, 3, 8, 20, 60]) {
        const placed = placeItems(slot, n);
        expect(placed, `${slot} ${n}`).toHaveLength(n);
        for (const p of placed) {
          const area = SLOT_AREAS[slot].find((a) => a.y === p.pos[1] && a.parent === p.parent)!;
          expect(p.pos[0] - p.size / 2, `${slot} ${n} 왼쪽`).toBeGreaterThanOrEqual(area.x0 - 1e-6);
          expect(p.pos[0] + p.size / 2, `${slot} ${n} 오른쪽`).toBeLessThanOrEqual(area.x1 + 1e-6);
          expect(p.size).toBeLessThanOrEqual(area.maxH + 1e-6);
        }
        for (let i = 0; i < placed.length; i++)
          for (let j = i + 1; j < placed.length; j++) {
            const a = placed[i];
            const b = placed[j];
            if (a.pos[1] !== b.pos[1] || a.parent !== b.parent) continue;
            const dist = Math.hypot(a.pos[0] - b.pos[0], a.pos[2] - b.pos[2]);
            expect(dist, `${slot} ${n}: ${i}·${j}`).toBeGreaterThanOrEqual(
              Math.min(a.size, b.size) * 0.99,
            );
          }
      }
    }
  });

  it("적으면 크게, 많으면 작게 놓는다", () => {
    expect(placeItems("fridge_top", 2)[0].size).toBeGreaterThan(
      placeItems("fridge_top", 40)[0].size,
    );
  });

  it("문 선반은 세 칸에 고르게 나눠 담는다", () => {
    const ys = placeItems("fridge_door", 7).map((p) => p.pos[1]);
    expect(new Set(ys).size).toBe(3);
  });

  it("세로로 긴 화면에서는 가로에 맞춰 더 멀리서 본다", () => {
    const box = { x0: -1, x1: 1, y0: 0, y1: 2 };
    expect(fitDistance(box, 40, 0.5)).toBeGreaterThan(fitDistance(box, 40, 1.5));
  });
});
