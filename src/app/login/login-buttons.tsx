"use client";

import { useState } from "react";
import { PROVIDER_LABEL, signInWithProvider, type OAuthProvider } from "@/lib/auth/oauth";

const PROVIDER_STYLE: Record<OAuthProvider, string> = {
  kakao: "bg-[#FEE500] text-black/85",
  google: "bg-white text-neutral-800 ring-1 ring-neutral-300",
};

export function LoginButtons({ next, enabled }: { next?: string; enabled: boolean }) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(provider: OAuthProvider) {
    setPending(provider);
    setError(null);
    try {
      await signInWithProvider(provider, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인을 시작하지 못했습니다.");
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(PROVIDER_LABEL) as OAuthProvider[]).map((provider) => (
        <button
          key={provider}
          type="button"
          disabled={!enabled || pending !== null}
          onClick={() => handleClick(provider)}
          className={`min-h-12 rounded-xl px-4 font-semibold disabled:opacity-50 ${PROVIDER_STYLE[provider]}`}
        >
          {pending === provider ? "이동 중…" : PROVIDER_LABEL[provider]}
        </button>
      ))}
      {!enabled && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          로그인 설정(Supabase 환경 변수)이 아직 없습니다. 로그인 없이 체험할 수 있어요.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
