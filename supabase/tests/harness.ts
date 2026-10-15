import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

/**
 * Supabase가 기본으로 제공하는 것 중 마이그레이션이 기대는 최소한만 흉내 낸다.
 * - auth 스키마와 auth.users
 * - auth.uid(): request.jwt.claim.sub 설정값을 읽는다 (Supabase와 같은 방식)
 * - anon / authenticated 역할과 public 스키마 기본 권한
 */
const SUPABASE_SHIM = `
create role anon nologin;
create role authenticated nologin;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;
`;

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** 새 메모리 DB를 만들고 모든 마이그레이션을 순서대로 적용한다. */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  for (const file of migrationFiles()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`마이그레이션 실패: ${file}\n${(error as Error).message}`);
    }
  }
  return db;
}

/** auth.users에 사용자를 넣는다 (가입 흉내). 서버 권한으로 실행된다. */
export async function signUp(db: PGlite, id: string, email: string, nickname?: string) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    email,
    JSON.stringify(nickname ? { name: nickname } : {}),
  ]);
}

/**
 * 로그인한 사용자 권한(authenticated 역할 + JWT sub)으로 실행한다. RLS가 적용된다.
 * 트랜잭션 안에서만 역할을 바꾸므로 끝나면 원래 권한으로 돌아온다.
 */
export async function asUser<T>(
  db: PGlite,
  userId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await tx.exec(`set local role authenticated`);
    return fn(tx);
  });
}

/** 비로그인(anon) 권한으로 실행한다. */
export async function asAnon<T>(db: PGlite, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role anon`);
    return fn(tx);
  });
}
