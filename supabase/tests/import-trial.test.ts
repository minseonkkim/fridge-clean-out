// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  addItems,
  closeItem,
  emptyTrial,
  updateItem,
  updatePreferences,
  type TrialData,
} from "@/lib/trial/trial-store";
import { asAnon, asUser, createTestDb, signUp } from "./harness";

const USER = "00000000-0000-0000-0000-00000000717a";
const OTHER = "00000000-0000-0000-0000-00000000717b";

type ImportResult = { items: number; events: number; shopping: number; preferences: boolean };

function importTrial(db: PGlite, userId: string, trial: TrialData) {
  return asUser(db, userId, async (tx) => {
    const r = await tx.query<{ result: ImportResult }>(
      `select public.import_trial_data($1::jsonb) as result`,
      [JSON.stringify(trial)],
    );
    return r.rows[0].result;
  });
}

/** 실제 체험 저장소 함수로 만든 데이터 */
function buildTrial(): TrialData {
  let trial = addItems(emptyTrial(), [
    {
      ingredientId: "onion",
      storage: "room",
      slot: "pantry",
      quantity: 3,
      unit: "ea",
      purchasedAt: "2026-10-10",
      expiresAt: "2026-11-09",
    },
    {
      ingredientId: "pork",
      storage: "fridge",
      slot: "fridge_bottom",
      quantity: 600,
      unit: "g",
      purchasedAt: "2026-10-14",
      expiresAt: "2026-10-17",
    },
    {
      ingredientId: null,
      customName: "엄마표 장아찌",
      storage: "fridge",
      slot: "fridge_middle",
      quantity: 1,
      unit: "pack",
      purchasedAt: "2026-10-01",
      expiresAt: "2026-12-01",
    },
    {
      // 사전에서 사라진 재료 id도 이름으로 보존되어야 한다
      ingredientId: "dragon_fruit",
      storage: "fridge",
      quantity: 1,
      unit: "ea",
      purchasedAt: "2026-10-14",
      expiresAt: "2026-10-20",
    },
  ]);
  const [onion, pork] = trial.items;
  trial = updateItem(trial, pork.id, { quantity: 400 });
  trial = closeItem(trial, onion.id, "used_up");
  trial = {
    ...trial,
    shopping: [
      {
        id: crypto.randomUUID(),
        ingredientId: "tofu",
        name: "두부",
        quantity: 1,
        unit: "pack",
        checked: false,
        fromRecipeId: "kimchi_stew",
        createdAt: "2026-10-15T00:00:00.000Z",
      },
    ],
  };
  return updatePreferences(trial, {
    mealsPerDay: 1,
    tools: ["air_fryer"],
    disabledPantry: ["gochujang"],
    onboardedAt: "2026-10-15T00:00:00.000Z",
  });
}

describe("import_trial_data RPC", () => {
  let db: PGlite;
  let trial: TrialData;
  let firstResult: ImportResult;

  beforeAll(async () => {
    db = await createTestDb();
    await signUp(db, USER, "trial@example.com");
    await signUp(db, OTHER, "other@example.com");
    trial = buildTrial();
    firstResult = await importTrial(db, USER, trial);
  });

  it("재료·이력·장보기·설정을 모두 올린다", () => {
    expect(firstResult).toEqual({ items: 4, events: 6, shopping: 1, preferences: true });
  });

  it("slot을 내 냉장고의 실제 칸으로 바꾸고 상태를 보존한다", async () => {
    const { rows } = await db.query<{
      name: string;
      slot: string | null;
      status: string;
      qty: string;
    }>(
      `select coalesce(i.name, fi.custom_name) as name, c.slot, fi.status, fi.quantity::text as qty
       from public.fridge_items fi
       join public.fridges f on f.id = fi.fridge_id and f.owner_id = $1
       left join public.ingredients i on i.id = fi.ingredient_id
       left join public.compartments c on c.id = fi.compartment_id
       order by fi.created_at, name`,
      [USER],
    );
    expect(rows).toEqual(
      expect.arrayContaining([
        { name: "양파", slot: "pantry", status: "used_up", qty: "0.00" },
        { name: "돼지고기", slot: "fridge_bottom", status: "active", qty: "400.00" },
        { name: "엄마표 장아찌", slot: "fridge_middle", status: "active", qty: "1.00" },
        { name: "dragon_fruit", slot: null, status: "active", qty: "1.00" },
      ]),
    );
  });

  it("설정을 옮긴다", async () => {
    const { rows } = await db.query<{ meals: number; tools: string[]; pantry: unknown }>(
      `select meals_per_day as meals, tools, pantry_overrides as pantry
       from public.user_preferences where user_id = $1`,
      [USER],
    );
    expect(rows[0]).toEqual({
      meals: 1,
      tools: ["air_fryer"],
      pantry: { disabled_pantry: ["gochujang"] },
    });
  });

  it("다시 호출해도 중복으로 들어가지 않는다", async () => {
    expect(await importTrial(db, USER, trial)).toEqual({
      items: 0,
      events: 0,
      shopping: 0,
      preferences: false,
    });
  });

  it("이미 온보딩한 계정의 설정은 덮어쓰지 않는다", async () => {
    const again = updatePreferences(emptyTrial(), {
      mealsPerDay: 3,
      onboardedAt: "2026-10-16T00:00:00.000Z",
    });
    const result = await importTrial(db, USER, again);
    expect(result.preferences).toBe(false);
    const { rows } = await db.query<{ meals: number }>(
      `select meals_per_day as meals from public.user_preferences where user_id = $1`,
      [USER],
    );
    expect(rows[0].meals).toBe(1);
  });

  it("같은 id로 남의 계정에 올려도 남의 데이터를 건드리지 않는다", async () => {
    const result = await importTrial(db, OTHER, trial);
    expect(result.items).toBe(0);
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.fridge_items fi
       join public.fridges f on f.id = fi.fridge_id where f.owner_id = $1`,
      [OTHER],
    );
    expect(rows[0].n).toBe(0);
  });

  it("비로그인으로는 호출할 수 없다", async () => {
    await expect(
      asAnon(db, (tx) => tx.query(`select public.import_trial_data('{}'::jsonb)`)),
    ).rejects.toThrow(/permission denied/);
  });
});
