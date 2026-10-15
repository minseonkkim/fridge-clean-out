-- RLS 정책: 내 냉장고(소유하거나 멤버인 냉장고) 데이터만 읽고 쓸 수 있다.
-- 2차 '냉장고 공유'는 fridge_members에 행을 추가하는 것만으로 동작한다.

-- ─────────────────────────────────────────────
-- 권한 판단 함수
-- ─────────────────────────────────────────────

-- security definer: fridges/fridge_members의 RLS를 다시 타지 않아 재귀를 막는다.
create function public.is_fridge_member(target_fridge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.fridges f
    where f.id = target_fridge_id and f.owner_id = auth.uid()
  ) or exists (
    select 1 from public.fridge_members m
    where m.fridge_id = target_fridge_id and m.user_id = auth.uid()
  );
$$;

revoke execute on function public.is_fridge_member(uuid) from public, anon;
grant execute on function public.is_fridge_member(uuid) to authenticated;

-- ─────────────────────────────────────────────
-- 무결성: 재료는 같은 냉장고의 칸에만 놓을 수 있다
-- ─────────────────────────────────────────────

alter table public.compartments add constraint compartments_id_fridge_key unique (id, fridge_id);

alter table public.fridge_items drop constraint fridge_items_compartment_id_fkey;
alter table public.fridge_items
  add constraint fridge_items_compartment_fridge_fkey
  foreign key (compartment_id, fridge_id)
  references public.compartments (id, fridge_id)
  on delete set null (compartment_id);

-- ─────────────────────────────────────────────
-- RLS 켜기
-- ─────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.fridges enable row level security;
alter table public.fridge_members enable row level security;
alter table public.compartments enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.fridge_items enable row level security;
alter table public.item_events enable row level security;
alter table public.shopping_items enable row level security;
alter table public.cook_logs enable row level security;

-- ─────────────────────────────────────────────
-- 마스터 데이터: 누구나 읽기, 아무도 쓰지 않음 (마이그레이션·시드로만 변경)
-- ─────────────────────────────────────────────

revoke insert, update, delete, truncate on public.ingredients, public.recipes, public.recipe_ingredients
  from anon, authenticated;

create policy "누구나 재료 사전을 읽는다" on public.ingredients
  for select to anon, authenticated using (true);
create policy "누구나 레시피를 읽는다" on public.recipes
  for select to anon, authenticated using (true);
create policy "누구나 레시피 재료를 읽는다" on public.recipe_ingredients
  for select to anon, authenticated using (true);

-- ─────────────────────────────────────────────
-- 사용자 본인 데이터
-- ─────────────────────────────────────────────

-- 생성은 가입 트리거가 하므로 insert 정책이 없다.
create policy "본인 프로필 읽기" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "본인 프로필 수정" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "본인 설정 읽기" on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "본인 설정 추가" on public.user_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "본인 설정 수정" on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────
-- 냉장고
-- ─────────────────────────────────────────────

create policy "멤버는 냉장고를 읽는다" on public.fridges
  for select to authenticated using (public.is_fridge_member(id));
create policy "본인 소유로만 냉장고를 만든다" on public.fridges
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "소유자만 냉장고를 수정한다" on public.fridges
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "소유자만 냉장고를 삭제한다" on public.fridges
  for delete to authenticated using (owner_id = (select auth.uid()));

-- 멤버 추가·삭제는 2차에서 초대 함수(security definer)로 처리한다.
create policy "멤버는 같은 냉장고 멤버 목록을 읽는다" on public.fridge_members
  for select to authenticated using (public.is_fridge_member(fridge_id));

create policy "멤버는 칸을 읽는다" on public.compartments
  for select to authenticated using (public.is_fridge_member(fridge_id));
create policy "멤버는 칸 이름을 바꾼다" on public.compartments
  for update to authenticated
  using (public.is_fridge_member(fridge_id)) with check (public.is_fridge_member(fridge_id));

-- ─────────────────────────────────────────────
-- 냉장고에 딸린 데이터: 멤버면 모든 작업 가능
-- ─────────────────────────────────────────────

create policy "멤버는 재료를 다룬다" on public.fridge_items
  for all to authenticated
  using (public.is_fridge_member(fridge_id)) with check (public.is_fridge_member(fridge_id));

create policy "멤버는 장보기 목록을 다룬다" on public.shopping_items
  for all to authenticated
  using (public.is_fridge_member(fridge_id)) with check (public.is_fridge_member(fridge_id));

-- 이력과 요리 기록은 지우거나 고치지 않는다 (통계·되돌리기의 근거).
revoke update, delete, truncate on public.item_events, public.cook_logs from anon, authenticated;

create policy "멤버는 이력을 읽는다" on public.item_events
  for select to authenticated using (public.is_fridge_member(fridge_id));
create policy "멤버는 이력을 남긴다" on public.item_events
  for insert to authenticated
  with check (public.is_fridge_member(fridge_id) and created_by = (select auth.uid()));

create policy "멤버는 요리 기록을 읽는다" on public.cook_logs
  for select to authenticated using (public.is_fridge_member(fridge_id));
create policy "멤버는 요리 기록을 남긴다" on public.cook_logs
  for insert to authenticated
  with check (public.is_fridge_member(fridge_id) and cooked_by = (select auth.uid()));
