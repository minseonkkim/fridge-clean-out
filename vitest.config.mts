import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // 기본은 node. DOM이 필요한 테스트 파일만 맨 위에 `// @vitest-environment jsdom`을 쓴다.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "supabase/tests/**/*.test.ts"],
    // PGlite(WASM Postgres) 초기화가 느릴 수 있다.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
