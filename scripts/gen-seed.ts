// 마스터 데이터 시드 SQL을 생성한다. 실행: npm run gen:seed
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ingredientsSeedSql, recipesSeedSql } from "../src/data/seed-sql.ts";

const MIGRATIONS = join(import.meta.dirname, "..", "supabase", "migrations");

const outputs: [file: string, sql: string][] = [
  ["20261015000500_seed_ingredients.sql", ingredientsSeedSql()],
  ["20261015000600_seed_recipes.sql", recipesSeedSql()],
];

for (const [file, sql] of outputs) {
  writeFileSync(join(MIGRATIONS, file), sql);
  console.log(`생성: supabase/migrations/${file}`);
}
