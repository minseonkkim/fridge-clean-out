import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INGREDIENTS } from "./ingredients";
import { ingredientsSeedSql } from "./seed-sql";

describe("재료 사전", () => {
  it("150종 이상이다", () => {
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(150);
  });

  it("id는 소문자 스네이크 케이스이고 겹치지 않는다", () => {
    const ids = INGREDIENTS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("이름과 별칭이 서로 겹치지 않는다 (자동완성이 한 재료로 정해지도록)", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const i of INGREDIENTS) {
      for (const word of [i.name, ...i.aliases]) {
        const owner = seen.get(word);
        if (owner && owner !== i.id) duplicates.push(`${word}: ${owner}, ${i.id}`);
        seen.set(word, i.id);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it("기본 보관 방식은 권장 일수가 있는 방식이다", () => {
    const bad = INGREDIENTS.filter((i) => i.shelfDays[i.defaultStorage] <= 0).map((i) => i.id);
    expect(bad).toEqual([]);
  });

  it("사용량과 보관 일수가 올바른 범위다", () => {
    for (const i of INGREDIENTS) {
      expect(i.usePerRecipe, i.id).toBeGreaterThan(0);
      for (const days of Object.values(i.shelfDays)) {
        expect(Number.isInteger(days) && days >= 0 && days <= 3650, i.id).toBe(true);
      }
    }
  });

  it("기본 양념(간장·소금·고추장 등)이 표시되어 있다", () => {
    const staples = INGREDIENTS.filter((i) => i.isPantryStaple).map((i) => i.id);
    expect(staples).toEqual(expect.arrayContaining(["soy_sauce", "salt", "gochujang"]));
  });

  it("기획서 예시처럼 삼겹살은 돼지고기의 별칭이다", () => {
    expect(INGREDIENTS.find((i) => i.aliases.includes("삼겹살"))?.id).toBe("pork");
  });

  it("시드 SQL 파일이 최신이다 (다르면 npm run gen:seed)", () => {
    const file = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20261015000500_seed_ingredients.sql"),
      "utf8",
    );
    expect(file).toBe(ingredientsSeedSql());
  });
});
