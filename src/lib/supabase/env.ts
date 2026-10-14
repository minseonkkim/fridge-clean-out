/**
 * Supabase 연결 정보. 브라우저에 노출되는 공개 값만 다룬다.
 * 서비스 롤 키는 이 앱에서 쓰지 않는다 (RLS로 권한을 제어한다).
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase 환경 변수가 없습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 넣어 주세요. (.env.example 참고)",
    );
  }

  return { url, key };
}

/** 환경 변수가 설정되어 있는지만 확인한다. 비로그인 체험 모드 판단에 쓴다. */
export function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
