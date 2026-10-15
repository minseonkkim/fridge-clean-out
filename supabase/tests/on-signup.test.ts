// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createTestDb, signUp } from "./harness";

const KAKAO_USER = "00000000-0000-0000-0000-0000000ca0a0";
const GOOGLE_USER = "00000000-0000-0000-0000-000000060061";

describe("가입 트리거", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDb();
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
      KAKAO_USER,
      "kakao@example.com",
      JSON.stringify({ nickname: "냉털러", avatar_url: "https://img.example/a.png" }),
    ]);
    await signUp(db, GOOGLE_USER, "google.user@example.com");
  });

  it("프로필을 만들고 제공자의 닉네임·아바타를 쓴다", async () => {
    const { rows } = await db.query<{ nickname: string; avatar_url: string }>(
      `select nickname, avatar_url from public.profiles where id = $1`,
      [KAKAO_USER],
    );
    expect(rows[0]).toEqual({ nickname: "냉털러", avatar_url: "https://img.example/a.png" });
  });

  it("닉네임이 없으면 이메일 앞부분을 쓴다", async () => {
    const { rows } = await db.query<{ nickname: string }>(
      `select nickname from public.profiles where id = $1`,
      [GOOGLE_USER],
    );
    expect(rows[0].nickname).toBe("google.user");
  });

  it("기본 설정을 만든다", async () => {
    const { rows } = await db.query<{ meals_per_day: number; household_size: number }>(
      `select meals_per_day, household_size from public.user_preferences where user_id = $1`,
      [KAKAO_USER],
    );
    expect(rows[0]).toEqual({ meals_per_day: 2, household_size: 1 });
  });

  it("기본 냉장고 하나와 소유자 멤버 행을 만든다", async () => {
    const { rows } = await db.query<{ name: string; role: string }>(
      `select f.name, m.role from public.fridges f
       join public.fridge_members m on m.fridge_id = f.id and m.user_id = f.owner_id
       where f.owner_id = $1`,
      [KAKAO_USER],
    );
    expect(rows).toEqual([{ name: "내 냉장고", role: "owner" }]);
  });

  it("기획서 3.1절의 칸 8개를 순서대로 만든다", async () => {
    const slots = await asUser(db, KAKAO_USER, async (tx) => {
      const r = await tx.query<{ slot: string; zone: string }>(
        `select c.slot, c.zone from public.compartments c order by c.position`,
      );
      return r.rows;
    });
    expect(slots).toEqual([
      { slot: "fridge_top", zone: "fridge" },
      { slot: "fridge_middle", zone: "fridge" },
      { slot: "fridge_bottom", zone: "fridge" },
      { slot: "veg_drawer", zone: "fridge" },
      { slot: "fridge_door", zone: "fridge" },
      { slot: "freezer_upper", zone: "freezer" },
      { slot: "freezer_lower", zone: "freezer" },
      { slot: "pantry", zone: "room" },
    ]);
  });

  it("가입 직후 본인 권한으로 자기 냉장고에 재료를 넣을 수 있다", async () => {
    await expect(
      asUser(db, KAKAO_USER, async (tx) => {
        const {
          rows: [fridge],
        } = await tx.query<{ id: string }>(`select id from public.fridges`);
        await tx.query(
          `insert into public.fridge_items (fridge_id, custom_name, storage, quantity, unit, expires_at)
           values ($1, '두부', 'fridge', 1, 'pack', current_date + 5)`,
          [fridge.id],
        );
      }),
    ).resolves.toBeUndefined();
  });
});
