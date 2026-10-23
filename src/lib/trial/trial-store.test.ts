import { describe, expect, it } from "vitest";
import type { NewItemInput } from "@/lib/domain/fridge";
import {
  TRIAL_STORAGE_KEY,
  activeItems,
  addItems,
  addShoppingItems,
  closeItem,
  cookRecipe,
  removeShoppingItems,
  setShoppingChecked,
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

  it("요리 완료는 쓴 만큼 줄이고, 다 쓰면 used_up, cooked 이력을 남긴다", () => {
    const clock = fakeClock();
    let data = addItems(
      emptyTrial(),
      [onion, { ...onion, ingredientId: "pork", unit: "g", quantity: 600 }],
      clock,
    );
    data = cookRecipe(
      data,
      "jeyuk_bokkeum",
      [
        { itemId: "id-1", amount: null },
        { itemId: "id-2", amount: 300 },
      ],
      clock,
    );
    expect(data.items.map((i) => [i.quantity, i.status])).toEqual([
      [0, "used_up"],
      [300, "active"],
    ]);
    expect(data.events.slice(-2).map((e) => [e.type, e.quantityDelta, e.recipeId])).toEqual([
      ["cooked", -3, "jeyuk_bokkeum"],
      ["cooked", -300, "jeyuk_bokkeum"],
    ]);
  });

  it("요리 완료 중 하나라도 잘못되면 아무것도 바뀌지 않는다", () => {
    const clock = fakeClock();
    const data = addItems(emptyTrial(), [onion], clock);
    expect(() =>
      cookRecipe(
        data,
        "x",
        [
          { itemId: "id-1", amount: 1 },
          { itemId: "missing", amount: 1 },
        ],
        clock,
      ),
    ).toThrow(/없는 재료/);
    expect(data.items[0].quantity).toBe(3);
  });

  it("장보기 목록에 담고, 체크하고, 지운다. 아직 안 산 같은 재료는 다시 담지 않는다", () => {
    const clock = fakeClock();
    let data = addShoppingItems(
      emptyTrial(),
      [
        { ingredientId: "pork", name: "돼지고기", fromRecipeId: "kimchi_stew" },
        { ingredientId: null, name: "고수 한 줌" },
      ],
      clock,
    );
    data = addShoppingItems(data, [{ ingredientId: "pork", name: "돼지고기" }], clock);
    expect(data.shopping.map((s) => s.name)).toEqual(["돼지고기", "고수 한 줌"]);

    data = setShoppingChecked(data, data.shopping[0].id, true);
    expect(data.shopping[0].checked).toBe(true);
    // 산(체크한) 재료는 다시 담을 수 있다
    data = addShoppingItems(data, [{ ingredientId: "pork", name: "돼지고기" }], clock);
    expect(data.shopping).toHaveLength(3);

    data = removeShoppingItems(data, [data.shopping[1].id]);
    expect(data.shopping.map((s) => s.name)).toEqual(["돼지고기", "돼지고기"]);
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
