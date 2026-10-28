import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * E2E 테스트. 프로덕션 빌드를 띄우고 휴대폰 화면 크기로 돌린다.
 * Supabase 환경 변수를 비워 체험 모드(브라우저 저장소)로 동작시킨다.
 */
export default defineConfig({
  testDir: "./e2e",
  // 성능 측정은 다른 테스트와 함께 돌면 숫자가 흔들려 따로 돌린다 (npm run test:perf)
  testIgnore: "performance.spec.ts",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/fridge`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});
