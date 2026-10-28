import { expect, test } from "./fixtures";

test.describe("온보딩", () => {
  test("설정을 마치면 식단과 냉장고에 반영된다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("link", { name: /1분 설정하고 맞춤 식단 받기/ }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    // 1단계: 식사
    await page.getByRole("button", { name: "인원 늘리기" }).click();
    await expect(page.getByRole("group", { name: "가구 인원" })).toContainText("2명");
    await page.getByRole("radio", { name: "3끼" }).click();
    await page.getByRole("button", { name: "다음" }).click();

    // 2단계: 못 먹는 재료
    await page.getByRole("button", { name: "새우" }).click();
    await page.getByRole("textbox").fill("오이");
    await page.getByRole("button", { name: "+ 오이" }).click();
    await expect(page.getByRole("button", { name: "오이" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: "다음" }).click();

    // 3단계: 조리도구
    await page.getByRole("button", { name: "에어프라이어" }).click();
    await page.getByRole("button", { name: "다음" }).click();

    // 4단계: 지금 있는 재료
    await page.getByRole("button", { name: "계란" }).click();
    await page.getByRole("button", { name: "김치" }).click();
    await page.getByRole("button", { name: "2개 넣고 시작" }).click();

    await expect(page).toHaveURL(/\/fridge$/);
    await expect(page.getByText("재료 2개")).toBeVisible();
    await expect(page.getByRole("link", { name: /1분 설정/ })).toHaveCount(0);

    // 하루 3끼 설정이 식단 기본값이 된다
    await page.goto("/plan");
    await expect(page.getByRole("radio", { name: "3끼" })).toHaveAttribute("aria-checked", "true");
  });

  test("건너뛰면 다시 묻지 않는다", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: "건너뛰기" }).click();
    await expect(page).toHaveURL(/\/fridge$/);
    await expect(page.getByRole("link", { name: /1분 설정/ })).toHaveCount(0);
  });
});
