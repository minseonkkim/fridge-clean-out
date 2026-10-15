-- 냉털 레시피 핵심 테이블 (기획서 7.1절)
-- 마스터 데이터(ingredients, recipes, recipe_ingredients)는 사람이 읽을 수 있는 text id를 쓴다.
-- 사용자 데이터는 uuid id를 쓴다.

-- ─────────────────────────────────────────────
-- 사용자
-- ─────────────────────────────────────────────

-- 기획서의 users 테이블. Supabase auth.users와 1:1.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nickname text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  household_size smallint not null default 1 check (household_size between 1 and 10),
  meals_per_day smallint not null default 2 check (meals_per_day between 1 and 3),
  excluded_ingredient_ids text[] not null default '{}',
  tools text[] not null default '{}',
  -- 기본 양념을 끈 목록 등. 예: {"disabled_pantry": ["gochujang"]}
  pantry_overrides jsonb not null default '{}'::jsonb,
  notify_time time,
  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 냉장고
-- ─────────────────────────────────────────────

create table public.fridges (
  id uuid primary key default gen_random_uuid(),
  name text not null default '내 냉장고',
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index fridges_owner_id_idx on public.fridges (owner_id);

-- 2차 '냉장고 공유'용. MVP에서는 스키마만 두고 owner 행만 자동으로 들어간다.
create table public.fridge_members (
  fridge_id uuid not null references public.fridges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (fridge_id, user_id)
);

create index fridge_members_user_id_idx on public.fridge_members (user_id);

-- 칸 구조 (기획서 3.1절). slot은 자동 배치 규칙이 참조하는 고정 키.
create table public.compartments (
  id uuid primary key default gen_random_uuid(),
  fridge_id uuid not null references public.fridges (id) on delete cascade,
  zone text not null check (zone in ('fridge', 'freezer', 'room')),
  kind text not null check (kind in ('shelf', 'drawer', 'door')),
  slot text not null,
  label text not null,
  position smallint not null,
  unique (fridge_id, slot)
);

-- ─────────────────────────────────────────────
-- 마스터 데이터
-- ─────────────────────────────────────────────

create table public.ingredients (
  id text primary key,                      -- 예: 'onion', 'pork'
  name text not null unique,
  category text not null check (
    category in ('vegetable', 'fruit', 'meat', 'seafood', 'egg_dairy', 'tofu_bean',
                 'grain_noodle', 'processed', 'side_kimchi', 'sauce', 'beverage', 'etc')
  ),
  aliases text[] not null default '{}',
  default_unit text not null check (default_unit in ('ea', 'g', 'ml', 'pack', 'bunch')),
  use_per_recipe numeric(10, 2) not null check (use_per_recipe > 0),
  -- 보관 방식별 권장 일수. 0이면 그 방식은 권장하지 않는다.
  shelf_fridge_days smallint not null default 0 check (shelf_fridge_days >= 0),
  shelf_freezer_days smallint not null default 0 check (shelf_freezer_days >= 0),
  shelf_room_days smallint not null default 0 check (shelf_room_days >= 0),
  default_storage text not null check (default_storage in ('fridge', 'freezer', 'room')),
  icon_key text,
  -- 출처 코드: mfds, usda-foodkeeper, seoul-nutri, manual (docs/데이터 출처 확인.md)
  source text not null default 'manual',
  -- 기본 양념(있다고 가정하는 재료)인지
  is_pantry_staple boolean not null default false
);

create index ingredients_aliases_idx on public.ingredients using gin (aliases);

create table public.recipes (
  id text primary key,                      -- 예: 'kimchi-fried-rice'
  name text not null,
  minutes smallint not null check (minutes > 0),
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  servings smallint not null default 1 check (servings > 0),
  tools text[] not null default '{}',
  -- [{"text": "...", "timer_sec": 180}]
  steps jsonb not null default '[]'::jsonb,
  image_key text,
  source text not null default 'manual'
);

-- 같은 recipe_id 안에서 group_no가 같으면 서로 대체 가능한 재료다.
create table public.recipe_ingredients (
  recipe_id text not null references public.recipes (id) on delete cascade,
  group_no smallint not null,
  ingredient_id text not null references public.ingredients (id),
  required boolean not null default true,
  amount numeric(10, 2) not null check (amount > 0),
  unit text not null,
  primary key (recipe_id, group_no, ingredient_id)
);

create index recipe_ingredients_ingredient_id_idx on public.recipe_ingredients (ingredient_id);

-- ─────────────────────────────────────────────
-- 냉장고 안의 재료와 이력
-- ─────────────────────────────────────────────

create table public.fridge_items (
  id uuid primary key default gen_random_uuid(),
  fridge_id uuid not null references public.fridges (id) on delete cascade,
  ingredient_id text references public.ingredients (id),
  custom_name text,
  compartment_id uuid references public.compartments (id) on delete set null,
  storage text not null check (storage in ('fridge', 'freezer', 'room')),
  quantity numeric(10, 2) not null check (quantity >= 0),
  unit text not null,
  purchased_at date not null default current_date,
  expires_at date not null,
  expires_manual boolean not null default false,
  memo text,
  -- active: 냉장고에 있음 / used_up: 다 씀 / discarded: 버림. 재료 소진율 지표에 쓴다.
  status text not null default 'active' check (status in ('active', 'used_up', 'discarded')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 사전 재료이거나, 사전에 없으면 이름이 있어야 한다.
  check (ingredient_id is not null or nullif(btrim(custom_name), '') is not null),
  check ((status = 'active') = (closed_at is null))
);

create index fridge_items_active_idx on public.fridge_items (fridge_id, expires_at)
  where status = 'active';

create table public.item_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.fridge_items (id) on delete set null,
  fridge_id uuid not null references public.fridges (id) on delete cascade,
  type text not null check (type in ('added', 'used', 'cooked', 'discarded', 'moved', 'edited')),
  quantity_delta numeric(10, 2),
  recipe_id text references public.recipes (id),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  -- 한 트랜잭션 안의 여러 이력도 순서가 보이도록 실제 기록 시각을 쓴다.
  created_at timestamptz not null default clock_timestamp()
);

create index item_events_fridge_created_idx on public.item_events (fridge_id, created_at desc);

-- ─────────────────────────────────────────────
-- 장보기와 요리 기록
-- ─────────────────────────────────────────────

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  fridge_id uuid not null references public.fridges (id) on delete cascade,
  ingredient_id text references public.ingredients (id),
  name text not null,
  quantity numeric(10, 2),
  unit text,
  checked boolean not null default false,
  from_recipe_id text references public.recipes (id) on delete set null,
  created_at timestamptz not null default now()
);

create index shopping_items_fridge_id_idx on public.shopping_items (fridge_id);

create table public.cook_logs (
  id uuid primary key default gen_random_uuid(),
  fridge_id uuid not null references public.fridges (id) on delete cascade,
  recipe_id text not null references public.recipes (id),
  servings smallint not null default 1 check (servings > 0),
  cooked_by uuid references public.profiles (id) on delete set null default auth.uid(),
  cooked_at timestamptz not null default now()
);

create index cook_logs_fridge_cooked_idx on public.cook_logs (fridge_id, cooked_at desc);

-- ─────────────────────────────────────────────
-- updated_at 자동 갱신
-- ─────────────────────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger fridge_items_set_updated_at
  before update on public.fridge_items
  for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();
