-- 회원 탈퇴: 호출한 본인의 auth.users 행을 지운다.
-- profiles → fridges(소유) → 재료·이력·장보기·요리 기록이 on delete cascade로 함께 지워진다.
-- 2차 공유에서 남의 냉장고 멤버였던 행도 fridge_members cascade로 지워진다.
--
-- security definer: 브라우저 권한(authenticated)으로는 auth.users를 지울 수 없어서 필요하다.
-- 대상은 항상 auth.uid() 하나로 고정되어 다른 사용자를 지울 수 없다.

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다' using errcode = '42501';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
