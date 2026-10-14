"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient | undefined;

/**
 * 브라우저에서 쓰는 Supabase 클라이언트. 한 번 만들어 재사용한다.
 * 재료 등록·수정, 장보기 목록 등 대부분의 데이터 접근은 이 클라이언트로 한다.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const { url, key } = getSupabaseEnv();
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
