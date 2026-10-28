import { expect, test } from "./fixtures";

test.describe("화면 크기 대응", () => {
  test("1024px 이상에서는 냉장고 옆에 식단 플랜이 나란히 보인다", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/fridge");
    const plan = page.getByRole("complementary", { name: "식단 플랜" });
    await expect(plan).toBeVisible();
    await expect(plan.getByRole("region", { name: "요약" })).toBeVisible();

    const fridge = await page.getByRole("group", { name: "냉장고" }).boundingBox();
    const aside = await plan.boundingBox();
    expect(aside!.x).toBeGreaterThan(fridge!.x + fridge!.width);
  });

  test("휴대폰에서는 식단 칸이 숨고 냉장고가 세로 화면을 채운다", async ({ page }) => {
    await page.goto("/fridge");
    await expect(page.getByRole("complementary", { name: "식단 플랜" })).toBeHidden();
    const viewport = page.viewportSize()!;
    const fridge = await page.getByRole("group", { name: "냉장고" }).boundingBox();
    expect(fridge!.height).toBeGreaterThan(viewport.height * 0.6);
  });
});
