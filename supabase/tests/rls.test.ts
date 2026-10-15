// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asAnon, asUser, createTestDb } from "./harness";

const ALICE = "00000000-0000-0000-0000-00000000a11c";
const BOB = "00000000-0000-0000-0000-000000000b0b";

/** 서버 권한으로 사용자·냉장고·칸·재료를 만든다. 가입 트리거와 무관하게 동작하도록 직접 넣는다. */
async function seedUser(db: PGlite, userId: string) {
  await db.query(`insert into auth.users (id) values ($1) on conflict do nothing`, [userId]);
  await db.query(`insert into public.profiles (id) values ($1) on conflict do nothing`, [userId]);
  const {
    rows: [fridge],
  } = await db.query<{ id: string }>(
    `insert into public.fridges (owner_id, name) values ($1, 'rls-test') returning id`,
    [userId],
  );
  const {
    rows: [compartment],
  } = await db.query<{ id: string }>(
    `insert into public.compartments (fridge_id, zone, kind, slot, label, position)
     values ($1, 'fridge', 'shelf', 'rls-test', '테스트 칸', 99) returning id`,
    [fridge.id],
  );
  await db.query(
    `insert into public.fridge_items (fridge_id, custom_name, storage, quantity, unit, expires_at)
     values ($1, $2, 'fridge', 1, 'ea', current_date + 3)`,
    [fridge.id, `${userId} 재료`],
  );
  return { fridgeId: fridge.id, compartmentId: compartment.id };
}

describe("RLS 정책", () => {
  let db: PGlite;
  let alice: Awaited<ReturnType<typeof seedUser>>;
  let bob: Awaited<ReturnType<typeof seedUser>>;

  beforeAll(async () => {
    db = await createTestDb();
    alice = await seedUser(db, ALICE);
    bob = await seedUser(db, BOB);
  });

  it("내 냉장고의 재료만 보인다", async () => {
    const rows = await asUser(db, ALICE, async (tx) => {
      const r = await tx.query<{ fridge_id: string }>(`select fridge_id from public.fridge_items`);
      return r.rows;
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.fridge_id === alice.fridgeId)).toBe(true);
  });

  it("남의 냉장고는 목록에 보이지 않는다", async () => {
    const ids = await asUser(db, ALICE, async (tx) => {
      const r = await tx.query<{ id: string }>(`select id from public.fridges`);
      return r.rows.map((row) => row.id);
    });
    expect(ids).toContain(alice.fridgeId);
    expect(ids).not.toContain(bob.fridgeId);
  });

  it("남의 냉장고에 재료를 넣을 수 없다", async () => {
    await expect(
      asUser(db, ALICE, (tx) =>
        tx.query(
          `insert into public.fridge_items (fridge_id, custom_name, storage, quantity, unit, expires_at)
           values ($1, '침입', 'fridge', 1, 'ea', current_date)`,
          [bob.fridgeId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("남의 재료를 수정해도 아무것도 바뀌지 않는다", async () => {
    const affected = await asUser(db, ALICE, async (tx) => {
      const r = await tx.query(`update public.fridge_items set memo = 'x' where fridge_id = $1`, [
        bob.fridgeId,
      ]);
      return r.affectedRows;
    });
    expect(affected).toBe(0);
  });

  it("내 재료를 남의 냉장고 칸에 둘 수 없다", async () => {
    await expect(
      asUser(db, ALICE, (tx) =>
        tx.query(
          `insert into public.fridge_items
             (fridge_id, compartment_id, custom_name, storage, quantity, unit, expires_at)
           values ($1, $2, '칸 침입', 'fridge', 1, 'ea', current_date)`,
          [alice.fridgeId, bob.compartmentId],
        ),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it("공유 멤버로 추가되면 그 냉장고를 쓸 수 있다", async () => {
    await db.query(
      `insert into public.fridge_members (fridge_id, user_id, role) values ($1, $2, 'editor')`,
      [bob.fridgeId, ALICE],
    );
    const count = await asUser(db, ALICE, async (tx) => {
      const r = await tx.query<{ n: number }>(
        `select count(*)::int as n from public.fridge_items where fridge_id = $1`,
        [bob.fridgeId],
      );
      return r.rows[0].n;
    });
    expect(count).toBeGreaterThan(0);
    await db.query(`delete from public.fridge_members where fridge_id = $1 and user_id = $2`, [
      bob.fridgeId,
      ALICE,
    ]);
  });

  it("이력은 고칠 수 없다", async () => {
    await expect(
      asUser(db, ALICE, async (tx) => {
        await tx.query(
          `insert into public.item_events (fridge_id, type, quantity_delta) values ($1, 'added', 1)`,
          [alice.fridgeId],
        );
        await tx.query(`update public.item_events set quantity_delta = 99`);
      }),
    ).rejects.toThrow(/permission denied/);
  });

  it("비로그인 사용자는 재료 사전을 읽지만 냉장고는 못 본다", async () => {
    const result = await asAnon(db, async (tx) => {
      const ingredients = await tx.query(`select id from public.ingredients`);
      const items = await tx.query(`select id from public.fridge_items`);
      return { ingredients: ingredients.rows.length, items: items.rows.length };
    });
    expect(result.ingredients).toBeGreaterThanOrEqual(150);
    expect(result.items).toBe(0);
  });

  it("로그인 사용자도 재료 사전을 고칠 수 없다", async () => {
    await expect(
      asUser(db, ALICE, (tx) => tx.query(`update public.ingredients set name = '해킹'`)),
    ).rejects.toThrow(/permission denied/);
  });
});
