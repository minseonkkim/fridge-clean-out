import { describe, expect, it } from "vitest";
import type { NewItemInput } from "@/lib/domain/fridge";
import {
  TRIAL_STORAGE_KEY,
  activeItems,
  addItems,
  closeItem,
  emptyTrial,
  hasTrialData,
  loadTrial,
  saveTrial,
  updateItem,
} from "./trial-store";

function fakeClock() {
  let n = 0;
  return { now: () => new Date("2026-10-15T09:00:00Z"), id: () => `id-${++n}` };
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

const onion: NewItemInput = {
  ingredientId: "onion",
  storage: "room",
  slot: "pantry",
  quantity: 3,
  unit: "ea",
  purchasedAt: "2026-10-15",
  expiresAt: "2026-11-14",
};

describe("체험 데이터 저장소", () => {
  it("재료를 추가하면 active 상태와 added 이력이 생긴다", () => {
    const data = addItems(emptyTrial(), [onion], fakeClock());
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({
      id: "id-1",
      status: "active",
      quantity: 3,
      slot: "pantry",
    });
    expect(data.events).toEqual([
      expect.objectContaining({ itemId: "id-1", type: "added", quantityDelta: 3 }),
    ]);
    expect(hasTrialData(data)).toBe(true);
  });

  it("사전에 없는 재료는 이름이 없으면 거부한다", () => {
    expect(() =>
      addItems(emptyTrial(), [{ ...onion, ingredientId: null, customName: "  " }], fakeClock()),
    ).toThrow(/이름/);
  });

  it("수량을 줄이면 used, 칸을 옮기면 moved 이력이 남는다", () => {
    const clock = fakeClock();
    let data = addItems(emptyTrial(), [onion], clock);
    data = updateItem(data, "id-1", { quantity: 2 }, clock);
    data = updateItem(data, "id-1", { slot: "veg_drawer", storage: "fridge" }, clock);
    expect(data.events.map((e) => [e.type, e.quantityDelta])).toEqual([
      ["added", 3],
      ["used", -1],
      ["moved", null],
    ]);
    expect(data.items[0]).toMatchObject({ quantity: 2, slot: "veg_drawer", storage: "fridge" });
  });

  it("다 씀은 수량 0으로, 버림은 수량을 남기고 목록에서 빠진다", () => {
    const clock = fakeClock();
    let data = addItems(
      emptyTrial(),
      [onion, { ...onion, ingredientId: "tofu", unit: "pack", quantity: 1 }],
      clock,
    );
    data = closeItem(data, "id-1", "used_up", clock);
    data = closeItem(data, "id-2", "discarded", clock);
    expect(data.items.map((i) => [i.status, i.quantity, i.closedAt !== null])).toEqual([
      ["used_up", 0, true],
      ["discarded", 1, true],
    ]);
    expect(activeItems(data)).toEqual([]);
  });

  it("이미 닫힌 재료를 다시 닫아도 바뀌지 않는다", () => {
    const clock = fakeClock();
    const data = closeItem(addItems(emptyTrial(), [onion], clock), "id-1", "used_up", clock);
    expect(closeItem(data, "id-1", "discarded", clock)).toBe(data);
  });

  it("저장하고 다시 불러오면 같은 데이터다", () => {
    const storage = memoryStorage();
    const data = addItems(emptyTrial(), [onion], fakeClock());
    expect(saveTrial(data, storage)).toBe(true);
    expect(loadTrial(storage)).toEqual(data);
  });

  it("저장소가 없거나 깨져 있어도 빈 데이터로 시작한다", () => {
    const storage = memoryStorage();
    storage.map.set(TRIAL_STORAGE_KEY, "{not json");
    expect(loadTrial(storage)).toEqual(emptyTrial());
    expect(loadTrial(null)).toEqual(emptyTrial());
    expect(saveTrial(emptyTrial(), null)).toBe(false);
  });

  it("저장소 접근이 예외를 던져도 앱이 멈추지 않는다", () => {
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
      removeItem: () => {},
    };
    expect(loadTrial(throwing)).toEqual(emptyTrial());
    expect(saveTrial(emptyTrial(), throwing)).toBe(false);
  });
});
