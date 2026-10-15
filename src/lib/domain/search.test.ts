import { describe, expect, it } from "vitest";
import { INGREDIENTS } from "@/data/ingredients";
import { buildIngredientIndex } from "./search";

const index = buildIngredientIndex(INGREDIENTS);
const ids = (q: string, limit?: number) => index.search(q, limit).map((h) => h.ingredient.id);

describe("재료 자동완성", () => {
  it("이름이 정확히 같으면 맨 앞이다", () => {
    expect(ids("양파")[0]).toBe("onion");
    expect(ids("무")[0]).toBe("radish");
  });

  it("앞부분만 입력해도 찾는다", () => {
    expect(ids("돼지")).toEqual(expect.arrayContaining(["pork", "pork_mince", "pork_ribs"]));
  });

  it("별칭으로 찾고 어떤 별칭인지 알려준다", () => {
    const [hit] = index.search("삼겹살");
    expect(hit.ingredient.id).toBe("pork");
    expect(hit.matchedAlias).toBe("삼겹살");
    expect(ids("달걀")[0]).toBe("egg");
  });

  it("초성으로 찾는다", () => {
    expect(ids("ㅇㅍ")).toContain("onion");
    expect(ids("ㄷㅂ")[0]).toBe("tofu");
  });

  it("마지막 글자를 입력하는 중이어도 찾는다", () => {
    expect(ids("양ㅍ")[0]).toBe("onion");
    expect(ids("닭ㄱ")).toContain("chicken_breast");
  });

  it("띄어쓰기와 대소문자를 무시한다", () => {
    expect(ids("다진마늘")[0]).toBe("minced_garlic");
    expect(ids("다진 마늘")[0]).toBe("minced_garlic");
  });

  it("중간 글자로도 찾지만 앞에서 맞는 것이 먼저다", () => {
    const result = ids("마늘");
    expect(result[0]).toBe("garlic");
    expect(result).toContain("minced_garlic");
    expect(ids("고추장")[0]).toBe("gochujang");
  });

  it("빈 입력과 없는 재료는 빈 결과다", () => {
    expect(index.search("   ")).toEqual([]);
    expect(index.search("용과열매")).toEqual([]);
  });

  it("개수를 제한한다", () => {
    expect(index.search("ㄱ", 5)).toHaveLength(5);
  });

  it("exact는 이름이나 별칭이 정확히 같은 재료다", () => {
    expect(index.exact("계란")?.id).toBe("egg");
    expect(index.exact(" 달 걀 ")?.id).toBe("egg");
    expect(index.exact("계")).toBeUndefined();
  });
});
