// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { asUser, createTestDb, signUp } from "./harness";

const USER = "00000000-0000-0000-0000-0000000e7e01";

describe("재료 이력 자동 기록 트리거", () => {
  let db: PGlite;
  let fridgeId: string;
  let vegDrawer: string;

  async function events(itemId: string) {
    const { rows } = await db.query<{ type: string; delta: string | null; by: string | null }>(
      `select type, quantity_delta::text as delta, created_by as by
       from public.item_events where item_id = $1 order by created_at, id`,
      [itemId],
    );
    return rows;
  }

  async function lastEvent(itemId: string) {
    const all = await events(itemId);
    return all[all.length - 1];
  }

  function addItem(tx: Transaction, qty = 3) {
    return tx
      .query<{ id: string }>(
        `insert into public.fridge_items (fridge_id, ingredient_id, storage, quantity, unit, expires_at)
         values ($1, 'onion', 'room', $2, 'ea', current_date + 30) returning id`,
        [fridgeId, qty],
      )
      .then((r) => r.rows[0].id);
  }

  const update = (itemId: string, set: string, params: unknown[] = []) =>
    asUser(db, USER, (tx) =>
      tx.query(`update public.fridge_items set ${set} where id = $1`, [itemId, ...params]),
    );

  beforeAll(async () => {
    db = await createTestDb();
    await signUp(db, USER, "events@example.com");
    const { rows } = await db.query<{ fridge: string; veg: string }>(
      `select f.id as fridge, c.id as veg from public.fridges f
       join public.compartments c on c.fridge_id = f.id and c.slot = 'veg_drawer'
       where f.owner_id = $1`,
      [USER],
    );
    fridgeId = rows[0].fridge;
    vegDrawer = rows[0].veg;
  });

  it("재료를 넣으면 added 이력을 본인 이름으로 남긴다", async () => {
    const id = await asUser(db, USER, (tx) => addItem(tx));
    expect(await events(id)).toEqual([{ type: "added", delta: "3.00", by: USER }]);
  });

  it("수량을 줄이면 used, 늘리면 edited", async () => {
    const id = await asUser(db, USER, (tx) => addItem(tx));
    await update(id, "quantity = 2");
    expect(await lastEvent(id)).toMatchObject({ type: "used", delta: "-1.00" });
    await update(id, "quantity = 5");
    expect(await lastEvent(id)).toMatchObject({ type: "edited", delta: "3.00" });
  });

  it("칸이나 보관 방식을 바꾸면 moved", async () => {
    const id = await asUser(db, USER, (tx) => addItem(tx));
    await update(id, "compartment_id = $2, storage = 'fridge'", [vegDrawer]);
    expect(await lastEvent(id)).toMatchObject({ type: "moved", delta: null });
  });

  it("기한·메모를 고치면 edited, updated_at만 바뀌면 남기지 않는다", async () => {
    const id = await asUser(db, USER, (tx) => addItem(tx));
    await update(id, "expires_at = current_date + 1, expires_manual = true");
    expect(await lastEvent(id)).toMatchObject({ type: "edited", delta: null });
    const before = (await events(id)).length;
    await update(id, "updated_at = now()");
    expect(await events(id)).toHaveLength(before);
  });

  it("다 씀은 used, 버림은 discarded(남은 수량만큼 음수)", async () => {
    const usedUp = await asUser(db, USER, (tx) => addItem(tx, 2));
    await update(usedUp, "status = 'used_up', quantity = 0, closed_at = now()");
    expect(await lastEvent(usedUp)).toMatchObject({ type: "used", delta: "-2.00" });

    const thrown = await asUser(db, USER, (tx) => addItem(tx, 4));
    await update(thrown, "status = 'discarded', closed_at = now()");
    expect(await lastEvent(thrown)).toMatchObject({ type: "discarded", delta: "-4.00" });
  });

  it("요리 완료는 cooked와 레시피 id로 남고, 같은 트랜잭션의 이후 변경은 cooked가 아니다", async () => {
    const id = await asUser(db, USER, (tx) => addItem(tx, 3));
    await asUser(db, USER, async (tx) => {
      await tx.query(`select public.cook_recipe($1, 'kimchi_stew', $2::jsonb)`, [
        fridgeId,
        JSON.stringify([{ item_id: id, amount: 1 }]),
      ]);
      await tx.query(`update public.fridge_items set memo = '반 남음' where id = $1`, [id]);
    });
    const all = await events(id);
    expect(all.slice(-2).map((e) => e.type)).toEqual(["cooked", "edited"]);
    const { rows } = await db.query<{ recipe_id: string }>(
      `select recipe_id from public.item_events where item_id = $1 and type = 'cooked'`,
      [id],
    );
    expect(rows).toEqual([{ recipe_id: "kimchi_stew" }]);
  });
});
