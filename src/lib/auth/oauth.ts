"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearTrial } from "@/lib/trial/trial-store";
import { safeNextPath } from "./redirect";

/** 결정 D2: 첫 출시는 카카오·구글만 */
export type OAuthProvider = "kakao" | "google";

export const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  kakao: "카카오로 시작하기",
  google: "구글로 시작하기",
};

/**
 * 소셜 로그인을 시작한다. 제공자 화면으로 이동한 뒤 /auth/callback으로 돌아온다.
 * 카카오는 비즈 앱이 아니면 이메일을 받을 수 없으므로 닉네임·프로필 사진만 요청한다.
 */
export async function signInWithProvider(provider: OAuthProvider, next?: string) {
  const supabase = getSupabaseBrowserClient();
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", safeNextPath(next));

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callback.toString(),
      scopes: provider === "kakao" ? "profile_nickname profile_image" : undefined,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await getSupabaseBrowserClient().auth.signOut();
  if (error) throw error;
}

/** 회원 탈퇴: 계정과 냉장고 데이터를 모두 지우고 이 기기의 세션·체험 데이터도 정리한다. */
export async function deleteMyAccount() {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error(`탈퇴하지 못했습니다: ${error.message}`);
  // 서버에서 사용자가 지워졌으므로 로컬 세션만 정리한다.
  await supabase.auth.signOut({ scope: "local" });
  clearTrial();
}
