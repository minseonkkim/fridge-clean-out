"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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
