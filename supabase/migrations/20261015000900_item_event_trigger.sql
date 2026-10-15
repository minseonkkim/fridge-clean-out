-- 재료가 추가·수정될 때 item_events를 자동으로 남긴다 (기획서 F1, 7.2절).
-- 클라이언트는 supabase-js로 fridge_items만 insert/update 하면 된다.
--
-- 이벤트 종류 결정 규칙 (src/lib/trial/trial-store.ts와 같은 규칙)
--   insert                          → added   (delta = 수량)
--   status → used_up                → used    (delta = 새 수량 - 이전 수량)
--   status → discarded              → discarded (delta = -이전 수량)
--   칸·보관 방식 변경               → moved
--   수량 감소                       → used
--   그 밖의 변경                    → edited  (수량이 바뀌었으면 delta)
--
-- 함수가 직접 문맥을 정할 때는 트랜잭션 로컬 설정을 쓴다.
--   app.item_event_type = 'cooked', app.item_event_recipe = '<recipe id>'  → cooked
--   app.skip_item_events = 'on'  → 기록하지 않음 (체험 데이터 이전처럼 이력을 직접 넣을 때)

create function public.log_item_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ctx_type text := nullif(current_setting('app.item_event_type', true), '');
  ctx_recipe text := nullif(current_setting('app.item_event_recipe', true), '');
  ev_type text;
  delta numeric;
begin
  if current_setting('app.skip_item_events', true) = 'on' then
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into public.item_events (item_id, fridge_id, type, quantity_delta)
    values (new.id, new.fridge_id, 'added', new.quantity);
    return null;
  end if;

  delta := case when new.quantity is distinct from old.quantity then new.quantity - old.quantity end;

  if ctx_type = 'cooked' then
    ev_type := 'cooked';
  elsif new.status is distinct from old.status and new.status = 'used_up' then
    ev_type := 'used';
  elsif new.status is distinct from old.status and new.status = 'discarded' then
    ev_type := 'discarded';
    delta := -old.quantity;
  elsif new.compartment_id is distinct from old.compartment_id
     or new.storage is distinct from old.storage then
    ev_type := 'moved';
  elsif delta < 0 then
    ev_type := 'used';
  elsif row(new.*) is distinct from row(old.*) then
    ev_type := 'edited';
  else
    return null;
  end if;

  -- updated_at만 바뀐 경우처럼 의미 없는 변경은 남기지 않는다.
  if ev_type = 'edited'
     and delta is null
     and new.custom_name is not distinct from old.custom_name
     and new.expires_at is not distinct from old.expires_at
     and new.memo is not distinct from old.memo
     and new.unit is not distinct from old.unit then
    return null;
  end if;

  insert into public.item_events (item_id, fridge_id, type, quantity_delta, recipe_id)
  values (new.id, new.fridge_id, ev_type, delta, case when ev_type = 'cooked' then ctx_recipe end);
  return null;
end;
$$;

create trigger fridge_items_log_event
  after insert or update on public.fridge_items
  for each row execute function public.log_item_event();

-- ─────────────────────────────────────────────
-- 요리 완료: 이력은 트리거가 'cooked'로 남긴다.
-- ─────────────────────────────────────────────

create or replace function public.cook_recipe(
  p_fridge_id uuid,
  p_recipe_id text,
  p_usages jsonb,
  p_servings smallint default 1
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  log_id uuid;
  usage jsonb;
  target_item_id uuid;
  requested numeric;
  current_qty numeric;
  used numeric;
begin
  if not public.is_fridge_member(p_fridge_id) then
    raise exception '냉장고에 접근할 수 없습니다' using errcode = '42501';
  end if;

  if not exists (select 1 from public.recipes where id = p_recipe_id) then
    raise exception '레시피가 없습니다: %', p_recipe_id using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_usages) is distinct from 'array' then
    raise exception 'p_usages는 배열이어야 합니다' using errcode = '22023';
  end if;

  perform set_config('app.item_event_type', 'cooked', true);
  perform set_config('app.item_event_recipe', p_recipe_id, true);

  insert into public.cook_logs (fridge_id, recipe_id, servings)
  values (p_fridge_id, p_recipe_id, p_servings)
  returning id into log_id;

  for usage in select value from jsonb_array_elements(p_usages)
  loop
    target_item_id := (usage ->> 'item_id')::uuid;
    requested := (usage ->> 'amount')::numeric;

    if requested is not null and requested <= 0 then
      raise exception '사용량은 0보다 커야 합니다' using errcode = '22023';
    end if;

    select quantity into current_qty
    from public.fridge_items
    where id = target_item_id and fridge_id = p_fridge_id and status = 'active'
    for update;

    if not found then
      raise exception '냉장고에 없는 재료입니다: %', target_item_id using errcode = 'P0002';
    end if;

    used := least(coalesce(requested, current_qty), current_qty);

    update public.fridge_items
    set quantity = current_qty - used,
        status = case when current_qty - used = 0 then 'used_up' else status end,
        closed_at = case when current_qty - used = 0 then now() else closed_at end
    where id = target_item_id;
  end loop;

  -- 같은 트랜잭션에서 이어지는 다른 변경이 'cooked'로 남지 않게 되돌린다.
  perform set_config('app.item_event_type', '', true);
  perform set_config('app.item_event_recipe', '', true);

  return log_id;
end;
$$;

-- 체험 데이터 이전(import_trial_data)은 0700에서 이미 app.skip_item_events를 켜고 이력을 직접 옮긴다.
