// 마스터 데이터 시드 SQL을 생성한다. 실행: npm run gen:seed
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ingredientsSeedSql } from "../src/data/seed-sql.ts";

export const INGREDIENTS_SEED_PATH = join(
  import.meta.dirname,
  "..",
  "supabase",
  "migrations",
  "20261015000500_seed_ingredients.sql",
);

writeFileSync(INGREDIENTS_SEED_PATH, ingredientsSeedSql());
console.log(`생성: ${INGREDIENTS_SEED_PATH}`);
