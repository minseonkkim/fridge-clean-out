import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import {
  addItemFormReducer as reduce,
  initialAddItemForm,
  validateAddItem,
  type AddItemAction,
} from "./add-item-form";

const TODAY = "2026-10-15";
const pork = INGREDIENT_BY_ID.get("pork")!; // 냉장 3, 냉동 90
const egg = INGREDIENT_BY_ID.get("egg")!;

const run = (...actions: AddItemAction[]) => actions.reduce(reduce, initialAddItemForm(TODAY));

describe("재료 추가 시트", () => {
  it("재료를 고르면 보관 방식·단위·수량·기한이 채워진다", () => {
    const s = run({ type: "select", ingredient: pork });
    expect(s).toMatchObject({
      query: "돼지고기",
      storage: "fridge",
      unit: "g",
      quantity: "300",
      expiresAt: "2026-10-18",
      expiresManual: false,
    });
    expect(run({ type: "select", ingredient: egg }).quantity).toBe("2");
  });

  it("보관 방식을 바꾸면 기한을 다시 계산한다", () => {
    const s = run({ type: "select", ingredient: pork }, { type: "storage", value: "freezer" });
    expect(s.expiresAt).toBe("2027-01-13");
  });

  it("권장하지 않는 보관 방식이면 표시한다", () => {
    const s = run({ type: "select", ingredient: pork }, { type: "storage", value: "room" });
    expect(s.expiry.basis).toBe("not_recommended");
  });

  it("기한을 직접 고치면 보관 방식을 바꿔도 유지하고, 되돌리면 다시 계산한다", () => {
    const manual = run(
      { type: "select", ingredient: pork },
      { type: "expiresAt", value: "2026-10-20" },
      { type: "storage", value: "freezer" },
    );
    expect(manual).toMatchObject({ expiresAt: "2026-10-20", expiresManual: true });
    expect(reduce(manual, { type: "resetExpiry" })).toMatchObject({
      expiresAt: "2027-01-13",
      expiresManual: false,
    });
  });

  it("구매일을 바꾸면 기한도 따라간다", () => {
    const s = run(
      { type: "select", ingredient: pork },
      { type: "purchasedAt", value: "2026-10-13" },
    );
    expect(s.expiresAt).toBe("2026-10-16");
  });

  it("사전 이름이나 별칭을 그대로 입력하면 고른 것으로 본다", () => {
    const s = run({ type: "query", value: "삼겹살", exact: pork });
    expect(s).toMatchObject({ query: "삼겹살", unit: "g", expiresAt: "2026-10-18" });
    expect(s.ingredient?.id).toBe("pork");
    expect(validateAddItem(s).ok && validateAddItem(s)).toMatchObject({
      input: { ingredientId: "pork", customName: null },
    });
  });

  it("고른 뒤 이름을 고치면 사전 외 재료가 된다", () => {
    const s = run(
      { type: "select", ingredient: pork },
      { type: "query", value: "돼지고기 양념육" },
    );
    expect(s.ingredient).toBeNull();
    expect(s.expiry.basis).toBe("custom");
  });

  it("사전 재료는 ingredientId와 자동 배치 칸으로 등록한다", () => {
    const result = validateAddItem(run({ type: "select", ingredient: pork }));
    expect(result).toEqual({
      ok: true,
      input: {
        ingredientId: "pork",
        customName: null,
        slot: "fridge_bottom",
        storage: "fridge",
        quantity: 300,
        unit: "g",
        purchasedAt: TODAY,
        expiresAt: "2026-10-18",
        expiresManual: false,
      },
    });
  });

  it("사전 외 재료는 이름으로 등록한다", () => {
    const result = validateAddItem(
      run({ type: "query", value: "  할머니 고추장아찌 " }, { type: "unit", value: "pack" }),
    );
    expect(result.ok && result.input).toMatchObject({
      ingredientId: null,
      customName: "할머니 고추장아찌",
      slot: "fridge_middle",
      unit: "pack",
      expiresAt: "2026-10-22",
    });
  });

  it.each([
    [[], /이름/],
    [
      [
        { type: "query", value: "두부" },
        { type: "quantity", value: "0" },
      ],
      /수량/,
    ],
    [
      [
        { type: "query", value: "두부" },
        { type: "quantity", value: "abc" },
      ],
      /수량/,
    ],
    [
      [
        { type: "query", value: "두부" },
        { type: "expiresAt", value: "2026-10-01" },
      ],
      /구매일/,
    ],
  ] as [AddItemAction[], RegExp][])("잘못된 입력은 거부한다 %#", (actions, error) => {
    const result = validateAddItem(run(...actions));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(error);
  });
});
