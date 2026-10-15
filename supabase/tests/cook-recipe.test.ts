// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { asUser, createTestDb, signUp } from "./harness";

const ME = "00000000-0000-0000-0000-0000000000e1";
const OTHER = "00000000-0000-0000-0000-0000000000e2";

type Usage = { item_id: string; amount: number | null };

function cook(tx: Transaction, fridgeId: string, recipeId: string, usages: Usage[]) {
  return tx.query<{ id: string }>(`select public.cook_recipe($1, $2, $3::jsonb) as id`, [
    fridgeId,
    recipeId,
    JSON.stringify(usages),
  ]);
}

describe("cook_recipe RPC", () => {
  let db: PGlite;
  let myFridge: string;
  let otherFridge: string;
  let pork: string;
  let onion: string;

  async function fridgeOf(userId: string) {
    const { rows } = await db.query<{ id: string }>(
      `select id from public.fridges where owner_id = $1`,
      [userId],
    );
    return rows[0].id;
  }

  async function addItem(fridgeId: string, name: string, qty: number, unit: string) {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.fridge_items (fridge_id, custom_name, storage, quantity, unit, expires_at)
       values ($1, $2, 'fridge', $3, $4, current_date + 3) returning id`,
      [fridgeId, name, qty, unit],
    );
    return rows[0].id;
  }

  async function item(id: string) {
    const { rows } = await db.query<{ quantity: string; status: string; closed: boolean }>(
      `select quantity::text, status, closed_at is not null as closed
       from public.fridge_items where id = $1`,
      [id],
    );
    return rows[0];
  }

  beforeAll(async () => {
    db = await createTestDb();
    await signUp(db, ME, "me@example.com");
    await signUp(db, OTHER, "other@example.com");
    myFridge = await fridgeOf(ME);
    otherFridge = await fridgeOf(OTHER);
    await db.exec(
      `insert into public.recipes (id, name, minutes) values ('jeyuk', '제육볶음', 20)`,
    );
  });

  beforeEach(async () => {
    await db.exec(`delete from public.item_events; delete from public.cook_logs;
                   delete from public.fridge_items;`);
    pork = await addItem(myFridge, "돼지고기", 600, "g");
    onion = await addItem(myFridge, "양파", 3, "ea");
  });

  it("쓴 만큼 수량을 차감하고 이력과 요리 기록을 남긴다", async () => {
    const logId = await asUser(db, ME, async (tx) => {
      const r = await cook(tx, myFridge, "jeyuk", [
        { item_id: pork, amount: 200 },
        { item_id: onion, amount: 1 },
      ]);
      return r.rows[0].id;
    });

    expect(logId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await item(pork)).toEqual({ quantity: "400.00", status: "active", closed: false });
    expect(await item(onion)).toEqual({ quantity: "2.00", status: "active", closed: false });

    const { rows: events } = await db.query<{ delta: string; type: string; created_by: string }>(
      `select quantity_delta::text as delta, type, created_by from public.item_events
       order by quantity_delta`,
    );
    expect(events).toEqual([
      { delta: "-200.00", type: "cooked", created_by: ME },
      { delta: "-1.00", type: "cooked", created_by: ME },
    ]);

    const { rows: logs } = await db.query<{ cooked_by: string }>(
      `select cooked_by from public.cook_logs`,
    );
    expect(logs).toEqual([{ cooked_by: ME }]);
  });

  it("남은 양보다 많이 쓰거나 amount가 null이면 다 쓴 것으로 처리한다", async () => {
    await asUser(db, ME, (tx) =>
      cook(tx, myFridge, "jeyuk", [
        { item_id: pork, amount: 9999 },
        { item_id: onion, amount: null },
      ]),
    );
    expect(await item(pork)).toEqual({ quantity: "0.00", status: "used_up", closed: true });
    expect(await item(onion)).toEqual({ quantity: "0.00", status: "used_up", closed: true });
  });

  it("하나라도 실패하면 전체가 취소된다", async () => {
    const strangerItem = await addItem(otherFridge, "남의 두부", 1, "pack");

    await expect(
      asUser(db, ME, (tx) =>
        cook(tx, myFridge, "jeyuk", [
          { item_id: pork, amount: 200 },
          { item_id: strangerItem, amount: 1 },
        ]),
      ),
    ).rejects.toThrow(/냉장고에 없는 재료/);

    expect(await item(pork)).toEqual({ quantity: "600.00", status: "active", closed: false });
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.cook_logs`,
    );
    expect(rows[0].n).toBe(0);
  });

  it("남의 냉장고로는 요리할 수 없다", async () => {
    await expect(
      asUser(db, OTHER, (tx) => cook(tx, myFridge, "jeyuk", [{ item_id: pork, amount: 1 }])),
    ).rejects.toThrow(/접근할 수 없습니다/);
  });

  it("없는 레시피와 0 이하 사용량은 거부한다", async () => {
    await expect(
      asUser(db, ME, (tx) => cook(tx, myFridge, "nope", [{ item_id: pork, amount: 1 }])),
    ).rejects.toThrow(/레시피가 없습니다/);
    await expect(
      asUser(db, ME, (tx) => cook(tx, myFridge, "jeyuk", [{ item_id: pork, amount: 0 }])),
    ).rejects.toThrow(/0보다 커야/);
  });

  it("이미 다 쓴 재료는 다시 쓸 수 없다", async () => {
    await asUser(db, ME, (tx) => cook(tx, myFridge, "jeyuk", [{ item_id: onion, amount: null }]));
    await expect(
      asUser(db, ME, (tx) => cook(tx, myFridge, "jeyuk", [{ item_id: onion, amount: 1 }])),
    ).rejects.toThrow(/냉장고에 없는 재료/);
  });
});
