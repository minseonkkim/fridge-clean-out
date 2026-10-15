"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { TRIAL_UPLOADED_EVENT, uploadTrialData } from "@/lib/trial/upload";

type Status =
  { kind: "idle" } | { kind: "done"; items: number } | { kind: "error"; message: string };

/**
 * 로그인 상태가 되면 체험 데이터를 계정으로 옮긴다.
 * 로그인 직후뿐 아니라, 지난번 실패한 업로드도 다음 방문 때 다시 시도한다.
 */
export function TrialUploader() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = getSupabaseBrowserClient();
    let running = false;

    async function run() {
      if (running) return;
      running = true;
      try {
        const result = await uploadTrialData(supabase);
        if (result) window.dispatchEvent(new Event(TRIAL_UPLOADED_EVENT));
        if (result && result.items + result.shopping > 0) {
          setStatus({ kind: "done", items: result.items });
        }
      } catch (e) {
        setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        running = false;
      }
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) void run();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (status.kind === "idle") return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 mx-auto max-w-md rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      {status.kind === "done"
        ? `체험하며 넣은 재료 ${status.items}개를 내 계정으로 옮겼어요.`
        : `${status.message} 다음에 다시 시도할게요.`}
      <button
        type="button"
        onClick={() => setStatus({ kind: "idle" })}
        className="ml-3 underline underline-offset-2"
      >
        닫기
      </button>
    </div>
  );
}
