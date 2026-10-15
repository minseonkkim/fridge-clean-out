import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/redirect";

/**
 * OAuth 제공자가 돌려보낸 code를 세션으로 바꾸고 원래 가려던 곳으로 보낸다.
 * 세션 쿠키는 server 클라이언트가 응답에 심는다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    const reason = searchParams.get("error_description") ?? "missing_code";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // 로그인 직후 체험 데이터를 올릴 수 있도록 표시를 남긴다 (클라이언트가 처리).
  const target = new URL(next, origin);
  target.searchParams.set("signedIn", "1");
  return NextResponse.redirect(target);
}
