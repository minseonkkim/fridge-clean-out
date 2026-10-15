// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asAnon, asUser, createTestDb, signUp } from "./harness";

const LEAVER = "00000000-0000-0000-0000-0000000de1e7";
const STAYER = "00000000-0000-0000-0000-0000000de1e8";

async function countFor(db: PGlite, userId: string) {
  const { rows } = await db.query<{
    profiles: number;
    fridges: number;
    items: number;
    events: number;
  }>(
    `select
       (select count(*)::int from public.profiles where id = $1) as profiles,
       (select count(*)::int from public.fridges where owner_id = $1) as fridges,
       (select count(*)::int from public.fridge_items fi
          join public.fridges f on f.id = fi.fridge_id where f.owner_id = $1) as items,
       (select count(*)::int from public.item_events e
          join public.fridges f on f.id = e.fridge_id where f.owner_id = $1) as events`,
    [userId],
  );
  return rows[0];
}

describe("delete_my_account RPC", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
    for (const id of [LEAVER, STAYER]) {
      await signUp(db, id, `${id}@example.com`);
      await asUser(db, id, async (tx) => {
        const {
          rows: [fridge],
        } = await tx.query<{ id: string }>(`select id from public.fridges`);
        await tx.query(`select public.import_trial_data($1::jsonb)`, [
          JSON.stringify({
            items: [
              {
                id: crypto.randomUUID(),
                ingredientId: "egg",
                storage: "fridge",
                quantity: 10,
                unit: "ea",
                expiresAt: "2026-11-01",
              },
            ],
          }),
        ]);
        await tx.query(`insert into public.item_events (fridge_id, type) values ($1, 'edited')`, [
          fridge.id,
        ]);
      });
    }
  });

  it("본인 계정과 냉장고 데이터를 모두 지운다", async () => {
    expect(await countFor(db, LEAVER)).toEqual({ profiles: 1, fridges: 1, items: 1, events: 1 });
    await asUser(db, LEAVER, (tx) => tx.query(`select public.delete_my_account()`));
    expect(await countFor(db, LEAVER)).toEqual({ profiles: 0, fridges: 0, items: 0, events: 0 });
    const { rows } = await db.query(`select 1 from auth.users where id = $1`, [LEAVER]);
    expect(rows).toHaveLength(0);
  });

  it("다른 사용자의 데이터는 남는다", async () => {
    expect(await countFor(db, STAYER)).toEqual({ profiles: 1, fridges: 1, items: 1, events: 1 });
  });

  it("비로그인으로는 호출할 수 없다", async () => {
    await expect(asAnon(db, (tx) => tx.query(`select public.delete_my_account()`))).rejects.toThrow(
      /permission denied/,
    );
  });
});
