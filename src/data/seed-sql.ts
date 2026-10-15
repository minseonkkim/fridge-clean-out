import { INGREDIENTS } from "./ingredients.ts";
import type { Ingredient } from "../lib/domain/types.ts";

function str(value: string | null): string {
  return value === null ? "null" : `'${value.replaceAll("'", "''")}'`;
}

function textArray(values: string[]): string {
  return values.length === 0 ? "'{}'::text[]" : `array[${values.map(str).join(", ")}]::text[]`;
}

function ingredientRow(i: Ingredient): string {
  return `  (${[
    str(i.id),
    str(i.name),
    str(i.category),
    textArray(i.aliases),
    str(i.defaultUnit),
    String(i.usePerRecipe),
    String(i.shelfDays.fridge),
    String(i.shelfDays.freezer),
    String(i.shelfDays.room),
    str(i.defaultStorage),
    str(i.iconKey),
    str(i.source),
    String(i.isPantryStaple),
  ].join(", ")})`;
}

/** 재료 사전 시드 SQL. 다시 실행해도 같은 결과가 되도록 upsert 한다. */
export function ingredientsSeedSql(ingredients: Ingredient[] = INGREDIENTS): string {
  return `-- 자동 생성 파일: 직접 고치지 말 것. src/data/ingredients.ts를 고친 뒤 npm run gen:seed
-- 재료 사전 ${ingredients.length}종

insert into public.ingredients (
  id, name, category, aliases, default_unit, use_per_recipe,
  shelf_fridge_days, shelf_freezer_days, shelf_room_days,
  default_storage, icon_key, source, is_pantry_staple
) values
${ingredients.map(ingredientRow).join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  aliases = excluded.aliases,
  default_unit = excluded.default_unit,
  use_per_recipe = excluded.use_per_recipe,
  shelf_fridge_days = excluded.shelf_fridge_days,
  shelf_freezer_days = excluded.shelf_freezer_days,
  shelf_room_days = excluded.shelf_room_days,
  default_storage = excluded.default_storage,
  icon_key = excluded.icon_key,
  source = excluded.source,
  is_pantry_staple = excluded.is_pantry_staple;
`;
}
