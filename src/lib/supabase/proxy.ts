import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, getSupabaseEnv } from "./env";

/**
 * 요청마다 Supabase 세션 쿠키를 갱신한다. src/proxy.ts에서 호출한다.
 * 만료된 액세스 토큰을 리프레시 토큰으로 바꿔 서버 컴포넌트가 항상 유효한 세션을 보게 한다.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // 환경 변수가 없으면(로컬 체험 모드) 아무것도 하지 않는다.
  if (!hasSupabaseEnv()) return response;

  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser()는 토큰을 서버에서 검증하고, 필요하면 갱신해 setAll을 호출한다.
  await supabase.auth.getUser();

  return response;
}
