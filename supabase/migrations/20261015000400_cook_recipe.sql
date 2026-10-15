-- 요리 완료 처리 (기획서 7.2절): 재고 차감 + item_events + cook_logs를 한 트랜잭션으로.
--
-- 어떤 재료를 얼마나 쓸지는 브라우저의 플래너가 정해서 넘긴다.
--   p_usages: [{"item_id": "<uuid>", "amount": 200}, {"item_id": "<uuid>", "amount": null}]
--   amount가 null이면 남은 양을 모두 쓴다 (단위가 맞지 않을 때 '한 번에 다 씀' 처리, 기획서 9장).
--
-- security invoker: 호출한 사용자의 RLS가 그대로 적용된다.
-- 하나라도 실패하면 전체가 취소된다.

create function public.cook_recipe(
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

    -- 같은 재료를 동시에 차감하지 않도록 잠근다.
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

    insert into public.item_events (item_id, fridge_id, type, quantity_delta, recipe_id)
    values (target_item_id, p_fridge_id, 'cooked', -used, p_recipe_id);
  end loop;

  return log_id;
end;
$$;

revoke execute on function public.cook_recipe(uuid, text, jsonb, smallint) from public, anon;
grant execute on function public.cook_recipe(uuid, text, jsonb, smallint) to authenticated;
