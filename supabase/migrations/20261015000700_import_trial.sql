-- 비로그인 체험 데이터를 로그인한 계정으로 한 번에 올린다 (기획서 6장 인증 흐름 4번).
--
-- p_payload는 클라이언트 TrialData(JSON) 그대로다 (src/lib/trial/trial-store.ts).
-- - 체험 데이터의 id(uuid)를 그대로 써서, 다시 호출해도 중복으로 들어가지 않는다.
-- - 칸은 slot 키로 받아 내 기본 냉장고의 칸으로 바꾼다.
-- - 사전에 없는 재료 id는 이름으로 바꿔 보존한다.
-- - 설정은 계정이 아직 온보딩 전일 때만 덮어쓴다.
-- security invoker: RLS가 그대로 적용된다.

create function public.import_trial_data(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_fridge uuid;
  v_items integer := 0;
  v_events integer := 0;
  v_shopping integer := 0;
  v_prefs integer := 0;
  v_prefs_json jsonb := p_payload -> 'preferences';
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다' using errcode = '42501';
  end if;

  select id into v_fridge
  from public.fridges
  where owner_id = v_uid
  order by created_at
  limit 1;

  if v_fridge is null then
    raise exception '냉장고가 없습니다' using errcode = 'P0002';
  end if;

  -- 재료
  with src as (
    select *
    from jsonb_to_recordset(coalesce(p_payload -> 'items', '[]'::jsonb)) as x(
      id uuid, "ingredientId" text, "customName" text, slot text, storage text,
      quantity numeric, unit text, "purchasedAt" date, "expiresAt" date,
      "expiresManual" boolean, memo text, status text, "closedAt" timestamptz,
      "createdAt" timestamptz, "updatedAt" timestamptz
    )
  ), inserted as (
    insert into public.fridge_items (
      id, fridge_id, ingredient_id, custom_name, compartment_id, storage, quantity, unit,
      purchased_at, expires_at, expires_manual, memo, status, closed_at, created_at, updated_at
    )
    select
      s.id,
      v_fridge,
      i.id,
      case
        when i.id is null then coalesce(nullif(btrim(s."customName"), ''), s."ingredientId")
        else nullif(btrim(s."customName"), '')
      end,
      c.id,
      s.storage,
      s.quantity,
      s.unit,
      coalesce(s."purchasedAt", current_date),
      s."expiresAt",
      coalesce(s."expiresManual", false),
      s.memo,
      coalesce(s.status, 'active'),
      case when coalesce(s.status, 'active') = 'active' then null else coalesce(s."closedAt", now()) end,
      coalesce(s."createdAt", now()),
      coalesce(s."updatedAt", now())
    from src s
    left join public.ingredients i on i.id = s."ingredientId"
    left join public.compartments c on c.fridge_id = v_fridge and c.slot = s.slot
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_items from inserted;

  -- 이력: 내 냉장고에 들어간 재료의 것만
  with src as (
    select *
    from jsonb_to_recordset(coalesce(p_payload -> 'events', '[]'::jsonb)) as x(
      id uuid, "itemId" uuid, type text, "quantityDelta" numeric, "recipeId" text,
      "createdAt" timestamptz
    )
  ), inserted as (
    insert into public.item_events (id, item_id, fridge_id, type, quantity_delta, recipe_id, created_at)
    select s.id, s."itemId", v_fridge, s.type, s."quantityDelta", r.id, coalesce(s."createdAt", now())
    from src s
    join public.fridge_items fi on fi.id = s."itemId" and fi.fridge_id = v_fridge
    left join public.recipes r on r.id = s."recipeId"
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_events from inserted;

  -- 장보기 목록
  with src as (
    select *
    from jsonb_to_recordset(coalesce(p_payload -> 'shopping', '[]'::jsonb)) as x(
      id uuid, "ingredientId" text, name text, quantity numeric, unit text, checked boolean,
      "fromRecipeId" text, "createdAt" timestamptz
    )
  ), inserted as (
    insert into public.shopping_items (
      id, fridge_id, ingredient_id, name, quantity, unit, checked, from_recipe_id, created_at
    )
    select s.id, v_fridge, i.id, s.name, s.quantity, s.unit, coalesce(s.checked, false), r.id,
           coalesce(s."createdAt", now())
    from src s
    left join public.ingredients i on i.id = s."ingredientId"
    left join public.recipes r on r.id = s."fromRecipeId"
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_shopping from inserted;

  -- 설정: 체험 중 온보딩을 마쳤고 계정은 아직이면 옮긴다
  if v_prefs_json ->> 'onboardedAt' is not null then
    update public.user_preferences
    set household_size = coalesce((v_prefs_json ->> 'householdSize')::smallint, household_size),
        meals_per_day = coalesce((v_prefs_json ->> 'mealsPerDay')::smallint, meals_per_day),
        excluded_ingredient_ids = coalesce(
          array(select jsonb_array_elements_text(v_prefs_json -> 'excludedIngredientIds')),
          excluded_ingredient_ids),
        tools = coalesce(array(select jsonb_array_elements_text(v_prefs_json -> 'tools')), tools),
        pantry_overrides = jsonb_build_object(
          'disabled_pantry', coalesce(v_prefs_json -> 'disabledPantry', '[]'::jsonb)),
        onboarded_at = (v_prefs_json ->> 'onboardedAt')::timestamptz
    where user_id = v_uid and onboarded_at is null;
    get diagnostics v_prefs = row_count;
  end if;

  return jsonb_build_object(
    'items', v_items,
    'events', v_events,
    'shopping', v_shopping,
    'preferences', v_prefs > 0
  );
end;
$$;

revoke execute on function public.import_trial_data(jsonb) from public, anon;
grant execute on function public.import_trial_data(jsonb) to authenticated;
