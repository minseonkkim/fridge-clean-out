"use client";

import { useCallback, useEffect, useState } from "react";

/** 잠깐 보였다 사라지는 알림. 3초 뒤 자동으로 닫힌다. */
export function useToast(durationMs = 3000) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs]);

  const show = useCallback((text: string) => setMessage(text), []);

  const toast = message ? (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+9rem)] z-40 mx-auto max-w-md rounded-xl bg-neutral-900 px-4 py-3 text-center text-sm text-white shadow-lg"
    >
      {message}
    </div>
  ) : null;

  return { show, toast };
}
