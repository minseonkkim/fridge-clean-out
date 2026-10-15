import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INGREDIENT_BY_ID, INGREDIENTS } from "./ingredients";
import { RECIPES } from "./recipes";
import { recipesSeedSql } from "./seed-sql";

describe("레시피", () => {
  it("100개 이상이다", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(100);
  });

  it("id와 이름이 겹치지 않는다", () => {
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
    expect(new Set(RECIPES.map((r) => r.name)).size).toBe(RECIPES.length);
    for (const r of RECIPES) expect(r.id).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("모든 재료가 사전에 있고 단위가 사전 기본 단위와 같다", () => {
    for (const r of RECIPES) {
      for (const ri of r.ingredients) {
        const ingredient = INGREDIENT_BY_ID.get(ri.ingredientId);
        expect(ingredient, `${r.id}: ${ri.ingredientId}`).toBeDefined();
        expect(ri.unit, `${r.id}: ${ri.ingredientId}`).toBe(ingredient?.defaultUnit);
        expect(ri.amount, `${r.id}: ${ri.ingredientId}`).toBeGreaterThan(0);
      }
    }
  });

  it("기본 양념이 아닌 필수 재료가 하나 이상 있다 (그래야 냉장고 재료를 소비한다)", () => {
    const bad = RECIPES.filter(
      (r) =>
        !r.ingredients.some(
          (ri) => ri.required && !INGREDIENT_BY_ID.get(ri.ingredientId)?.isPantryStaple,
        ),
    ).map((r) => r.id);
    expect(bad).toEqual([]);
  });

  it("한 레시피 안에서 같은 재료가 두 번 나오지 않는다", () => {
    for (const r of RECIPES) {
      const ids = r.ingredients.map((ri) => ri.ingredientId);
      expect(new Set(ids).size, r.id).toBe(ids.length);
    }
  });

  it("조리 단계가 있고 시간·인분이 올바르다", () => {
    for (const r of RECIPES) {
      expect(r.steps.length, r.id).toBeGreaterThanOrEqual(1);
      expect(r.minutes, r.id).toBeGreaterThan(0);
      expect(r.servings, r.id).toBeGreaterThan(0);
    }
  });

  it("상하기 쉬운 재료(냉장 7일 이하)는 대부분 레시피에서 쓰인다", () => {
    const used = new Set(RECIPES.flatMap((r) => r.ingredients.map((ri) => ri.ingredientId)));
    const perishable = INGREDIENTS.filter(
      (i) => i.defaultStorage === "fridge" && i.shelfDays.fridge > 0 && i.shelfDays.fridge <= 7,
    );
    const unused = perishable.filter((i) => !used.has(i.id)).map((i) => i.id);
    // 그냥 먹는 재료(주스·밑반찬 등) 몇 개는 레시피가 없어도 된다.
    expect(unused.length / perishable.length).toBeLessThan(0.15);
  });

  it("시드 SQL 파일이 최신이다 (다르면 npm run gen:seed)", () => {
    const file = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20261015000600_seed_recipes.sql"),
      "utf8",
    );
    expect(file).toBe(recipesSeedSql());
  });
});
