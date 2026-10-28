"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteMyAccount, signOut } from "@/lib/auth/oauth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type Session = { email: string | null; nickname: string | null } | null;

export function AccountActions() {
  const router = useRouter();
  // 환경 변수가 없으면 처음부터 체험 모드(null), 있으면 세션 확인 전(undefined)
  const [session, setSession] = useState<Session | undefined>(() =>
    hasSupabaseEnv() ? undefined : null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      const meta = s?.user.user_metadata ?? {};
      setSession(
        s
          ? {
              email: s.user.email ?? null,
              nickname: (meta.nickname ?? meta.name ?? meta.full_name ?? null) as string | null,
            }
          : null,
      );
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (session === undefined)
    return <p className="text-neutral-500 dark:text-neutral-400">불러오는 중…</p>;

  if (session === null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-neutral-600 dark:text-neutral-300">
          로그인하지 않은 체험 모드입니다. 데이터는 이 기기에만 저장돼요.
        </p>
        <Link
          href="/login?next=/my"
          className="min-h-12 rounded-xl bg-neutral-900 px-4 py-3 text-center font-semibold text-white"
        >
          로그인하고 저장하기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p>
        <span className="font-semibold">{session.nickname ?? "사용자"}</span>
        {session.email && (
          <span className="ml-2 text-neutral-500 dark:text-neutral-400">{session.email}</span>
        )}
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={() => run(signOut)}
        className="min-h-12 rounded-xl px-4 ring-1 ring-neutral-300 disabled:opacity-50"
      >
        로그아웃
      </button>

      {confirmDelete ? (
        <div className="flex flex-col gap-3 rounded-xl bg-red-50 p-4">
          <p className="text-sm text-red-800">
            냉장고, 재료, 요리 기록이 모두 지워지고 되돌릴 수 없어요. 정말 탈퇴할까요?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(deleteMyAccount)}
              className="min-h-11 flex-1 rounded-lg bg-red-600 px-4 font-semibold text-white disabled:opacity-50"
            >
              탈퇴하기
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
              className="min-h-11 flex-1 rounded-lg px-4 ring-1 ring-neutral-300"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="min-h-11 self-start text-sm text-neutral-500 underline underline-offset-4 dark:text-neutral-400"
        >
          회원 탈퇴
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
