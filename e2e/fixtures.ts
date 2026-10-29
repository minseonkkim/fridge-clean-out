import { test as base } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

/**
 * 대부분의 테스트는 냉장고 문이 열린 상태에서 재료를 다룬다. 첫 방문 인트로는 e2e/intro.spec.ts에서 따로 본다.
 * 문 여닫기 자체는 e2e/fridge-door.spec.ts가 기본 test로 따로 확인한다.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.addInitScript(() => {
      try {
        window.sessionStorage.setItem("naengteol:door", "open");
        window.sessionStorage.setItem("naengteol:intro", "seen");
      } catch {
        // 저장소를 쓸 수 없는 환경이면 문이 닫힌 채로 시작한다.
      }
    });
    await provide(page);
  },
});
