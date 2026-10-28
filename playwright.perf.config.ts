import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** 성능 측정 전용: 다른 테스트 없이 혼자 돈다 */
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: "performance.spec.ts",
  fullyParallel: false,
  workers: 1,
});
