-- 첫 로그인(가입) 시 프로필, 기본 설정, 기본 냉장고, 칸 구조를 만든다. (기획서 6장 인증 흐름 2번)

-- 기본 칸 구조 (기획서 3.1절). 자동 배치 규칙은 slot 값을 기준으로 한다.
create function public.create_default_compartments(target_fridge_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.compartments (fridge_id, zone, kind, slot, label, position) values
    (target_fridge_id, 'fridge',  'shelf',  'fridge_top',    '위 선반',       0),
    (target_fridge_id, 'fridge',  'shelf',  'fridge_middle', '가운데 선반',   1),
    (target_fridge_id, 'fridge',  'shelf',  'fridge_bottom', '아래 선반',     2),
    (target_fridge_id, 'fridge',  'drawer', 'veg_drawer',    '채소칸',        3),
    (target_fridge_id, 'fridge',  'door',   'fridge_door',   '문 선반',       4),
    (target_fridge_id, 'freezer', 'drawer', 'freezer_upper', '냉동 위 서랍',  5),
    (target_fridge_id, 'freezer', 'drawer', 'freezer_lower', '냉동 아래 서랍', 6),
    (target_fridge_id, 'room',    'shelf',  'pantry',        '팬트리 선반',   7);
$$;

revoke execute on function public.create_default_compartments(uuid) from public, anon, authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  new_fridge_id uuid;
begin
  insert into public.profiles (id, email, nickname, avatar_url)
  values (
    new.id,
    new.email,
    -- 카카오는 nickname/name, 구글은 name/full_name을 준다.
    coalesce(
      nullif(meta ->> 'nickname', ''),
      nullif(meta ->> 'name', ''),
      nullif(meta ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    ),
    coalesce(nullif(meta ->> 'avatar_url', ''), nullif(meta ->> 'picture', ''))
  );

  insert into public.user_preferences (user_id) values (new.id);

  insert into public.fridges (owner_id) values (new.id) returning id into new_fridge_id;

  insert into public.fridge_members (fridge_id, user_id, role)
  values (new_fridge_id, new.id, 'owner');

  perform public.create_default_compartments(new_fridge_id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
