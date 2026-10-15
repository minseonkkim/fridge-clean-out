// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./harness";

const EXPECTED_TABLES = [
  "compartments",
  "cook_logs",
  "fridge_items",
  "fridge_members",
  "fridges",
  "ingredients",
  "item_events",
  "profiles",
  "recipe_ingredients",
  "recipes",
  "shopping_items",
  "user_preferences",
];

describe("핵심 테이블 스키마", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
  });

  it("기획서 7.1절의 테이블이 모두 있다", async () => {
    const { rows } = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
    );
    expect(rows.map((r) => r.table_name)).toEqual(EXPECTED_TABLES);
  });

  it("사전에 없는 재료는 이름이 있어야 등록된다", async () => {
    const userId = "00000000-0000-0000-0000-0000000000a1";
    await db.query(`insert into auth.users (id) values ($1)`, [userId]);
    await db.query(`insert into public.profiles (id) values ($1) on conflict do nothing`, [userId]);
    const {
      rows: [fridge],
    } = await db.query<{ id: string }>(
      `insert into public.fridges (owner_id) values ($1) returning id`,
      [userId],
    );

    await expect(
      db.query(
        `insert into public.fridge_items (fridge_id, storage, quantity, unit, expires_at)
         values ($1, 'fridge', 1, 'ea', current_date)`,
        [fridge.id],
      ),
    ).rejects.toThrow();

    await expect(
      db.query(
        `insert into public.fridge_items (fridge_id, custom_name, storage, quantity, unit, expires_at)
         values ($1, '할머니 반찬', 'fridge', 1, 'ea', current_date)`,
        [fridge.id],
      ),
    ).resolves.toBeDefined();
  });

  it("다 씀/버림 상태에는 closed_at이 있어야 한다", async () => {
    const {
      rows: [fridge],
    } = await db.query<{ id: string }>(`select id from public.fridges limit 1`);
    await expect(
      db.query(
        `insert into public.fridge_items (fridge_id, custom_name, storage, quantity, unit, expires_at, status)
         values ($1, '두부', 'fridge', 0, 'ea', current_date, 'used_up')`,
        [fridge.id],
      ),
    ).rejects.toThrow();
  });

  it("fridge_items 수정 시 updated_at이 갱신된다", async () => {
    const {
      rows: [item],
    } = await db.query<{ id: string; updated_at: Date }>(
      `update public.fridge_items set updated_at = now() - interval '1 day' returning id, updated_at`,
    );
    const {
      rows: [after],
    } = await db.query<{ updated_at: Date }>(
      `update public.fridge_items set memo = '메모' where id = $1 returning updated_at`,
      [item.id],
    );
    expect(after.updated_at.getTime()).toBeGreaterThan(item.updated_at.getTime());
  });
});
