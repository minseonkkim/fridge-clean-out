"use client";

import { useEffect } from "react";

/**
 * 서비스 워커를 등록한다 (프로덕션 빌드에서만).
 * 개발 서버에서는 캐시가 코드 수정을 가려서 등록하지 않는다.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // 등록 실패는 앱 사용을 막지 않는다 (오프라인 지원만 빠진다).
    });
  }, []);
  return null;
}
