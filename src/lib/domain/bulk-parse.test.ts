import { describe, expect, it } from "vitest";
import { INGREDIENTS } from "@/data/ingredients";
import { bulkToInputs, parseBulk } from "./bulk-parse";
import { buildIngredientIndex } from "./search";

const index = buildIngredientIndex(INGREDIENTS);
const parse = (text: string) =>
  parseBulk(text, index).map((e) => [e.ingredient?.id ?? `?${e.name}`, e.quantity, e.unit]);

describe("여러 재료 한 번에 등록", () => {
  it("기획서 예시를 그대로 알아듣는다", () => {
    expect(parse("양파 3, 두부 1, 계란 10")).toEqual([
      ["onion", 3, "ea"],
      ["tofu", 1, "pack"],
      ["egg", 10, "ea"],
    ]);
  });

  it("붙여 쓴 수량·단위, 줄바꿈 구분도 된다", () => {
    expect(parse("양파3개\n돼지고기 600g\n우유 1L")).toEqual([
      ["onion", 3, "ea"],
      ["pork", 600, "g"],
      ["milk", 1000, "ml"],
    ]);
  });

  it("kg은 g으로, 소수도 받는다", () => {
    expect(parse("소고기 1.5kg")).toEqual([["beef", 1500, "g"]]);
  });

  it("수량이 없으면 1개, g·ml 재료는 1회 사용량으로 본다", () => {
    expect(parse("대파, 김치")).toEqual([
      ["green_onion", 1, "ea"],
      ["kimchi", 200, "g"],
    ]);
  });

  it("별칭도 알아듣는다", () => {
    expect(parse("삼겹살 600g")).toEqual([["pork", 600, "g"]]);
  });

  it("기본 단위와 다른 단위는 말한 단위를 쓴다", () => {
    expect(parse("계란 1팩")).toEqual([["egg", 1, "pack"]]);
  });

  it("사전에 없는 재료는 이름으로 남긴다", () => {
    expect(parse("용과 2개")).toEqual([["?용과", 2, "ea"]]);
  });

  it("빈 항목은 건너뛴다", () => {
    expect(parse(" , 양파 ,, ")).toEqual([["onion", 1, "ea"]]);
  });

  it("오늘 산 재료로 기본 보관 방식·권장 기한·칸을 정한다", () => {
    const [pork, unknown] = bulkToInputs(parseBulk("돼지고기 600g, 용과", index), "2026-10-15");
    expect(pork).toMatchObject({
      ingredientId: "pork",
      storage: "fridge",
      slot: "fridge_bottom",
      expiresAt: "2026-10-18",
      quantity: 600,
    });
    expect(unknown).toMatchObject({
      ingredientId: null,
      customName: "용과",
      expiresAt: "2026-10-22",
    });
  });
});
