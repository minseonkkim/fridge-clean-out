import { describe, expect, it } from "vitest";
import { hasSupabaseEnv } from "@/lib/supabase/env";

describe("테스트 환경", () => {
  it("경로 별칭(@/)으로 모듈을 불러온다", () => {
    expect(typeof hasSupabaseEnv()).toBe("boolean");
  });
});
