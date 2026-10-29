import { expect, test } from "@playwright/test";

/** 첫 방문 인트로: 냉장고로 걸어가 문을 연다 (fixtures의 test는 인트로를 건너뛰므로 기본 test를 쓴다) */
test.describe("인트로", () => {
  test("처음 열면 냉장고로 다가가 문이 열리고, 끝나면 열린 냉장고가 나온다", async ({ page }) => {
    await page.goto("/fridge");
    const intro = page.getByRole("dialog", { name: "냉장고로 가는 중" });
    await expect(intro).toBeVisible();
    await expect(intro).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("[data-fridge-3d]")).toHaveAttribute("data-door", "open");

    // 같은 방문에서는 다시 나오지 않는다
    await page.reload();
    await expect(page.locator("[data-fridge-3d]")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "냉장고로 가는 중" })).toHaveCount(0);
  });

  test("건너뛰면 바로 열린 냉장고로 간다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "건너뛰기" }).click();
    await expect(page.getByRole("dialog", { name: "냉장고로 가는 중" })).toBeHidden();
    await expect(page.locator("[data-fridge-3d]")).toHaveAttribute("data-door", "open");
  });

  test("움직임 줄이기 설정이면 인트로를 보여 주지 않는다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/fridge");
    await expect(page.locator("[data-fridge-3d]")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "냉장고로 가는 중" })).toHaveCount(0);
  });
});
