"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { hasTrialData, loadTrial } from "@/lib/trial/trial-store";

/** 이미 쓰던 사람(체험 데이터가 있거나 로그인한 사람)은 랜딩을 건너뛰고 냉장고로 보낸다. */
export function LandingRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (hasTrialData(loadTrial())) {
      router.replace("/fridge");
      return;
    }
    if (!hasSupabaseEnv()) return;
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/fridge");
      });
  }, [router]);

  return null;
}
